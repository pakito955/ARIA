import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/authOrToken'
import { prisma } from '@/lib/prisma'
import { complete } from '@/lib/anthropic'
import { buildKnowledgeContext, type KnowledgeChunk } from '@/agents/knowledgeAgent'

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: 'smart-search', method: 'POST' })
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const query: string = body.query ?? ''
  const limit: number = body.limit ?? 20

  if (!query.trim()) {
    return NextResponse.json({ answer: '', sources: [], count: 0 })
  }

  // ── 1. Fetch user knowledge items for context ────────────────────────────
  const rawKnowledge = await (prisma as any).knowledgeItem.findMany({
    where: { userId: user.id },
    orderBy: { useCount: 'desc' },
    take: 20,
    select: { id: true, title: true, content: true, tags: true },
  })

  const knowledgeChunks: KnowledgeChunk[] = rawKnowledge.map((k: any) => {
    let tags: string[] = []
    try { tags = JSON.parse(k.tags) } catch { /* keep empty */ }
    return { id: k.id, title: k.title, content: k.content, tags }
  })

  const kbContext = buildKnowledgeContext(knowledgeChunks)

  // ── 2. Search emails by semantic relevance ───────────────────────────────
  // Split query into terms and build OR conditions across key fields
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2)
    .slice(0, 8)

  // Use all terms if available, fallback to entire query as one term
  const searchTerms = terms.length > 0 ? terms : [query]

  const orConditions = searchTerms.flatMap((term) => [
    { subject:   { contains: term, mode: 'insensitive' as const } },
    { bodyText:  { contains: term, mode: 'insensitive' as const } },
    { fromEmail: { contains: term, mode: 'insensitive' as const } },
    { fromName:  { contains: term, mode: 'insensitive' as const } },
  ])

  const emails = await prisma.email.findMany({
    where: {
      userId: user.id,
      OR: orConditions,
    },
    orderBy: { receivedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      subject: true,
      fromEmail: true,
      fromName: true,
      bodyText: true,
      receivedAt: true,
      analysis: {
        select: { priority: true, summary: true },
      },
    },
  })

  if (emails.length === 0) {
    return NextResponse.json({
      answer: `I couldn't find any emails matching "${query}". Try different keywords or check if the emails have been synced.`,
      sources: [],
      count: 0,
    })
  }

  // ── 3. Build email context for Claude ───────────────────────────────────
  const emailContext = emails
    .slice(0, 12)
    .map((e, i) => {
      const date = new Date(e.receivedAt).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric',
      })
      const snippet = (e.bodyText ?? '').slice(0, 400).replace(/\s+/g, ' ').trim()
      return (
        `[Email ${i + 1}]\n` +
        `From: ${e.fromName ?? e.fromEmail} <${e.fromEmail}>\n` +
        `Subject: ${e.subject ?? '(no subject)'}\n` +
        `Date: ${date}\n` +
        `Body: ${snippet}`
      )
    })
    .join('\n\n---\n\n')

  // ── 4. Generate natural language answer with Claude haiku ────────────────
  const systemPrompt =
    `You are ARIA, an AI executive assistant. Answer the user's question about their emails in a natural, conversational tone. ` +
    `Be specific: mention names, dates, amounts, and key facts directly from the emails. ` +
    `Write 2–4 sentences. Do not list emails — synthesize the information into a direct answer.` +
    kbContext

  const userPrompt =
    `User question: "${query}"\n\n` +
    `Relevant emails:\n\n${emailContext}\n\n` +
    `Answer the question directly based on these emails.`

  const { text: answer } = await complete(
    systemPrompt,
    userPrompt,
    400,
    'claude-haiku-4-5-20251001'
  )

  // ── 5. Shape sources ─────────────────────────────────────────────────────
  const sources = emails.map((e) => ({
    id: e.id,
    fromName: e.fromName ?? null,
    fromEmail: e.fromEmail,
    subject: e.subject ?? '(no subject)',
    snippet: (e.bodyText ?? '').slice(0, 160).replace(/\s+/g, ' ').trim(),
    receivedAt: e.receivedAt,
    priority: (e.analysis as any)?.priority ?? null,
  }))

  return NextResponse.json({ answer: answer.trim(), sources, count: sources.length })
}
