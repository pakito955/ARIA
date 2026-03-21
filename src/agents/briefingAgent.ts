import { complete } from '@/lib/anthropic'
import { format } from 'date-fns'
import type { BriefingInput } from '@/types'

const SYSTEM = `Ti si ARIA. Generišeš jutarnji operativni briefing za izvršnog direktora.

PRAVILA:
- Pišeš u prvom licu (ARIA govori korisniku)
- Koristiš bosanski/srpski jezik
- Formatiraš sa HTML tagovima: <b> za naglašeno, <br> za novi red
- Max 5-6 rečenica, fokus na akcije
- Počni sa najhitnijim
- Završi sa jednim motivacionim akcentom`

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
    .map((t) => `• ${t.title}${t.dueDate ? ` (rok: ${format(t.dueDate, 'd.M.')})` : ''}`)
    .join('\n')

  const userMessage = `Datum: ${today}

EMAILOVI (${input.emails.length} novih):
${emailSummary || 'Nema novih emailova'}

DANAŠNJI KALENDAR:
${calendarSummary || 'Nema događaja danas'}

OTVORENI ZADACI (${input.pendingTasks.length}):
${taskSummary || 'Nema zadataka'}

ČEKA ODGOVOR: ${input.waitingReplies} emailova

Generiši jutarnji briefing.`

  const { text } = await complete(SYSTEM, userMessage, 500)
  return text.trim()
}
