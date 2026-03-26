import { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/authOrToken'
import { prisma } from '@/lib/prisma'
import Redis from 'ioredis'
import { connection } from '@/lib/queue'

interface RealtimeEvent {
  type: 'email:new' | 'email:updated' | 'email:deleted' | 'stats:update' | 'heartbeat' | 'reconnect' | 'sync:started'
  data: unknown
  timestamp: number
}

const CONNECTION_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes — EventSource auto-reconnects
const HEARTBEAT_INTERVAL_MS = 25_000         // 25s — prevents proxy/Vercel timeout
const POLL_INTERVAL_MS = 30_000              // 30s — fallback when Redis unavailable

const hasRedis = !!process.env.REDIS_URL && process.env.REDIS_URL !== 'redis://localhost:6379'

// Server-Sent Events — real-time email + stats sync
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const userId = user.id
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false
      const cleanupFns: Array<() => void> = []

      const enqueue = (raw: string) => {
        if (closed) return
        try { controller.enqueue(encoder.encode(raw)) } catch { /* stream closed */ }
      }

      const sendEvent = (event: RealtimeEvent) => {
        enqueue(`data: ${JSON.stringify(event)}\n\n`)
      }

      const cleanup = () => {
        if (closed) return
        closed = true
        cleanupFns.forEach((fn) => { try { fn() } catch { /* ignore */ } })
        try { controller.close() } catch { /* already closed */ }
      }

      // ── Initial snapshot (4 fields required by /api/stats contract) ───────
      try {
        const [unread, critical, tasks, waiting] = await Promise.all([
          prisma.email.count({ where: { userId, isRead: false } }),
          prisma.email.count({
            where: { userId, isRead: false, analysis: { priority: 'CRITICAL' } },
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
        sendEvent({ type: 'stats:update', data: { unread, critical, tasks, waiting }, timestamp: Date.now() })
      } catch (err) {
        console.error('[SSE] Failed initial snapshot:', err)
      }

      // ── Heartbeat every 25s (SSE comment — doesn't trigger onmessage) ──────
      const heartbeatTimer = setInterval(() => enqueue(': ping\n\n'), HEARTBEAT_INTERVAL_MS)
      cleanupFns.push(() => clearInterval(heartbeatTimer))

      // ── Hard timeout after 5 min — client EventSource auto-reconnects ──────
      const timeoutTimer = setTimeout(() => {
        enqueue(`data: ${JSON.stringify({ type: 'reconnect', timestamp: Date.now() })}\n\n`)
        cleanup()
      }, CONNECTION_TIMEOUT_MS)
      cleanupFns.push(() => clearTimeout(timeoutTimer))

      // ── Redis Pub/Sub (event-driven, primary path when Redis available) ─────
      if (hasRedis) {
        let subscriber: Redis | null = null
        try {
          subscriber = new Redis(connection as any)
          subscriber.on('error', (err) => {
            console.error(`[SSE] Redis subscriber error (${userId}):`, err.message)
          })

          const channel = `user:${userId}:updates`
          await subscriber.subscribe(channel)

          subscriber.on('message', (_ch: string, message: string) => {
            try {
              const event: RealtimeEvent = JSON.parse(message)
              sendEvent(event)
            } catch { /* malformed — skip */ }
          })

          cleanupFns.push(() => {
            subscriber?.unsubscribe().catch(() => {}).finally(() => subscriber?.disconnect())
          })
        } catch (err) {
          console.error('[SSE] Failed to set up Redis subscriber:', err)
          subscriber?.disconnect()
        }
      }

      // ── DB polling every 30s (fallback without Redis; catch-all with Redis) ─
      let lastUnread = -1
      const pollTimer = setInterval(async () => {
        try {
          const [unread, critical, tasks, waiting] = await Promise.all([
            prisma.email.count({ where: { userId, isRead: false } }),
            prisma.email.count({
              where: { userId, isRead: false, analysis: { priority: 'CRITICAL' } },
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

          if (unread !== lastUnread) {
            lastUnread = unread
            sendEvent({ type: 'stats:update', data: { unread, critical, tasks, waiting }, timestamp: Date.now() })
          }
        } catch {
          cleanup()
        }
      }, POLL_INTERVAL_MS)
      cleanupFns.push(() => clearInterval(pollTimer))

      // ── Client disconnect cleanup ─────────────────────────────────────────
      req.signal.addEventListener('abort', cleanup)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Prevent nginx/Vercel proxy buffering
    },
  })
}
