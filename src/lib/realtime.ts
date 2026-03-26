/**
 * ARIA Real-time Broadcasting Utility
 * Uses Redis PUBLISH to push typed events to connected SSE clients.
 * Named exports only — no default export (per project conventions).
 */

import { connection } from '@/lib/queue'
import { prisma } from '@/lib/prisma'
import Redis from 'ioredis'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RealtimeEvent {
  type:
    | 'email:new'
    | 'email:updated'
    | 'email:deleted'
    | 'stats:update'
    | 'sync:started'
    | 'sync:completed'
    | 'heartbeat'
  data: unknown
  timestamp: number
}

// ─── Redis Publisher (lazy singleton) ─────────────────────────────────────────

let publisher: Redis | null = null

function getPublisher(): Redis | null {
  if (!process.env.REDIS_URL || process.env.REDIS_URL === 'redis://localhost:6379') {
    return null
  }
  if (!publisher) {
    publisher = new Redis(connection as any)
    publisher.on('error', (err) => {
      console.error('[Realtime] Redis publisher error:', err.message)
    })
  }
  return publisher
}

// ─── broadcastToUser ──────────────────────────────────────────────────────────

/**
 * Publish a typed real-time event to all SSE clients connected for this user.
 * Channel pattern: `user:{userId}:updates`
 */
export async function broadcastToUser(userId: string, event: RealtimeEvent): Promise<void> {
  const pub = getPublisher()
  if (!pub) return

  try {
    await pub.publish(`user:${userId}:updates`, JSON.stringify(event))
  } catch (err: any) {
    console.error(`[Realtime] Failed to broadcast to user ${userId}:`, err.message)
  }
}

// ─── broadcastStatsUpdate ─────────────────────────────────────────────────────

/**
 * Fetch current inbox stats for the user and broadcast a stats:update event.
 * Designed for fire-and-forget use: broadcastStatsUpdate(userId).catch(console.error)
 */
export async function broadcastStatsUpdate(userId: string): Promise<void> {
  try {
    const [unread, critical, tasks, waiting] = await Promise.all([
      prisma.email.count({ where: { userId, isRead: false } }),
      prisma.email.count({
        where: {
          userId,
          isRead: false,
          analysis: { priority: 'CRITICAL' },
        },
      }),
      prisma.task.count({
        where: { userId, status: { in: ['TODO', 'IN_PROGRESS'] } },
      }),
      prisma.email.count({
        where: {
          userId,
          receivedAt: { lte: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
          isRead: false,
        },
      }),
    ])

    await broadcastToUser(userId, {
      type: 'stats:update',
      data: { unread, critical, tasks, waiting },
      timestamp: Date.now(),
    })
  } catch (err: any) {
    console.error(`[Realtime] broadcastStatsUpdate failed for user ${userId}:`, err.message)
  }
}
