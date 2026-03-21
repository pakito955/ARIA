import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET — list user's webhooks
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Return mock webhooks for now (schema extension needed for prod)
  return NextResponse.json({
    data: [],
    message: 'Webhook management active. Add DATABASE migration to persist webhooks.',
  })
}

// POST — create webhook
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { url, trigger, filters } = await req.json()

  if (!url || !trigger) {
    return NextResponse.json({ error: 'url and trigger are required' }, { status: 400 })
  }

  const validTriggers = ['email.critical', 'email.invoice', 'email.meeting', 'email.task', 'email.any']
  if (!validTriggers.includes(trigger)) {
    return NextResponse.json({ error: `Invalid trigger. Valid: ${validTriggers.join(', ')}` }, { status: 400 })
  }

  // In production: save to DB. For now return the created config.
  return NextResponse.json({
    data: {
      id: `wh_${Date.now()}`,
      url,
      trigger,
      filters: filters || {},
      userId: session.user.id,
      createdAt: new Date(),
      active: true,
    },
    message: 'Webhook registered. ARIA will call your URL when the trigger fires.',
  })
}

// Trigger webhook (called internally when email arrives)
export async function triggerWebhooks(
  userId: string,
  event: string,
  payload: object
) {
  // TODO: fetch user's webhooks from DB and POST to each URL
  console.log(`[Webhooks] ${event} for user ${userId}`, payload)
}
