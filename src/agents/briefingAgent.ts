import { complete } from '@/lib/anthropic'
import { format } from 'date-fns'
import type { BriefingInput } from '@/types'

const SYSTEM = `You are ARIA. You generate a morning operational briefing for an executive.

RULES:
- Write in first person (ARIA speaks to the user)
- Use English
- Format with HTML tags: <b> for emphasis, <br> for new lines
- Max 5-6 sentences, focused on actions
- Start with the most urgent item
- End with one motivational note`

export async function generateBriefing(input: BriefingInput): Promise<string> {
  const today = format(new Date(), 'EEEE, d. MMMM yyyy')

  const emailSummary = input.emails
    .map((e) => `• ${e.sender}: "${e.subject}" [${e.priority}]`)
    .join('\n')

  const calendarSummary = input.todayEvents
    .map((e) => `• ${format(e.startTime, 'HH:mm')} — ${e.title}`)
    .join('\n')

  const taskSummary = input.pendingTasks
    .slice(0, 5)
    .map((t) => `• ${t.title}${t.dueDate ? ` (due: ${format(t.dueDate, 'd.M.')})` : ''}`)
    .join('\n')

  const userMessage = `Date: ${today}

EMAILS (${input.emails.length} new):
${emailSummary || 'No new emails'}

TODAY'S CALENDAR:
${calendarSummary || 'No events today'}

OPEN TASKS (${input.pendingTasks.length}):
${taskSummary || 'No tasks'}

AWAITING REPLY: ${input.waitingReplies} emails

Generate the morning briefing.`

  const { text } = await complete(SYSTEM, userMessage, 500)
  return text.trim()
}
