import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/authOrToken'
import { prisma } from '@/lib/prisma'
import { anthropic } from '@/lib/anthropic'
import { buildAssistantContext, formatContextForPrompt } from '@/lib/aiContext'

const HAIKU = 'claude-haiku-4-5-20251001'

// ── In-memory rate limiter (30 req/min per user) ─────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(userId)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60_000 })
    return true
  }

  if (entry.count >= 30) return false

  entry.count++
  return true
}

const SYSTEM_BASE = `You are ARIA, an AI-powered executive assistant.
You have access to the user's live inbox, calendar, and task data (shown below).
Answer questions concisely and helpfully. Be direct — no fluff.
When listing emails or events, format them clearly.
If asked something you cannot answer from context, say so briefly.`

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!checkRateLimit(user.id)) {
    return NextResponse.json({ error: 'Rate limit exceeded. Try again in a minute.' }, { status: 429 })
  }

  let message: string
  try {
    const body = await req.json()
    message = body?.message?.trim()
    if (!message) return NextResponse.json({ error: 'message is required' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Build live context
  const ctx = await buildAssistantContext(user.id, prisma as any).catch(() => null)
  const contextSection = ctx ? formatContextForPrompt(ctx) : ''
  const systemPrompt = contextSection
    ? `${SYSTEM_BASE}\n\n${contextSection}`
    : SYSTEM_BASE

  // Stream response
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const msgStream = anthropic.messages.stream({
          model: HAIKU,
          max_tokens: 600,
          system: systemPrompt,
          messages: [{ role: 'user', content: message }],
        })

        for await (const event of msgStream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(event.delta.text))
          }
        }
      } catch (err: any) {
        controller.enqueue(encoder.encode(`\n\n[Error: ${err.message}]`))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  })
}
