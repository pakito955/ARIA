import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const scheduled = await prisma.scheduledEmail.findMany({
    where: { userId: session.user.id, status: 'PENDING' },
    orderBy: { scheduledAt: 'asc' },
  })

  return NextResponse.json({ data: scheduled })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { toEmail, subject, body, scheduledAt, replyToId } = await req.json()
  if (!toEmail || !subject || !body || !scheduledAt) {
    return NextResponse.json({ error: 'toEmail, subject, body, scheduledAt required' }, { status: 400 })
  }

  const scheduled = await prisma.scheduledEmail.create({
    data: {
      userId: session.user.id,
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
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  await prisma.scheduledEmail.updateMany({
    where: { id, userId: session.user.id, status: 'PENDING' },
    data: { status: 'CANCELLED' },
  })

  return NextResponse.json({ ok: true })
}
