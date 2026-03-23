import { completeJSON } from '@/lib/anthropic'
import { buildKnowledgeContext } from '@/agents/knowledgeAgent'
import type { WebhookPayload } from '@/types'

interface KnowledgeChunk {
  id: string
  title: string
  content: string
  tags: string[]
}

interface DraftResult {
  toEmail: string
  subject: string
  body: string
  triggerType: string
}

const SYSTEM = `You are ARIA, an executive AI email assistant. You have received an external webhook trigger (e.g., from Stripe or Zapier) and must draft a professional, personalized email response.

Use the provided knowledge base context to ensure the email is accurate and on-brand.

RULES:
- Draft ONE professional email
- Use the knowledge base for accurate details (pricing, policies, product info)
- Be warm, professional, and specific
- Do NOT invent information not in the knowledge base
- Return ONLY valid JSON`

const SCHEMA = `{
  "toEmail": "recipient email",
  "subject": "email subject",
  "body": "full email body (plain text, professional)",
  "triggerType": "brief type label e.g. invoice_paid | lead_created | subscription_started"
}`

export async function draftWebhookResponse(
  payload: WebhookPayload,
  relevantKnowledge: KnowledgeChunk[]
): Promise<DraftResult | null> {
  const knowledgeContext = buildKnowledgeContext(relevantKnowledge)

  const payloadSummary = [
    `Event: ${payload.event}`,
    payload.source ? `Source: ${payload.source}` : null,
    payload.customerEmail ? `Customer: ${payload.customerName || ''} <${payload.customerEmail}>` : null,
    payload.amount ? `Amount: ${payload.currency || 'USD'} ${payload.amount}` : null,
    payload.description ? `Description: ${payload.description}` : null,
    payload.metadata ? `Metadata: ${JSON.stringify(payload.metadata)}` : null,
  ].filter(Boolean).join('\n')

  const fallback: DraftResult = {
    toEmail: payload.customerEmail || '',
    subject: `Re: ${payload.event.replace(/_/g, ' ')}`,
    body: `Thank you for your message. We will be in touch shortly.`,
    triggerType: payload.event,
  }

  if (!payload.customerEmail) return null

  return await completeJSON<DraftResult>(
    SYSTEM,
    `Webhook payload:\n${payloadSummary}${knowledgeContext}\n\nDraft a response email. Return JSON:\n${SCHEMA}`,
    800,
    fallback
  )
}

/**
 * Generate a meeting prep briefing for an upcoming calendar event.
 * Injects contact notes and knowledge context.
 */
export async function generateMeetingPrep(event: {
  title: string
  startTime: Date
  participants: string[]
  description?: string
}, contactNotes: string[], knowledgeChunks: KnowledgeChunk[]): Promise<string> {
  const { complete } = await import('@/lib/anthropic')
  const knowledgeContext = buildKnowledgeContext(knowledgeChunks)

  const notesBlock = contactNotes.length > 0
    ? `\n\nCONTACT NOTES:\n${contactNotes.join('\n')}`
    : ''

  const { text } = await complete(
    `You are ARIA. Generate a concise meeting prep note (3-5 bullet points) for the user. Include: key talking points, what to prepare, what you know about the participants. Be specific and actionable.`,
    `Meeting: ${event.title}
Time: ${event.startTime.toLocaleString()}
Participants: ${event.participants.join(', ') || 'TBD'}
${event.description ? `Agenda: ${event.description}` : ''}${notesBlock}${knowledgeContext}`,
    400
  )
  return text.trim()
}
