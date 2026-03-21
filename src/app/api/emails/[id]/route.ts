import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const email = await prisma.email.findFirst({
    where: { id, userId: session.user.id },
    include: {
      analysis: true,
      tasks: { select: { id: true, title: true, status: true, priority: true } },
    },
  })

  if (!email) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (!email.isRead) {
    await prisma.email.update({ where: { id }, data: { isRead: true } })
  }

  return NextResponse.json({ data: email })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const allowed = ['isRead', 'isStarred', 'isSnoozed', 'snoozeUntil']
  const updates: any = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  await prisma.email.updateMany({ where: { id, userId: session.user.id }, data: updates })
  return NextResponse.json({ success: true })
}
