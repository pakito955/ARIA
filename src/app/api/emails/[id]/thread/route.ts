import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id
  const { id } = await params

  const email = await prisma.email.findFirst({
    where: { id, userId },
    select: { threadId: true },
  })

  if (!email?.threadId) {
    return NextResponse.json({ data: [] })
  }

  const thread = await prisma.email.findMany({
    where: { userId, threadId: email.threadId },
    orderBy: { receivedAt: 'asc' },
    select: {
      id: true,
      subject: true,
      bodyText: true,
      fromEmail: true,
      fromName: true,
      receivedAt: true,
      isRead: true,
      analysis: { select: { summary: true, category: true, priority: true } },
    },
  })

  return NextResponse.json({ data: thread })
}
