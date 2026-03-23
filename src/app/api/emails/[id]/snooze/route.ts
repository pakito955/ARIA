import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/authOrToken'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  until: z.string().datetime(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const body = schema.safeParse(await req.json())
  if (!body.success) {
    return NextResponse.json({ error: 'Invalid request', details: body.error.flatten() }, { status: 400 })
  }

  try {
    const email = await prisma.email.findFirst({
      where: { id, userId: user.id },
    })

    if (!email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 })
    }

    const until = new Date(body.data.until)
    const updated = await prisma.email.update({
      where: { id },
      data: {
        isSnoozed: true,
        snoozeUntil: until,
        isRead: true,
      },
    })

    return NextResponse.json({ data: updated })
  } catch (err) {
    console.error('[Snooze] Error:', err)
    return NextResponse.json({ error: 'Failed to snooze email' }, { status: 500 })
  }
}
