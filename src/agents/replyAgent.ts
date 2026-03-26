import { complete } from '@/lib/anthropic'
import type { ReplyGenerationInput, ReplyGenerationOutput } from '@/types'

const BASE_SYSTEM = `You are ARIA, an AI assistant that helps the user write emails.
Write ONLY the reply body — no "Subject:", no preamble, no "ARIA suggests:".
Use the SAME LANGUAGE as the original email.
Sign as the user (no ARIA signature).`

// ── Language Detection (heuristic) ────────────────────────────────────────────

const LANG_PATTERNS: Array<{ lang: string; patterns: RegExp[] }> = [
  { lang: 'bs', patterns: [/\b(hvala|molim|pozdrav|dragi|poštovani|vaš|naš|što|koji|kako|kada|gdje|nije|može|trebam)\b/gi] },
  { lang: 'hr', patterns: [/\b(hvala|molim|pozdrav|dragi|poštovani|vaš|naš|što|koji|kako|kada|gdje|nije|može|trebam)\b/gi] },
  { lang: 'fr', patterns: [/\b(bonjour|merci|cordialement|veuillez|madame|monsieur|nous|vous|avec|pour|dans|cette)\b/gi] },
  { lang: 'de', patterns: [/\b(hallo|danke|bitte|sehr|geehrte|freundlichen|grüßen|ihre|wir|mit|für|dass|sich|werden)\b/gi] },
  { lang: 'es', patterns: [/\b(hola|gracias|saludos|estimado|estimada|por|para|con|que|una|los|las|está|puede)\b/gi] },
  { lang: 'pt', patterns: [/\b(olá|obrigado|obrigada|atenciosamente|prezado|prezada|por|para|com|que|uma|está|pode)\b/gi] },
  { lang: 'it', patterns: [/\b(ciao|grazie|cordiali|saluti|gentile|per|con|che|una|sono|siamo|può|vostra)\b/gi] },
  { lang: 'nl', patterns: [/\b(hallo|dank|graag|geachte|met|voor|dat|een|zijn|heeft|kunnen|onze|uw)\b/gi] },
  { lang: 'pl', patterns: [/\b(dzień|dziękuję|pozdrawiam|szanowny|szanowna|dla|przez|jest|się|jako|tego)\b/gi] },
]

export function detectLanguageHeuristic(text: string): string {
  const sample = text.slice(0, 800)
  let best = 'en'
  let bestCount = 2 // threshold: must have at least 3 matches

  for (const { lang, patterns } of LANG_PATTERNS) {
    let count = 0
    for (const pattern of patterns) {
      const matches = sample.match(pattern)
      if (matches) count += matches.length
    }
    if (count > bestCount) {
      bestCount = count
      best = lang
    }
  }

  return best
}

// ── Tone Detection ────────────────────────────────────────────────────────────

export function detectTone(fromEmail: string, bodyText: string): 'formal' | 'professional' | 'casual' {
  const body = bodyText.toLowerCase()
  const casualSignals = ['hey ', 'hi ', 'lol', '!!', '😊', '😄', 'thanks!', 'cheers', 'btw', 'asap']
  const formalSignals = ['dear ', 'pursuant', 'i am writing to', 'please find', 'regarding', 'herewith', 'sincerely', 'yours faithfully']

  const casualScore = casualSignals.filter((s) => body.includes(s)).length
  const formalScore = formalSignals.filter((s) => body.includes(s)).length

  if (formalScore >= 2) return 'formal'
  if (casualScore >= 2) return 'casual'
  return 'professional'
}

// ── Enhanced Reply Generation ─────────────────────────────────────────────────

export interface EnhancedReplyInput {
  subject: string
  bodyText: string
  fromEmail: string
  fromName?: string
  userName?: string
  isVip?: boolean
  style?: 'brief' | 'standard' | 'detailed'
}

export interface EnhancedReplyOutput {
  reply: string
  language: string
  tone: string
  confidence: number
}

export async function generateEnhancedReply(
  input: EnhancedReplyInput
): Promise<EnhancedReplyOutput> {
  const language = detectLanguageHeuristic(input.bodyText)
  const tone = detectTone(input.fromEmail, input.bodyText)
  const style = input.style ?? 'standard'

  const HAIKU = 'claude-haiku-4-5-20251001'
  const SONNET = 'claude-sonnet-4-6'
  const model = style === 'detailed' ? SONNET : HAIKU

  const maxTokens = style === 'brief' ? 150 : style === 'detailed' ? 500 : 280

  const vipNote = input.isVip ? '\nIMPORTANT: This sender is a VIP contact — be especially attentive and thorough.' : ''
  const langNote = language !== 'en' ? `\nREQUIRED: Write the reply in the SAME LANGUAGE as the original email (detected: ${language}).` : ''

  const system = `You are ARIA, an expert AI email assistant helping ${input.userName ?? 'the user'} write email replies.
Write ONLY the reply body — no "Subject:", no greeting prefix, no "ARIA suggests:".
Match the ${tone} tone of the conversation.
${style === 'brief' ? 'Keep the reply SHORT — maximum 2-3 sentences.' : style === 'detailed' ? 'Write a thorough, multi-paragraph response addressing all points.' : 'Write a clear, complete paragraph response.'}${langNote}${vipNote}
Sign naturally as the user without an ARIA signature.`

  const context = `Email from: ${input.fromName || input.fromEmail}
Subject: ${input.subject}
Message: ${input.bodyText.slice(0, 1500)}`

  const { text } = await complete(system, context, maxTokens, model)

  return {
    reply: text.trim(),
    language,
    tone,
    confidence: 0.85,
  }
}

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
