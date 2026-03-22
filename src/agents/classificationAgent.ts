import { completeJSON } from '@/lib/anthropic'
import type { ClassificationInput, ClassificationOutput } from '@/types'

const SYSTEM_PROMPT = `You are ARIA, an AI executive assistant. You analyze emails with precision and speed.

INSTRUCTIONS:
- Return ONLY valid JSON, with no text before or after
- Response language: always English for enum fields (priority, category, sentiment are enum values)
- Write intent and summary in the language of the email
- urgencyScore: 1 (not important) to 10 (urgent, immediate action required)
- confidenceScore: 0.0 to 1.0 (confidence level in the analysis)

PRIORITIES:
- CRITICAL: requires action today, financial risk, deadlines within 4 hours
- HIGH: requires action this week, important sender
- MEDIUM: normal communication, action needed but not urgent
- LOW: informational, newsletter, spam

CATEGORIES:
- MEETING: meeting proposal or confirmation
- TASK: requires an action or task
- CRITICAL: urgent, risk, deadline
- INFO: informational
- SPAM: unwanted
- NEWSLETTER: automated newsletter
- INVOICE: invoice/payment`

const ANALYSIS_SCHEMA = `{
  "priority": "CRITICAL|HIGH|MEDIUM|LOW",
  "category": "MEETING|TASK|CRITICAL|INFO|SPAM|NEWSLETTER|INVOICE",
  "intent": "max 12 words in the email's language",
  "summary": "2-3 sentences in the email's language",
  "deadlineText": "string or null",
  "amount": "string with currency or null",
  "sentiment": "POSITIVE|NEUTRAL|NEGATIVE|URGENT",
  "urgencyScore": 7,
  "suggestedAction": "concrete action max 12 words",
  "meetingDetected": false,
  "meetingTime": "string or null",
  "meetingParticipants": [],
  "taskText": "string or null",
  "confidenceScore": 0.92
}`

export async function classifyEmail(
  input: ClassificationInput
): Promise<ClassificationOutput> {
  const userMessage = `Email to analyze:

FROM: ${input.fromName ? `${input.fromName} <${input.fromEmail}>` : input.fromEmail}
SUBJECT: ${input.subject}
BODY:
${input.bodyText.substring(0, 2000)}

Return JSON with this structure:
${ANALYSIS_SCHEMA}`

  const fallback: ClassificationOutput = {
    priority: 'MEDIUM',
    category: 'INFO',
    intent: 'Review email',
    summary: 'Email received and awaiting review.',
    sentiment: 'NEUTRAL',
    urgencyScore: 5,
    suggestedAction: 'Read and reply',
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
