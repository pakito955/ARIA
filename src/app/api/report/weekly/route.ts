import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { startOfWeek, endOfWeek, format, subDays } from 'date-fns'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 })

  const [emails, tasks, analyses, completedTasks, criticalEmails] = await Promise.all([
    prisma.email.count({ where: { userId, receivedAt: { gte: weekStart, lte: weekEnd } } }),
    prisma.task.findMany({
      where: { userId, createdAt: { gte: weekStart, lte: weekEnd } },
      select: { title: true, priority: true, status: true, dueDate: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.aIAnalysis.count({ where: { userId, createdAt: { gte: weekStart } } }),
    prisma.task.count({ where: { userId, status: 'DONE', updatedAt: { gte: weekStart } } }),
    prisma.email.count({
      where: {
        userId,
        receivedAt: { gte: weekStart, lte: weekEnd },
        analysis: { priority: { in: ['CRITICAL', 'HIGH'] } },
      },
    }),
  ])

  const topSenders = await prisma.email.groupBy({
    by: ['fromEmail', 'fromName'],
    where: { userId, receivedAt: { gte: weekStart, lte: weekEnd } },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 5,
  })

  return NextResponse.json({
    period: {
      start: format(weekStart, 'MMMM d'),
      end: format(weekEnd, 'MMMM d, yyyy'),
    },
    stats: {
      totalEmails: emails,
      criticalEmails,
      analyses,
      tasksCreated: tasks.length,
      tasksCompleted: completedTasks,
      timeSaved: Math.round((analyses * 2) / 60 * 10) / 10,
    },
    tasks,
    topSenders: topSenders.map((s) => ({
      email: s.fromEmail,
      name: s.fromName,
      count: s._count.id,
    })),
  })
}
