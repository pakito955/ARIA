import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: list pending follow-ups
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const reminders = await prisma.followupReminder.findMany({
    where: { userId: session.user.id, isDone: false },
    orderBy: { dueAt: 'asc' },
    include: {
      email: {
        select: {
          id: true,
          subject: true,
          fromName: true,
          fromEmail: true,
          receivedAt: true,
        },
      },
    },
  })

  const now = new Date()
  const overdue = reminders.filter((r) => new Date(r.dueAt) < now)
  const upcoming = reminders.filter((r) => new Date(r.dueAt) >= now)

  return NextResponse.json({ overdue, upcoming, total: reminders.length })
}

// POST: create follow-up reminder
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { emailId, daysUntilFollowup = 3, note } = await req.json()
  if (!emailId) return NextResponse.json({ error: 'emailId required' }, { status: 400 })

  // Verify email belongs to user
  const email = await prisma.email.findFirst({
    where: { id: emailId, userId: session.user.id },
  })
  if (!email) return NextResponse.json({ error: 'Email not found' }, { status: 404 })

  const dueAt = new Date()
  dueAt.setDate(dueAt.getDate() + daysUntilFollowup)

  // Upsert — replace existing reminder for same email
  await prisma.followupReminder.deleteMany({
    where: { emailId, userId: session.user.id, isDone: false },
  })

  const reminder = await prisma.followupReminder.create({
    data: {
      userId: session.user.id,
      emailId,
      dueAt,
      note: note || null,
    },
  })

  return NextResponse.json({ data: reminder })
}

// PATCH: mark done
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  await prisma.followupReminder.updateMany({
    where: { id, userId: session.user.id },
    data: { isDone: true },
  })

  return NextResponse.json({ ok: true })
}
