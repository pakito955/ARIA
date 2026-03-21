import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id

  const [unread, tasks, waiting, integrations] = await Promise.all([
    prisma.email.count({ where: { userId, isRead: false } }),
    prisma.task.count({ where: { userId, status: { in: ['TODO', 'IN_PROGRESS'] } } }),
    prisma.email.count({
      where: {
        userId,
        isRead: false,
        receivedAt: { lte: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.integration.findMany({
      where: { userId, isActive: true },
      select: { provider: true },
    }),
  ])

  const hasGmail = integrations.some((i) => i.provider === 'GMAIL')
  const hasOutlook = integrations.some((i) => i.provider === 'OUTLOOK')

  return NextResponse.json({
    unread,
    tasks,
    waiting,
    gmail: hasGmail,
    outlook: hasOutlook,
    calendar: hasGmail || hasOutlook,
  })
}
