import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/authOrToken'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  emailId: z.string(),
  snoozeUntil: z.string().datetime(),
})

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = schema.safeParse(await req.json())
  if (!body.success) {
    return NextResponse.json({ error: 'Invalid request', details: body.error.flatten() }, { status: 400 })
  }

  const { emailId, snoozeUntil } = body.data

  const email = await prisma.email.findFirst({
    where: { id: emailId, userId: user.id },
  })

  if (!email) {
    return NextResponse.json({ error: 'Email not found' }, { status: 404 })
  }

  const updated = await prisma.email.update({
    where: { id: emailId },
    data: {
      isSnoozed: true,
      snoozeUntil: new Date(snoozeUntil),
      isRead: true,
    },
  })

  return NextResponse.json({ success: true, data: updated })
}
