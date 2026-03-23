import { completeJSON } from '@/lib/anthropic'

export interface CalendarSlot {
  startTime: string  // ISO string
  endTime: string    // ISO string
  label: string      // e.g. "Tomorrow morning 9:00–10:00"
  reasoning: string
}

export interface SchedulingSuggestion {
  suggestedSlots: CalendarSlot[]
  estimatedMinutes: number
  priority: string
  bestSlot: CalendarSlot | null
}

export interface ExistingEvent {
  startTime: string
  endTime: string
  title: string
}

const SYSTEM_PROMPT = `You are ARIA, an intelligent scheduling assistant. Given a task description, its priority, and the user's existing calendar events for the next 7 days, suggest 3 optimal time slots to complete the task. Consider:
- Work hours (9am-6pm unless context suggests otherwise)
- Buffer time between meetings
- Task complexity vs available duration
- Priority alignment (critical tasks → earliest available slot)
- Return ONLY valid JSON, no other text.`

/**
 * Suggest calendar slots for a given task based on existing calendar events.
 */
export async function suggestTaskSchedule(
  task: {
    title: string
    description?: string | null
    priority: string
    dueDate?: Date | null
  },
  existingEvents: ExistingEvent[],
  timezone = 'Europe/Sarajevo'
): Promise<SchedulingSuggestion> {
  const now = new Date()
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const eventList = existingEvents
    .filter(e => new Date(e.startTime) >= now && new Date(e.startTime) <= nextWeek)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 20)
    .map(e => `- ${new Date(e.startTime).toLocaleString()} → ${new Date(e.endTime).toLocaleString()}: ${e.title}`)
    .join('\n')

  const schema = `{
  "estimatedMinutes": 60,
  "suggestedSlots": [
    {
      "startTime": "ISO datetime",
      "endTime": "ISO datetime",
      "label": "Tomorrow 9:00–10:00",
      "reasoning": "No conflicts, morning focus time"
    }
  ],
  "bestSlot": { "startTime": "ISO", "endTime": "ISO", "label": "...", "reasoning": "..." }
}`

  const dueDateStr = task.dueDate
    ? `\nDue date: ${task.dueDate.toLocaleDateString()}`
    : ''

  const fallback: SchedulingSuggestion = {
    estimatedMinutes: 60,
    suggestedSlots: [],
    priority: task.priority,
    bestSlot: null,
  }

  const result = await completeJSON<SchedulingSuggestion>(
    SYSTEM_PROMPT,
    `Task: "${task.title}"${task.description ? `\nDescription: ${task.description}` : ''}
Priority: ${task.priority}${dueDateStr}
Current time: ${now.toLocaleString()} (${timezone})
Existing calendar (next 7 days):
${eventList || '(no events)'}

Suggest 3 time slots. Return JSON:\n${schema}`,
    600,
    fallback
  )

  return {
    ...fallback,
    ...result,
    priority: task.priority,
  }
}
