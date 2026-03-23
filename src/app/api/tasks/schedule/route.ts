import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/authOrToken'
import { prisma } from '@/lib/prisma'
import { suggestTaskSchedule } from '@/agents/schedulingAgent'

const db = prisma as any

// POST /api/tasks/schedule
// Body: { taskId: string, confirm?: boolean, slotIndex?: number }
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { taskId, confirm = false, slotIndex = 0 } = await req.json()
  if (!taskId) return NextResponse.json({ error: 'taskId required' }, { status: 400 })

  const task = await db.task.findFirst({ where: { id: taskId, userId: user.id } })
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

  // Fetch upcoming calendar events
  const events = await db.calendarEvent.findMany({
    where: {
      userId: user.id,
      startTime: { gte: new Date() },
    },
    orderBy: { startTime: 'asc' },
    take: 30,
  })

  const settings = await db.userSettings.findUnique({ where: { userId: user.id } })
  const timezone = settings?.timezone || 'Europe/Sarajevo'

  const suggestion = await suggestTaskSchedule(
    {
      title: task.title,
      description: task.description,
      priority: task.priority,
      dueDate: task.dueDate,
    },
    events.map((e: any) => ({
      startTime: e.startTime.toISOString(),
      endTime: e.endTime.toISOString(),
      title: e.title,
    })),
    timezone
  )

  // If confirm=true, create the calendar event
  if (confirm && suggestion.bestSlot) {
    const slot = suggestion.suggestedSlots[slotIndex] || suggestion.bestSlot
    const event = await db.calendarEvent.create({
      data: {
        userId: user.id,
        title: `[ARIA] ${task.title}`,
        description: `Auto-scheduled by ARIA\n\n${task.description || ''}`,
        startTime: new Date(slot.startTime),
        endTime: new Date(slot.endTime),
        ariaCreated: true,
      },
    })

    // Update task with a due date if not set
    if (!task.dueDate) {
      await db.task.update({
        where: { id: taskId },
        data: { dueDate: new Date(slot.startTime) },
      })
    }

    return NextResponse.json({ suggestion, event, confirmed: true })
  }

  return NextResponse.json({ suggestion, confirmed: false })
}
