import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/authOrToken'
import { prisma } from '@/lib/prisma'
import { complete } from '@/lib/anthropic'

const db = prisma as any
const HAIKU = 'claude-haiku-4-5-20251001'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const contactEmail = searchParams.get('email')
  if (!contactEmail) return NextResponse.json({ error: 'email required' }, { status: 400 })

  // Check cached note
  const existing = await db.contactNote.findUnique({
    where: { userId_email: { userId: user.id, email: contactEmail } },
  })

  if (existing?.aiSummary) {
    return NextResponse.json({ summary: existing.aiSummary, cached: true })
  }

  // Gather data
  const emails = await prisma.email.findMany({
    where: { userId: user.id, fromEmail: contactEmail },
    orderBy: { receivedAt: 'desc' },
    take: 15,
    select: {
      subject: true,
      bodyText: true,
      receivedAt: true,
      analysis: { select: { category: true, priority: true, sentiment: true, intent: true } },
    },
  })

  if (emails.length === 0) {
    return NextResponse.json({ summary: null, cached: false })
  }

  const emailSummaries = emails.map(e => {
    const a = e.analysis
    return `- [${new Date(e.receivedAt).toLocaleDateString()}] "${e.subject}"${a ? ` (${a.category}, ${a.sentiment}, intent: ${a.intent})` : ''}`
  }).join('\n')

  const domain = contactEmail.split('@')[1] || ''
  const name = emails[0] ? '' : contactEmail

  const { text } = await complete(
    `You are ARIA. Generate a concise relationship summary for a contact based on their email history. Be specific and actionable. Max 3 sentences.`,
    `Contact: ${contactEmail}
Domain: ${domain}
Recent email history (${emails.length} emails):
${emailSummaries}

Write a relationship summary covering: what they typically reach out about, communication pattern, and any notable patterns.`,
    200,
    HAIKU
  )

  const summary = text.trim()

  // Cache it
  await db.contactNote.upsert({
    where: { userId_email: { userId: user.id, email: contactEmail } },
    create: { userId: user.id, email: contactEmail, note: '', aiSummary: summary },
    update: { aiSummary: summary },
  })

  return NextResponse.json({ summary, cached: false })
}
