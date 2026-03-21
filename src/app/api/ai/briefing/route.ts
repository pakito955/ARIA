import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateBriefing } from '@/agents/briefingAgent'
import { format, startOfDay } from 'date-fns'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = startOfDay(new Date())

  // Check cached briefing
  const cached = await prisma.briefing.findUnique({
    where: {
      userId_date: { userId: session.user.id, date: today },
    },
  })

  if (cached) {
    return NextResponse.json({ data: cached, cached: true })
  }

  return NextResponse.json({ data: null, cached: false })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id
  const today = startOfDay(new Date())

  // Gather data
  const [emails, tasks, waitingCount] = await Promise.all([
    prisma.email.findMany({
      where: { userId, receivedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      include: { analysis: true },
      orderBy: { receivedAt: 'desc' },
      take: 20,
    }),
    prisma.task.findMany({
      where: { userId, status: { in: ['TODO', 'IN_PROGRESS'] } },
      orderBy: { dueDate: 'asc' },
      take: 10,
    }),
    prisma.email.count({
      where: {
        userId,
        isRead: false,
        receivedAt: { lte: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
      },
    }),
  ])

  const content = await generateBriefing({
    emails: emails.map((e) => ({
      sender: e.fromName || e.fromEmail,
      subject: e.subject,
      category: e.analysis?.category || 'INFO',
      priority: e.analysis?.priority || 'MEDIUM',
    })),
    todayEvents: [],
    pendingTasks: tasks.map((t) => ({
      id: t.id,
      userId: t.userId,
      title: t.title,
      priority: t.priority as any,
      status: t.status as any,
      source: t.source as any,
      createdAt: t.createdAt,
      dueDate: t.dueDate ?? undefined,
    })),
    waitingReplies: waitingCount,
  })

  const briefing = await prisma.briefing.upsert({
    where: { userId_date: { userId, date: today } },
    create: {
      userId,
      date: today,
      content,
      emailCount: emails.length,
      criticalCount: emails.filter((e) => e.analysis?.priority === 'CRITICAL').length,
      tasksCount: tasks.length,
      waitingCount,
    },
    update: { content },
  })

  return NextResponse.json({ data: briefing })
}
