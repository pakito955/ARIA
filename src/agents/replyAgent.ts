import { complete } from '@/lib/anthropic'
import type { ReplyGenerationInput, ReplyGenerationOutput } from '@/types'

const BASE_SYSTEM = `You are ARIA, an AI assistant that helps the user write emails.
Write ONLY the reply body — no "Subject:", no preamble, no "ARIA suggests:".
Use the SAME LANGUAGE as the original email.
Sign as the user (no ARIA signature).`

export async function generateReplies(
  input: ReplyGenerationInput
): Promise<ReplyGenerationOutput> {
  const context = `Replying to email:
FROM: ${input.fromName || input.fromEmail}
SUBJECT: ${input.subject}
MESSAGE: ${input.bodyText.substring(0, 1500)}`

  const [shortR, profR, friendlyR] = await Promise.all([
    complete(
      `${BASE_SYSTEM}\n\nSTYLE: Short and direct. Maximum 3 brief sentences. Confirm or address the key point.`,
      context,
      200
    ),
    complete(
      `${BASE_SYSTEM}\n\nSTYLE: Professional and formal. Full greeting, proper addressing, clear response with all relevant information. 3-5 sentences.`,
      context,
      350
    ),
    complete(
      `${BASE_SYSTEM}\n\nSTYLE: Friendly and warm. More personal tone, yet professional. 3-4 sentences.`,
      context,
      280
    ),
  ])

  return {
    short: shortR.text.trim(),
    professional: profR.text.trim(),
    friendly: friendlyR.text.trim(),
  }
}
