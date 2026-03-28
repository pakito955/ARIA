import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/authOrToken'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const email = await prisma.email.findFirst({
    where: { id, userId: user.id },
    select: { threadId: true, subject: true },
  })

  if (!email) {
    return NextResponse.json({ error: 'Email not found' }, { status: 404 })
  }

  // Find all emails in the same thread
  const threadEmails = email.threadId
    ? await prisma.email.findMany({
        where: {
          userId: user.id,
          threadId: email.threadId,
        },
        include: {
          analysis: {
            select: { summary: true, priority: true },
          },
        },
        orderBy: { receivedAt: 'asc' },
      })
    : // No threadId — return just this email
      await prisma.email.findMany({
        where: { id, userId: user.id },
        include: {
          analysis: {
            select: { summary: true, priority: true },
          },
        },
      })

  const messages = threadEmails.map((msg) => ({
    id: msg.id,
    fromEmail: msg.fromEmail,
    fromName: msg.fromName || msg.fromEmail.split('@')[0],
    toEmails: msg.toEmails,
    subject: msg.subject,
    bodyText: msg.bodyText,
    bodyHtml: msg.bodyHtml,
    receivedAt: msg.receivedAt,
    isRead: msg.isRead,
    folder: (msg as any).folder || 'INBOX',
    summary: msg.analysis?.summary || null,
  }))

  return NextResponse.json(
    { messages, count: messages.length },
    {
      headers: {
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
      },
    }
  )
}
