/**
 * ARIA AI Assistant Context Builder
 * Aggregates live data (calendar, emails, tasks) into a structured context
 * for injection into AI assistant prompts.
 * Named exports only — no default export.
 */

import type { PrismaClient } from '@prisma/client'

export interface CalendarEventSummary {
  id: string
  title: string
  startTime: Date
  endTime: Date | null
  location: string | null
}

export interface EmailSummary {
  id: string
  subject: string
  fromName: string | null
  fromEmail: string
  receivedAt: Date
  priority: string | null
  summary: string | null
}

export interface TaskSummary {
  id: string
  title: string
  priority: string
  dueDate: Date | null
}

export interface AssistantContext {
  nextEvents: CalendarEventSummary[]
  urgentEmails: EmailSummary[]
  pendingTasksCount: number
  topTasks: TaskSummary[]
  waitingForReply: EmailSummary[]
}

/**
 * Fetches and structures live data for the AI assistant system prompt.
 * All queries run in parallel for minimum latency.
 */
export async function buildAssistantContext(
  userId: string,
  prisma: PrismaClient
): Promise<AssistantContext> {
  const now = new Date()
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)

  const [nextEvents, urgentEmails, pendingTasksCount, topTasks, waitingEmails] = await Promise.all([
    // Next 3 upcoming calendar events
    (prisma as any).calendarEvent
      .findMany({
        where: {
          userId,
          startTime: { gte: now },
        },
        orderBy: { startTime: 'asc' },
        take: 3,
        select: {
          id: true,
          title: true,
          startTime: true,
          endTime: true,
          location: true,
        },
      })
      .catch(() => []),

    // Top 5 unread/critical emails
    (prisma as any).email
      .findMany({
        where: {
          userId,
          isRead: false,
        },
        include: {
          analysis: {
            select: { priority: true, summary: true },
          },
        },
        orderBy: [{ receivedAt: 'desc' }],
        take: 10, // fetch more, then sort in memory by priority
      })
      .then((emails: any[]) =>
        emails
          .sort((a, b) => {
            const order: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
            return (order[a.analysis?.priority ?? 'LOW'] ?? 3) - (order[b.analysis?.priority ?? 'LOW'] ?? 3)
          })
          .slice(0, 5)
          .map((e: any) => ({
            id: e.id,
            subject: e.subject,
            fromName: e.fromName,
            fromEmail: e.fromEmail,
            receivedAt: e.receivedAt,
            priority: e.analysis?.priority ?? null,
            summary: e.analysis?.summary ?? null,
          }))
      )
      .catch(() => []),

    // Count of pending tasks
    (prisma as any).task
      .count({
        where: { userId, status: { in: ['TODO', 'IN_PROGRESS'] } },
      })
      .catch(() => 0),

    // Top 3 tasks
    (prisma as any).task
      .findMany({
        where: { userId, status: { in: ['TODO', 'IN_PROGRESS'] } },
        orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
        take: 3,
        select: { id: true, title: true, priority: true, dueDate: true },
      })
      .catch(() => []),

    // Emails waiting for reply older than 2 days
    (prisma as any).email
      .findMany({
        where: {
          userId,
          isRead: false,
          receivedAt: { lte: twoDaysAgo },
        },
        orderBy: { receivedAt: 'asc' },
        take: 5,
        select: {
          id: true,
          subject: true,
          fromName: true,
          fromEmail: true,
          receivedAt: true,
        },
      })
      .then((emails: any[]) =>
        emails.map((e: any) => ({
          ...e,
          priority: null,
          summary: null,
        }))
      )
      .catch(() => []),
  ])

  return {
    nextEvents,
    urgentEmails,
    pendingTasksCount,
    topTasks,
    waitingForReply: waitingEmails,
  }
}

/**
 * Formats AssistantContext into a readable system prompt string.
 */
export function formatContextForPrompt(ctx: AssistantContext): string {
  const lines: string[] = ['## Live Context (as of now)']

  if (ctx.nextEvents.length > 0) {
    lines.push('\n### Upcoming Calendar Events')
    ctx.nextEvents.forEach((ev) => {
      const time = new Date(ev.startTime).toLocaleString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
      lines.push(`- ${ev.title} @ ${time}${ev.location ? ` (${ev.location})` : ''}`)
    })
  } else {
    lines.push('\n### Upcoming Calendar Events\n- No upcoming events')
  }

  if (ctx.urgentEmails.length > 0) {
    lines.push('\n### Unread/Urgent Emails')
    ctx.urgentEmails.forEach((em) => {
      const badge = em.priority && em.priority !== 'LOW' ? ` [${em.priority}]` : ''
      lines.push(`- From: ${em.fromName || em.fromEmail} — "${em.subject}"${badge}`)
    })
  } else {
    lines.push('\n### Unread/Urgent Emails\n- Inbox is clear')
  }

  lines.push(`\n### Tasks\n- ${ctx.pendingTasksCount} pending task(s)`)
  if (ctx.topTasks.length > 0) {
    ctx.topTasks.forEach((t) => {
      const due = t.dueDate ? ` (due ${new Date(t.dueDate).toLocaleDateString()})` : ''
      lines.push(`  - ${t.title}${due}`)
    })
  }

  if (ctx.waitingForReply.length > 0) {
    lines.push('\n### Emails Awaiting Reply (>2 days old)')
    ctx.waitingForReply.forEach((em) => {
      const age = Math.floor((Date.now() - new Date(em.receivedAt).getTime()) / (24 * 60 * 60 * 1000))
      lines.push(`- "${em.subject}" from ${em.fromName || em.fromEmail} (${age}d ago)`)
    })
  } else {
    lines.push('\n### Emails Awaiting Reply\n- None')
  }

  return lines.join('\n')
}
