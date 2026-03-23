import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/authOrToken'
import { prisma } from '@/lib/prisma'
import { decrypt, encrypt } from '@/lib/encryption'
import { GmailProvider } from '@/lib/providers/gmail'
import { generateBriefing } from '@/agents/briefingAgent'
import { startOfDay, endOfDay } from 'date-fns'
import type { CalendarEvent, Priority, TaskStatus } from '@/types'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = startOfDay(new Date())
  const cached = await prisma.briefing.findUnique({
    where: { userId_date: { userId: user.id, date: today } },
  })

  return NextResponse.json({ data: cached ?? null, cached: !!cached })
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = user.id
  const now = new Date()
  const today = startOfDay(now)
  const todayEnd = endOfDay(now)

  // Gather all data in parallel
  const [emails, tasks, waitingCount, calendarEvents] = await Promise.all([
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
    fetchTodayCalendarEvents(userId, today, todayEnd),
  ])

  const content = await generateBriefing({
    emails: emails.map((e) => ({
      sender: e.fromName || e.fromEmail,
      subject: e.subject,
      category: e.analysis?.category || 'INFO',
      priority: (e.analysis?.priority || 'MEDIUM') as Priority,
    })),
    todayEvents: calendarEvents,
    pendingTasks: tasks.map((t) => ({
      id: t.id,
      userId: t.userId,
      title: t.title,
      priority: t.priority as Priority,
      status: t.status as TaskStatus,
      source: t.source as 'AI_GENERATED' | 'MANUAL' | 'EMAIL_RULE',
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

// ── Helper: fetch today's calendar events (live or cached) ─────────────────

async function fetchTodayCalendarEvents(
  userId: string,
  from: Date,
  to: Date
): Promise<CalendarEvent[]> {
  // Always try live first
  const integration = await prisma.integration.findFirst({
    where: { userId, provider: 'GMAIL', isActive: true },
  })

  if (integration) {
    try {
      const gmail = new GmailProvider(
        decrypt(integration.accessToken),
        integration.refreshToken ? decrypt(integration.refreshToken) : undefined,
        async (newToken) => {
          await prisma.integration.update({
            where: { id: integration.id },
            data: { accessToken: encrypt(newToken) },
          })
        }
      )
      return await gmail.getCalendarEvents(from, to)
    } catch {
      // fall through to cached
    }
  }

  // Fall back to DB-cached events
  const cached = await prisma.calendarEvent.findMany({
    where: { userId, startTime: { gte: from }, endTime: { lte: to } },
    orderBy: { startTime: 'asc' },
  })

  return cached.map((ev) => ({
    id: ev.id,
    externalId: ev.externalId ?? undefined,
    title: ev.title,
    description: ev.description ?? undefined,
    startTime: ev.startTime,
    endTime: ev.endTime,
    location: ev.location ?? undefined,
    meetingUrl: ev.meetingUrl ?? undefined,
    participants: (() => {
      try { return JSON.parse(ev.participants) } catch { return [] }
    })(),
  }))
}
