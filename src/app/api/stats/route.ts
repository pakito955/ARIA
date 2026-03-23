import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/authOrToken'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = user.id

  try {
  const db = prisma as any
  const [unread, critical, tasks, waiting, integrations, drafts] = await Promise.all([
    prisma.email.count({ where: { userId, isRead: false } }),
    prisma.email.count({
      where: {
        userId,
        isRead: false,
        analysis: { is: { priority: 'CRITICAL' } },
      },
    }),
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
    db.draftEmail.count({ where: { userId, status: 'PENDING' } }),
  ])

  const hasGmail = integrations.some((i) => i.provider === 'GMAIL')
  const hasOutlook = integrations.some((i) => i.provider === 'OUTLOOK')

  return NextResponse.json(
    { unread, critical, tasks, waiting, drafts, gmail: hasGmail, outlook: hasOutlook, calendar: hasGmail || hasOutlook },
    { headers: { 'Cache-Control': 'private, max-age=15' } }
  )
  } catch {
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
