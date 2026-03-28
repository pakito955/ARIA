import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/authOrToken'
import { prisma } from '@/lib/prisma'
import { completeJSON } from '@/lib/anthropic'
import { queryKnowledge, buildKnowledgeContext } from '@/agents/knowledgeAgent'

const db = prisma as any
const HAIKU = 'claude-haiku-4-5-20251001'

interface MeetingInfo {
  date: string | null
  participants: string[]
  agenda: string
  actionItems: string[]
}

interface SummaryResult {
  tldr: string
  keyPoints: string[]
  decisions: string[]
  nextSteps: string[]
  meetingInfo: MeetingInfo | null
}

const FALLBACK_SUMMARY: SummaryResult = {
  tldr: 'Unable to generate summary.',
  keyPoints: [],
  decisions: [],
  nextSteps: [],
  meetingInfo: null,
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { emailId, threadId } = body as { emailId?: string; threadId?: string }

    if (!emailId && !threadId) {
      return NextResponse.json(
        { error: 'emailId or threadId is required' },
        { status: 400 }
      )
    }

    // ── Fetch emails ──────────────────────────────────────────────────────────

    let emails: Array<{
      id: string
      fromEmail: string
      fromName: string | null
      subject: string
      bodyText: string
      receivedAt: Date
      threadId: string | null
    }> = []

    if (emailId) {
      // Fetch the seed email first
      const seedEmail = await prisma.email.findFirst({
        where: { id: emailId, userId: user.id },
        select: {
          id: true,
          fromEmail: true,
          fromName: true,
          subject: true,
          bodyText: true,
          receivedAt: true,
          threadId: true,
        },
      })

      if (!seedEmail) {
        return NextResponse.json({ error: 'Email not found' }, { status: 404 })
      }

      // If it belongs to a thread, fetch all emails in that thread
      if (seedEmail.threadId) {
        emails = await prisma.email.findMany({
          where: { threadId: seedEmail.threadId, userId: user.id },
          select: {
            id: true,
            fromEmail: true,
            fromName: true,
            subject: true,
            bodyText: true,
            receivedAt: true,
            threadId: true,
          },
          orderBy: { receivedAt: 'asc' },
        })
      } else {
        emails = [seedEmail]
      }
    } else if (threadId) {
      emails = await prisma.email.findMany({
        where: { threadId, userId: user.id },
        select: {
          id: true,
          fromEmail: true,
          fromName: true,
          subject: true,
          bodyText: true,
          receivedAt: true,
          threadId: true,
        },
        orderBy: { receivedAt: 'asc' },
      })

      if (emails.length === 0) {
        return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
      }
    }

    // ── Build combined thread text ─────────────────────────────────────────────

    const threadText = emails
      .map((e, i) => {
        const sender = e.fromName ? `${e.fromName} <${e.fromEmail}>` : e.fromEmail
        const body = e.bodyText.slice(0, 1200)
        return `[Message ${i + 1}]\nFrom: ${sender}\nSubject: ${e.subject}\n\n${body}`
      })
      .join('\n\n---\n\n')

    // ── Fetch relevant knowledge base context ──────────────────────────────────

    let knowledgeContext = ''
    try {
      const rawItems = await db.knowledgeItem.findMany({
        where: { userId: user.id },
        orderBy: { useCount: 'desc' },
        take: 30,
      })
      if (rawItems.length > 0) {
        const items = rawItems.map((item: any) => ({
          id: item.id,
          title: item.title,
          content: item.content,
          tags: JSON.parse(item.tags || '[]'),
        }))
        const ctx = `${emails[0]?.subject ?? ''}\n${threadText.substring(0, 600)}`
        const result = await queryKnowledge(ctx, items)
        if (result.shouldInject && result.relevantItems.length > 0) {
          knowledgeContext = buildKnowledgeContext(result.relevantItems)
          await db.knowledgeItem.updateMany({
            where: { id: { in: result.relevantItems.map((i: any) => i.id) } },
            data: { useCount: { increment: 1 } },
          })
        }
      }
    } catch {
      // Non-critical — continue without KB context
    }

    // ── Build prompt ───────────────────────────────────────────────────────────

    const systemPrompt = `You are ARIA, an AI executive assistant. Analyze email threads and produce concise, structured summaries.${knowledgeContext ? '\n\nKnowledge Base Context:\n' + knowledgeContext : ''}

Return ONLY valid JSON with this exact shape:
{
  "tldr": "2-3 sentence summary of the entire thread",
  "keyPoints": ["key point 1", "key point 2", "key point 3"],
  "decisions": ["decision that was made"],
  "nextSteps": ["action item 1", "action item 2"],
  "meetingInfo": null
}

For meetingInfo: only populate it (non-null) when the thread is clearly about scheduling or confirming a meeting. When populated use this shape:
{
  "date": "ISO 8601 string or null if unclear",
  "participants": ["email@example.com"],
  "agenda": "what the meeting is about",
  "actionItems": ["item 1"]
}

Rules:
- keyPoints: 2–5 concise bullet strings, no bullet characters
- decisions: empty array if none were made
- nextSteps: empty array if none implied
- meetingInfo: null unless the thread explicitly discusses scheduling a meeting
- Return ONLY the JSON — no markdown, no explanation`

    const userMessage = `Summarize this email thread (${emails.length} message${emails.length !== 1 ? 's' : ''}):\n\n${threadText}`

    const summary = await completeJSON<SummaryResult>(
      systemPrompt,
      userMessage,
      1200,
      FALLBACK_SUMMARY
    )

    // Normalise — guard against Claude returning wrong shapes
    const safeResult: SummaryResult = {
      tldr: typeof summary.tldr === 'string' ? summary.tldr : FALLBACK_SUMMARY.tldr,
      keyPoints: Array.isArray(summary.keyPoints) ? summary.keyPoints : [],
      decisions: Array.isArray(summary.decisions) ? summary.decisions : [],
      nextSteps: Array.isArray(summary.nextSteps) ? summary.nextSteps : [],
      meetingInfo: summary.meetingInfo ?? null,
    }

    return NextResponse.json({ summary: safeResult, emailCount: emails.length })
  } catch (err) {
    console.error('[ARIA] /api/ai/summarize error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
