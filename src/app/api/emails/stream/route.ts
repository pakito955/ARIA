import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Server-Sent Events — real-time email sync
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 })
  }

  const userId = session.user.id
  let lastCount = 0

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      // Initial state
      const initial = await prisma.email.count({ where: { userId, isRead: false } })
      lastCount = initial
      send({ type: 'init', unread: initial })

      // Poll every 30s for new emails
      const interval = setInterval(async () => {
        try {
          const [unread, critical] = await Promise.all([
            prisma.email.count({ where: { userId, isRead: false } }),
            prisma.email.count({
              where: {
                userId,
                isRead: false,
                analysis: { priority: 'CRITICAL' },
              },
            }),
          ])

          if (unread !== lastCount) {
            const newCount = unread - lastCount
            lastCount = unread

            send({
              type: 'update',
              unread,
              critical,
              newEmails: newCount > 0 ? newCount : 0,
            })
          }
        } catch {
          clearInterval(interval)
          controller.close()
        }
      }, 30_000)

      // Cleanup on disconnect
      req.signal.addEventListener('abort', () => {
        clearInterval(interval)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
