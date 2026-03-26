import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { emailSyncQueue, connection } from '@/lib/queue'
import Redis from 'ioredis'

// ─── Types ────────────────────────────────────────────────────────────────────

interface GmailPushNotification {
  emailAddress: string
  historyId: string
}

// ─── Redis publisher (lazy singleton) ─────────────────────────────────────────

const hasRedis = !!process.env.REDIS_URL && process.env.REDIS_URL !== 'redis://localhost:6379'
let publisher: Redis | null = null

function getPublisher(): Redis | null {
  if (!hasRedis) return null
  if (!publisher) {
    publisher = new Redis(connection as any)
    publisher.on('error', (err) => console.error('[Webhook/Gmail] Redis error:', err.message))
  }
  return publisher
}

// ─── GET — webhook verification (Google sends this on subscription creation) ──

export async function GET() {
  return new NextResponse('OK', { status: 200 })
}

// ─── POST — Gmail push notification (Google Cloud Pub/Sub) ───────────────────

export async function POST(req: NextRequest) {
  try {
    // Validate Google push notification header
    const resourceState = req.headers.get('x-goog-resource-state')

    // Google sends "sync" on subscription creation — acknowledge without processing
    if (resourceState === 'sync') {
      return new NextResponse(null, { status: 204 })
    }

    // Parse the Pub/Sub message envelope
    let body: any
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    // Decode base64 Gmail notification payload
    const messageData = body?.message?.data
    if (!messageData) {
      return NextResponse.json({ error: 'Missing message.data' }, { status: 400 })
    }

    let notification: GmailPushNotification
    try {
      const decoded = Buffer.from(messageData, 'base64').toString('utf-8')
      notification = JSON.parse(decoded)
    } catch {
      return NextResponse.json({ error: 'Failed to decode notification payload' }, { status: 400 })
    }

    const { emailAddress, historyId } = notification
    if (!emailAddress || !historyId) {
      return NextResponse.json({ error: 'Missing emailAddress or historyId' }, { status: 400 })
    }

    // Look up user by email via Integration table
    const integration = await prisma.integration.findFirst({
      where: {
        email: emailAddress,
        provider: 'GMAIL',
        isActive: true,
      },
      select: { userId: true },
    }).catch(() => null)

    if (!integration) {
      // Unknown email — return 200 to prevent Google retrying endlessly
      console.warn(`[Webhook/Gmail] No active GMAIL integration for ${emailAddress}`)
      return new NextResponse(null, { status: 200 })
    }

    const { userId } = integration

    // Immediately signal SSE clients that a sync is starting
    const pub = getPublisher()
    if (pub) {
      pub
        .publish(
          `user:${userId}:updates`,
          JSON.stringify({ type: 'sync:started', data: { historyId }, timestamp: Date.now() })
        )
        .catch((err) => console.error('[Webhook/Gmail] Redis publish error:', err.message))
    }

    // Queue BullMQ gmail-sync job with deduplication
    if (emailSyncQueue) {
      await emailSyncQueue.add(
        `gmail-sync-${userId}`,
        { type: 'gmail-sync', userId, historyId } as any,
        {
          jobId: `gmail-sync-${userId}-${historyId}`,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        }
      )
    } else {
      console.warn('[Webhook/Gmail] No Redis — gmail-sync job not queued for user', userId)
    }

    return new NextResponse(null, { status: 204 })
  } catch (err: any) {
    console.error('[Webhook/Gmail] Unhandled error:', err.message)
    // Return 200 to avoid Google retrying server errors in a tight loop
    return new NextResponse(null, { status: 200 })
  }
}
