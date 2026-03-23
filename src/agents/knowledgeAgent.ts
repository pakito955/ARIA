import { completeJSON, complete } from '@/lib/anthropic'

export interface KnowledgeChunk {
  id: string
  title: string
  content: string
  tags: string[]
  relevanceScore?: number
}

export interface KnowledgeQueryResult {
  relevantItems: KnowledgeChunk[]
  contextSummary: string
  shouldInject: boolean
}

const RELEVANCE_SYSTEM = `You are ARIA's knowledge retrieval engine. Given an email context and a list of knowledge items, identify which items are relevant to help compose a response or understand the context. Return only valid JSON.`

/**
 * Find knowledge items relevant to the given email context.
 * Uses keyword pre-filter then Claude scoring for accuracy.
 */
export async function queryKnowledge(
  emailContext: string,
  knowledgeItems: KnowledgeChunk[]
): Promise<KnowledgeQueryResult> {
  if (knowledgeItems.length === 0) {
    return { relevantItems: [], contextSummary: '', shouldInject: false }
  }

  // Pre-filter by keyword overlap (fast, no AI cost)
  const emailWords = emailContext.toLowerCase().split(/\W+/).filter(w => w.length > 3)
  const preFiltered = knowledgeItems.filter(item => {
    const itemWords = `${item.title} ${item.content} ${item.tags.join(' ')}`.toLowerCase()
    return emailWords.some(w => itemWords.includes(w))
  })

  // If nothing matches keyword-wise, skip AI call
  if (preFiltered.length === 0) {
    return { relevantItems: [], contextSummary: '', shouldInject: false }
  }

  const itemList = preFiltered.slice(0, 10).map((item, i) => (
    `[${i}] Title: "${item.title}"\nContent: ${item.content.substring(0, 300)}\nTags: ${item.tags.join(', ')}`
  )).join('\n\n')

  const schema = `{
  "relevantIndices": [0, 2],
  "contextSummary": "one sentence describing what knowledge is relevant",
  "shouldInject": true
}`

  const result = await completeJSON<{
    relevantIndices: number[]
    contextSummary: string
    shouldInject: boolean
  }>(
    RELEVANCE_SYSTEM,
    `Email context:\n${emailContext.substring(0, 800)}\n\nKnowledge items:\n${itemList}\n\nReturn JSON:\n${schema}`,
    400,
    { relevantIndices: [], contextSummary: '', shouldInject: false }
  )

  const relevantItems = (result.relevantIndices || [])
    .filter(i => i >= 0 && i < preFiltered.length)
    .map(i => preFiltered[i])

  return {
    relevantItems,
    contextSummary: result.contextSummary || '',
    shouldInject: result.shouldInject && relevantItems.length > 0,
  }
}

/**
 * Build a context injection string from relevant knowledge items.
 * This gets prepended to AI prompts to give ARIA domain knowledge.
 */
export function buildKnowledgeContext(items: KnowledgeChunk[]): string {
  if (items.length === 0) return ''
  const sections = items.map(item => `### ${item.title}\n${item.content}`).join('\n\n')
  return `\n\n---\nRELEVANT KNOWLEDGE BASE:\n${sections}\n---\n`
}

/**
 * Generate an AI summary for a knowledge item.
 */
export async function summarizeKnowledge(title: string, content: string): Promise<string> {
  const { text } = await complete(
    'You are ARIA. Summarize this knowledge item in 1-2 sentences for quick reference.',
    `Title: ${title}\n\nContent: ${content.substring(0, 1000)}`,
    150
  )
  return text.trim()
}
