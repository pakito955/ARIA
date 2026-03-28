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

// ── Auto-learning: extract insights from an email and store in KB ──────────────

import { prisma } from '@/lib/prisma'

/**
 * Extract key insights from an email and save to knowledge base.
 * Called after every email is processed/classified.
 */
export async function ingestEmailIntoKnowledge(params: {
  userId: string
  emailId?: string
  subject: string
  body: string
  fromEmail: string
  toEmail?: string
  type: 'INBOX' | 'SENT' | 'REPLY'
}): Promise<void> {
  const { userId, subject, body, fromEmail, toEmail, type } = params

  // Skip very short or trivial emails
  const textLength = body.trim().length
  if (textLength < 50) return

  // Extract key facts using AI
  const prompt = `Analyze this email and extract key knowledge items that would be useful for future AI-assisted replies.

Email type: ${type}
Subject: ${subject}
From: ${fromEmail}
${toEmail ? `To: ${toEmail}` : ''}

Body:
${body.slice(0, 2000)}

Return a JSON object:
{
  "shouldStore": true/false,
  "items": [
    {
      "title": "Brief descriptive title",
      "content": "The key information/fact extracted",
      "tags": ["tag1", "tag2"],
      "category": "preference|contact_info|project|process|fact|other"
    }
  ]
}

Only extract genuinely useful knowledge. Skip newsletters, spam, auto-replies.
Return at most 2 items. Return valid JSON only.`

  try {
    const { text } = await complete(
      'You are a knowledge extraction expert. Extract key facts and information from emails that will help generate better AI replies in the future. Be selective — only extract genuinely useful knowledge.',
      prompt,
      800,
      'claude-haiku-4-5-20251001'
    )

    const clean = text.replace(/```json\n?|\n?```/g, '').trim()
    const result = JSON.parse(clean)

    if (!result.shouldStore || !result.items?.length) return

    // Store each extracted item
    for (const item of result.items.slice(0, 2)) {
      // Check for near-duplicates by title
      const existing = await (prisma as any).knowledgeItem.findFirst({
        where: {
          userId,
          title: { contains: item.title.slice(0, 30) },
        },
      })

      if (existing) {
        // Update with new info if content differs
        if (!existing.content.includes(item.content.slice(0, 50))) {
          await (prisma as any).knowledgeItem.update({
            where: { id: existing.id },
            data: {
              content: `${existing.content}\n\n[Updated ${new Date().toLocaleDateString()}]: ${item.content}`,
              updatedAt: new Date(),
            },
          })
        }
      } else {
        await (prisma as any).knowledgeItem.create({
          data: {
            userId,
            title: item.title,
            content: item.content,
            source: 'AI_EXTRACTED',
            tags: JSON.stringify(item.tags || []),
          },
        })
      }
    }
  } catch (err) {
    // Non-critical — silently fail
    console.error('[KnowledgeIngest] Error:', err)
  }
}

/**
 * Extract text from attachment content and store in knowledge base.
 */
export async function ingestAttachmentIntoKnowledge(params: {
  userId: string
  filename: string
  textContent: string
  emailSubject?: string
}): Promise<void> {
  const { userId, filename, textContent, emailSubject } = params

  if (textContent.trim().length < 100) return

  try {
    const { text } = await complete(
      'Extract the most important knowledge from this document attachment for future AI email assistance.',
      `Filename: ${filename}
${emailSubject ? `From email: ${emailSubject}` : ''}

Content:
${textContent.slice(0, 3000)}

Return JSON: { "title": "...", "content": "key facts in 2-3 sentences", "tags": ["tag1","tag2"] }`,
      400,
      'claude-haiku-4-5-20251001'
    )

    const clean = text.replace(/```json\n?|\n?```/g, '').trim()
    const item = JSON.parse(clean)

    await (prisma as any).knowledgeItem.create({
      data: {
        userId,
        title: item.title || filename,
        content: item.content,
        source: 'ATTACHMENT',
        tags: JSON.stringify(item.tags || ['attachment', filename.split('.').pop() || 'file']),
      },
    })
  } catch (err) {
    console.error('[AttachmentIngest] Error:', err)
  }
}
