import { completeJSON } from '@/lib/anthropic'
import type { BrainDumpResult } from '@/types'

const SYSTEM = `You are ARIA, an executive AI assistant. The user has just finished a voice "brain dump" — an unstructured stream of consciousness recording capturing thoughts, to-dos, and notes about contacts.

Your job is to parse this raw transcript and extract structured, actionable items.

RULES:
- Extract every action item as a task with a sensible priority
- If the user mentions a person by name or email, extract a contact note
- If the user wants to send a message or email to someone, draft it
- Infer priorities: words like "urgent", "today", "ASAP" → CRITICAL; "soon", "this week" → HIGH; default → MEDIUM
- Return ONLY valid JSON, nothing else`

const SCHEMA = `{
  "tasks": [
    {
      "title": "string (imperative: do X)",
      "priority": "CRITICAL|HIGH|MEDIUM|LOW",
      "dueDate": "ISO date string or null",
      "description": "string or null"
    }
  ],
  "contactNotes": [
    {
      "email": "string (infer from name if possible, else use 'unknown@' prefix)",
      "note": "string (what was said about this person)"
    }
  ],
  "draftEmails": [
    {
      "toEmail": "string",
      "subject": "string",
      "body": "string (professional, ready to send)"
    }
  ],
  "summary": "1-2 sentence summary of the brain dump"
}`

export async function parseBrainDump(
  transcript: string,
  userContext?: { name?: string; email?: string }
): Promise<BrainDumpResult> {
  const fallback: BrainDumpResult = {
    tasks: [],
    contactNotes: [],
    draftEmails: [],
    summary: 'Brain dump processed.',
  }

  if (!transcript || transcript.trim().length < 5) return fallback

  const context = userContext
    ? `\nUser context: ${userContext.name || 'Executive'} (${userContext.email || 'unknown'})`
    : ''

  return await completeJSON<BrainDumpResult>(
    SYSTEM,
    `Raw transcript:${context}\n\n"${transcript.trim()}"\n\nExtract structured actions. Return JSON:\n${SCHEMA}`,
    1200,
    fallback
  )
}
