import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/authOrToken'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// NOTE: Requires `npx prisma db push` to create the OutboxEmail table.
const db = prisma as any

const createSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
  scheduledAt: z.string().datetime(),
})

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const outbox = await db.outboxEmail.findMany({
      where: { userId: user.id, sentAt: null },
      orderBy: { scheduledAt: 'asc' },
    })
    return NextResponse.json({ data: outbox })
  } catch (err) {
    console.error('[Outbox] Error:', err)
    return NextResponse.json({ error: 'Failed to fetch outbox' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = createSchema.safeParse(await req.json())
  if (!body.success) {
    return NextResponse.json({ error: 'Invalid request', details: body.error.flatten() }, { status: 400 })
  }

  try {
    const outboxEmail = await db.outboxEmail.create({
      data: {
        userId: user.id,
        to: body.data.to,
        subject: body.data.subject,
        body: body.data.body,
        scheduledAt: new Date(body.data.scheduledAt),
      },
    })

    return NextResponse.json({ data: outboxEmail }, { status: 201 })
  } catch (err) {
    console.error('[Outbox] Create error:', err)
    return NextResponse.json({ error: 'Failed to schedule email' }, { status: 500 })
  }
}
