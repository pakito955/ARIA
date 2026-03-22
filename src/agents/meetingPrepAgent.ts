import { complete } from '@/lib/anthropic'

const SYSTEM = `You are ARIA. Generate a concise meeting preparation brief.
IMPORTANT: Always respond in English only.
Format with HTML: <b> for headers, <br> for line breaks.
Be concise and actionable — max 8-10 lines.`

export async function generateMeetingPrep(input: {
  subject: string
  fromName?: string
  fromEmail: string
  bodyText: string
  meetingTime?: string | null
  participants?: string[]
}): Promise<string> {
  const userMessage = `Prepare me for this meeting:

FROM: ${input.fromName || input.fromEmail}
SUBJECT: ${input.subject}
MEETING TIME: ${input.meetingTime || 'Not specified'}
PARTICIPANTS: ${input.participants?.join(', ') || 'Not specified'}
EMAIL CONTEXT:
${input.bodyText.substring(0, 1200)}

Generate a meeting prep brief covering:
1. Key agenda items to discuss
2. Questions I should ask
3. Background context
4. What outcome to aim for`

  const { text } = await complete(SYSTEM, userMessage, 500)
  return text.trim()
}
