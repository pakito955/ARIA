// POST /api/webhooks/incoming
// Receives external payloads (Stripe, Zapier, etc.) and auto-drafts response emails
// Secured by a user-specific API key in the X-ARIA-Key header
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { draftWebhookResponse } from '@/agents/webhookDraftAgent'
import { queryKnowledge } from '@/agents/knowledgeAgent'
import type { WebhookPayload } from '@/types'

const db = prisma as any

export async function POST(req: NextRequest) {
  // Auth via X-ARIA-Key header (maps to ExtensionToken or a dedicated webhook secret)
  const apiKey = req.headers.get('x-aria-key') || req.headers.get('authorization')?.replace('Bearer ', '')

  if (!apiKey) {
    return NextResponse.json({ error: 'Missing X-ARIA-Key header' }, { status: 401 })
  }

  // Look up the user via ExtensionToken (reuse existing bearer token mechanism)
  const token = await db.extensionToken.findUnique({ where: { token: apiKey } })
  if (!token) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
  }

  const userId = token.userId

  // Parse payload — accept Stripe, Zapier, or raw WebhookPayload formats
  let rawBody: any
  try {
    rawBody = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Normalize to WebhookPayload
  const payload: WebhookPayload = normalizePayload(rawBody)

  if (!payload.customerEmail) {
    return NextResponse.json({
      error: 'Could not determine customer email from payload. Include customerEmail or data.object.customer_email.',
    }, { status: 422 })
  }

  // Fetch knowledge items for RAG
  const rawItems = await db.knowledgeItem.findMany({
    where: { userId },
    orderBy: { useCount: 'desc' },
    take: 30,
  })
  const knowledgeChunks = rawItems.map((k: any) => ({
    id: k.id,
    title: k.title,
    content: k.content,
    tags: JSON.parse(k.tags || '[]'),
  }))

  // Find relevant knowledge for this payload
  const context = `${payload.event} ${payload.description || ''} ${payload.customerName || ''}`
  const { relevantItems } = await queryKnowledge(context, knowledgeChunks).catch(() => ({ relevantItems: [] }))

  // Also increment useCount
  if (relevantItems.length > 0) {
    await db.knowledgeItem.updateMany({
      where: { id: { in: relevantItems.map((i: any) => i.id) } },
      data: { useCount: { increment: 1 } },
    })
  }

  // Draft the email using RAG context
  const draft = await draftWebhookResponse(payload, relevantItems)

  if (!draft) {
    return NextResponse.json({ error: 'Could not generate draft email' }, { status: 500 })
  }

  // Save to approval queue
  const savedDraft = await db.draftEmail.create({
    data: {
      userId,
      toEmail: draft.toEmail,
      subject: draft.subject,
      body: draft.body,
      source: 'WEBHOOK',
      triggerType: draft.triggerType,
      triggerData: JSON.stringify(rawBody).substring(0, 2000),
      status: 'PENDING',
    },
  })

  // Update extension token last used
  await db.extensionToken.update({
    where: { token: apiKey },
    data: { lastUsedAt: new Date() },
  })

  return NextResponse.json({
    success: true,
    draftId: savedDraft.id,
    message: `Draft email created for ${draft.toEmail} — pending approval in ARIA.`,
  })
}

/**
 * Normalize various webhook payload formats into a unified WebhookPayload.
 * Handles Stripe, Zapier, and generic formats.
 */
function normalizePayload(raw: any): WebhookPayload {
  // Stripe format
  if (raw.type && raw.data?.object) {
    const obj = raw.data.object
    return {
      event: raw.type,
      source: 'stripe',
      customerEmail: obj.customer_email || obj.email || obj.receipt_email || obj.billing_details?.email,
      customerName: obj.billing_details?.name || obj.customer_name,
      amount: obj.amount ? obj.amount / 100 : obj.amount_total ? obj.amount_total / 100 : undefined,
      currency: obj.currency?.toUpperCase(),
      description: obj.description || obj.statement_descriptor,
      metadata: obj.metadata,
    }
  }

  // Zapier / generic format
  return {
    event: raw.event || raw.type || 'webhook.received',
    source: raw.source || raw.app || 'external',
    customerEmail: raw.customerEmail || raw.email || raw.customer_email,
    customerName: raw.customerName || raw.name || raw.customer_name,
    amount: raw.amount,
    currency: raw.currency,
    description: raw.description || raw.message,
    metadata: raw.metadata || raw.data,
  }
}
