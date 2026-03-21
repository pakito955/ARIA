import { completeJSON } from '@/lib/anthropic'
import type { ClassificationInput, ClassificationOutput } from '@/types'

const SYSTEM_PROMPT = `Ti si ARIA, AI executive assistant. Analiziraš emailove sa preciznošću i brzinom.

INSTRUKCIJE:
- Vrati ISKLJUČIVO validan JSON, bez ikakvog teksta prije ili poslije
- Jezik odgovora: uvijek engleski za polja (priority, category, sentiment su enum vrijednosti)
- intent i summary pišeš na jeziku emaila (bosanski/srpski/engleski)
- urgencyScore: 1 (nevažno) do 10 (hitno odmah)
- confidenceScore: 0.0 do 1.0 (koliko si siguran u analizu)

PRIORITETI:
- CRITICAL: zahtijeva akciju danas, finansijski rizik, rokovi unutar 4h
- HIGH: zahtijeva akciju ovu sedmicu, važan pošiljalac
- MEDIUM: normalna komunikacija, akcija potrebna ali ne hitna
- LOW: informativno, newsletter, spam

KATEGORIJE:
- MEETING: prijedlog ili potvrda sastanka
- TASK: zahtijeva neku akciju/zadatak
- CRITICAL: hitno, risk, deadline
- INFO: informativno
- SPAM: neželjeno
- NEWSLETTER: automatski newsletter
- INVOICE: faktura/plaćanje`

const ANALYSIS_SCHEMA = `{
  "priority": "CRITICAL|HIGH|MEDIUM|LOW",
  "category": "MEETING|TASK|CRITICAL|INFO|SPAM|NEWSLETTER|INVOICE",
  "intent": "max 12 rijeci na jeziku emaila",
  "summary": "2-3 recenice na jeziku emaila",
  "deadlineText": "string ili null",
  "amount": "string sa valutom ili null",
  "sentiment": "POSITIVE|NEUTRAL|NEGATIVE|URGENT",
  "urgencyScore": 7,
  "suggestedAction": "konkretna akcija max 12 rijeci",
  "meetingDetected": false,
  "meetingTime": "string ili null",
  "meetingParticipants": [],
  "taskText": "string ili null",
  "confidenceScore": 0.92
}`

export async function classifyEmail(
  input: ClassificationInput
): Promise<ClassificationOutput> {
  const userMessage = `Email za analizu:

OD: ${input.fromName ? `${input.fromName} <${input.fromEmail}>` : input.fromEmail}
NASLOV: ${input.subject}
SADRŽAJ:
${input.bodyText.substring(0, 2000)}

Vrati JSON sa ovom strukturom:
${ANALYSIS_SCHEMA}`

  const fallback: ClassificationOutput = {
    priority: 'MEDIUM',
    category: 'INFO',
    intent: 'Pogledati email',
    summary: 'Email je primljen i čeka pregled.',
    sentiment: 'NEUTRAL',
    urgencyScore: 5,
    suggestedAction: 'Pročitati i odgovoriti',
    meetingDetected: false,
    meetingParticipants: [],
    taskExtracted: false,
    confidenceScore: 0.5,
  }

  const start = Date.now()
  const result = await completeJSON<ClassificationOutput>(
    SYSTEM_PROMPT,
    userMessage,
    600,
    fallback
  )

  // Ensure required fields exist
  return {
    ...fallback,
    ...result,
    taskExtracted: !!result.taskText,
    meetingParticipants: result.meetingParticipants || [],
  }
}
