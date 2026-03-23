// GET /api/briefing/daily
// Returns a rich daily briefing with agenda, meeting prep, contact notes, pending drafts
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/authOrToken'
import { prisma } from '@/lib/prisma'
import { generateBriefing } from '@/agents/briefingAgent'
import { generateMeetingPrep } from '@/agents/webhookDraftAgent'
import { queryKnowledge } from '@/agents/knowledgeAgent'
import type { DailyBriefingData, AgendaItem } from '@/types'

const db = prisma as any

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(now)
  todayEnd.setHours(23, 59, 59, 999)

  // Fetch all data in parallel
  const [todayEvents, pendingTasks, recentEmails, contactNotes, knowledgeItems, pendingDrafts] = await Promise.all([
    db.calendarEvent.findMany({
      where: { userId: user.id, startTime: { gte: todayStart, lte: todayEnd } },
      orderBy: { startTime: 'asc' },
    }),
    db.task.findMany({
      where: { userId: user.id, status: { not: 'DONE' } },
      orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
      take: 10,
    }),
    db.email.findMany({
      where: { userId: user.id, isRead: false, receivedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      include: { analysis: { select: { priority: true, category: true, summary: true } } },
      orderBy: { receivedAt: 'desc' },
      take: 10,
    }),
    db.contactNote.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    }),
    db.knowledgeItem.findMany({
      where: { userId: user.id },
      orderBy: { useCount: 'desc' },
      take: 20,
    }),
    db.draftEmail.count({ where: { userId: user.id, status: 'PENDING' } }),
  ])

  // Build briefing text input
  const criticalEmails = recentEmails
    .filter((e: any) => e.analysis?.priority === 'CRITICAL' || e.analysis?.priority === 'HIGH')
    .map((e: any) => ({
      subject: e.subject,
      from: e.fromName || e.fromEmail,
      priority: e.analysis?.priority || 'MEDIUM',
    }))

  const briefingText = await generateBriefing({
    emails: recentEmails.map((e: any) => ({
      sender: e.fromName || e.fromEmail,
      subject: e.subject,
      category: e.analysis?.category || 'INFO',
      priority: e.analysis?.priority || 'MEDIUM',
    })),
    todayEvents: todayEvents.map((e: any) => ({
      ...e,
      participants: JSON.parse(e.participants || '[]'),
    })),
    pendingTasks: pendingTasks.map((t: any) => ({
      ...t,
      priority: t.priority as any,
      status: t.status as any,
      source: t.source as any,
    })),
    waitingReplies: pendingDrafts,
  })

  // Build agenda items with meeting prep
  const knowledgeChunks = knowledgeItems.map((k: any) => ({
    id: k.id,
    title: k.title,
    content: k.content,
    tags: JSON.parse(k.tags || '[]'),
  }))

  const agenda: AgendaItem[] = await Promise.all(
    todayEvents.map(async (event: any) => {
      const participants: string[] = JSON.parse(event.participants || '[]')

      // Find contact notes for participants
      const participantNotes = contactNotes
        .filter((n: any) => participants.some((p: string) => p.includes(n.email.split('@')[0])))
        .map((n: any) => `${n.email}: ${n.aiSummary || n.note}`)

      // Get relevant knowledge for this meeting
      const eventCtx = `${event.title} ${event.description || ''} ${participants.join(' ')}`
      const { relevantItems } = await queryKnowledge(eventCtx, knowledgeChunks).catch(() => ({ relevantItems: [] }))

      let prepNotes: string | undefined
      if (participants.length > 0 || event.description) {
        prepNotes = await generateMeetingPrep(
          { title: event.title, startTime: event.startTime, participants, description: event.description },
          participantNotes,
          relevantItems
        ).catch(() => undefined)
      }

      return {
        id: event.id,
        title: event.title,
        startTime: event.startTime.toISOString(),
        endTime: event.endTime.toISOString(),
        participants,
        location: event.location || undefined,
        meetingUrl: event.meetingUrl || undefined,
        prepNotes,
      }
    })
  )

  // Knowledge summary (top 3 most-used items as context reminder)
  const knowledgeSummary = knowledgeItems
    .slice(0, 3)
    .map((k: any) => `${k.title}: ${k.content.substring(0, 100)}…`)
    .join(' · ')

  const data: DailyBriefingData = {
    date: now.toISOString(),
    briefingText,
    agenda,
    criticalEmails,
    pendingTasks: pendingTasks.map((t: any) => ({
      title: t.title,
      priority: t.priority,
      dueDate: t.dueDate?.toISOString(),
    })),
    pendingDrafts,
    contactNotes: contactNotes.slice(0, 6).map((n: any) => ({
      email: n.email,
      note: n.note,
      aiSummary: n.aiSummary || undefined,
    })),
    knowledgeSummary,
  }

  return NextResponse.json(data)
}
