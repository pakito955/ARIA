import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encryption'
import { GmailProvider } from '@/lib/providers/gmail'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const eventTitle = searchParams.get('title') || ''
  const participants = searchParams.get('participants')?.split(',').filter(Boolean) || []

  const userId = session.user.id

  // Find emails from/to participants in last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const relevantEmails = await prisma.email.findMany({
    where: {
      userId,
      receivedAt: { gte: thirtyDaysAgo },
      OR: participants.flatMap((p) => [
        { fromEmail: { contains: p } },
        { toEmails: { contains: p } },
      ]),
    },
    include: { analysis: true },
    orderBy: { receivedAt: 'desc' },
    take: 10,
  })

  if (relevantEmails.length === 0) {
    return NextResponse.json({
      data: {
        brief: `No previous communication found with participants. Going in fresh — prepare by reviewing the meeting title: "${eventTitle}".`,
        emails: [],
      }
    })
  }

  const emailSummaries = relevantEmails.map((e) => ({
    from: e.fromName || e.fromEmail,
    subject: e.subject,
    summary: e.analysis?.summary || e.bodyText.slice(0, 200),
    date: e.receivedAt,
    priority: e.analysis?.priority,
  }))

  const prompt = `You are ARIA, an AI executive assistant. Prepare a concise meeting brief for "${eventTitle}".

Participants: ${participants.join(', ')}
Recent email history (last 30 days):
${emailSummaries.map((e, i) => `${i + 1}. From: ${e.from} | Subject: ${e.subject} | Summary: ${e.summary}`).join('\n')}

Write a 3-5 sentence meeting prep brief covering:
- What was last discussed with these people
- Any open items or pending responses
- Key points to address in this meeting
- Tone/relationship context

Be concise and actionable.`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }],
  })

  const brief = (response.content[0] as any).text

  return NextResponse.json({
    data: { brief, emails: emailSummaries.slice(0, 3) }
  })
}
