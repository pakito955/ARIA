import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export const DEFAULT_MODEL = 'claude-sonnet-4-6'

// ─── Streaming helper ─────────────────────────────────────────────────────────

export async function streamCompletion(
  system: string,
  userMessage: string,
  onChunk: (text: string) => void,
  maxTokens = 1000,
  model = DEFAULT_MODEL
): Promise<string> {
  let fullText = ''

  const stream = anthropic.messages.stream({
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: userMessage }],
  })

  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      fullText += event.delta.text
      onChunk(event.delta.text)
    }
  }

  return fullText
}

// ─── Simple completion helper ─────────────────────────────────────────────────

export async function complete(
  system: string,
  userMessage: string,
  maxTokens = 800,
  model = DEFAULT_MODEL
): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  const response = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: userMessage }],
  })

  return {
    text: response.content[0].type === 'text' ? response.content[0].text : '',
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  }
}

// ─── JSON extraction helper ───────────────────────────────────────────────────

export async function completeJSON<T>(
  system: string,
  userMessage: string,
  maxTokens = 800,
  fallback: T
): Promise<T> {
  const { text } = await complete(system, userMessage, maxTokens)
  try {
    const clean = text.replace(/```json\n?|\n?```/g, '').trim()
    return JSON.parse(clean) as T
  } catch {
    console.error('[ARIA] JSON parse failed, using fallback')
    return fallback
  }
}
