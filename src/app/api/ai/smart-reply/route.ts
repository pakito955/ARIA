import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/authOrToken'
import { prisma } from '@/lib/prisma'
import { complete } from '@/lib/anthropic'
import { queryKnowledge, buildKnowledgeContext } from '@/agents/knowledgeAgent'

const db = prisma as any
const HAIKU = 'claude-haiku-4-5'

interface ReplyOption {
  style: string
  content: string
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { emailId } = await req.json()
    if (!emailId) {
      return NextResponse.json({ error: 'emailId required' }, { status: 400 })
    }

    const email = await prisma.email.findFirst({
      where: { id: emailId, userId: user.id },
      select: {
        subject: true,
        bodyText: true,
        fromEmail: true,
        fromName: true,
        analysis: { select: { category: true, priority: true, summary: true } },
      },
    })

    if (!email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 })
    }

    // Retrieve relevant knowledge context
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
        const emailCtx = `${email.subject}\n${email.bodyText.substring(0, 500)}`
        const result = await queryKnowledge(emailCtx, items)
        if (result.shouldInject && result.relevantItems.length > 0) {
          knowledgeContext = buildKnowledgeContext(result.relevantItems)
          // Increment useCount
          await db.knowledgeItem.updateMany({
            where: { id: { in: result.relevantItems.map((i: any) => i.id) } },
            data: { useCount: { increment: 1 } },
          })
        }
      }
    } catch {
      // Knowledge retrieval is non-critical — continue without it
    }

    const system = `You are ARIA, an expert AI email assistant. Generate 3 reply options based on the email content.${knowledgeContext ? '\n\nUse the provided knowledge base context to ensure accurate, relevant responses.' : ''}
Return a JSON object with a "replies" array, each item having "style" and "content" fields.
The 3 styles are:
1. "short" - 2-3 sentences, direct and concise
2. "medium" - one paragraph, balanced and clear
3. "formal" - professional and polished, 2-3 paragraphs

Always return valid JSON only, no markdown.${knowledgeContext}`

    const prompt = `Email from: ${email.fromName || email.fromEmail}
Subject: ${email.subject}
${email.analysis?.summary ? `Summary: ${email.analysis.summary}` : ''}

Email content:
${email.bodyText.slice(0, 2000)}

Generate 3 reply options.`

    const { text } = await complete(system, prompt, 1200, HAIKU)

    let replies: ReplyOption[]
    try {
      const clean = text.replace(/```json\n?|\n?```/g, '').trim()
      const parsed = JSON.parse(clean)
      replies = parsed.replies
    } catch {
      // Fallback replies
      replies = [
        { style: 'short', content: 'Thank you for your email. I will review this and get back to you shortly.' },
        { style: 'medium', content: 'Thank you for reaching out. I have reviewed your message and will provide a detailed response as soon as possible.' },
        { style: 'formal', content: `Dear ${email.fromName || 'Sir/Madam'},\n\nThank you for your correspondence. I have carefully reviewed your message and will respond in full at the earliest opportunity.\n\nKind regards` },
      ]
    }

    return NextResponse.json({ replies, knowledgeUsed: !!knowledgeContext })
  } catch (err) {
    console.error('[SmartReply] Error:', err)
    return NextResponse.json({ error: 'Failed to generate replies' }, { status: 500 })
  }
}
