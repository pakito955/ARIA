import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/authOrToken'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const scheduled = await prisma.scheduledEmail.findMany({
    where: { userId: user.id, status: 'PENDING' },
    orderBy: { scheduledAt: 'asc' },
  })

  return NextResponse.json({ data: scheduled })
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { toEmail, subject, body, scheduledAt, replyToId } = await req.json()
  if (!toEmail || !subject || !body || !scheduledAt) {
    return NextResponse.json({ error: 'toEmail, subject, body, scheduledAt required' }, { status: 400 })
  }

  const scheduled = await prisma.scheduledEmail.create({
    data: {
      userId: user.id,
      toEmail,
      subject,
      body,
      scheduledAt: new Date(scheduledAt),
      replyToId: replyToId || null,
    },
  })

  return NextResponse.json({ data: scheduled })
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  await prisma.scheduledEmail.updateMany({
    where: { id, userId: user.id, status: 'PENDING' },
    data: { status: 'CANCELLED' },
  })

  return NextResponse.json({ ok: true })
}
