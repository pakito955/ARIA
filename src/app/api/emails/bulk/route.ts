import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  emailIds: z.array(z.string()).min(1).max(100),
  action: z.enum(['archive', 'read', 'delete']),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = schema.safeParse(await req.json())
  if (!body.success) {
    return NextResponse.json({ error: 'Invalid request', details: body.error.flatten() }, { status: 400 })
  }

  const { emailIds, action } = body.data
  const userId = session.user.id

  // Verify all emails belong to this user
  const count = await prisma.email.count({
    where: { id: { in: emailIds }, userId },
  })

  if (count !== emailIds.length) {
    return NextResponse.json({ error: 'Some emails not found or unauthorized' }, { status: 403 })
  }

  let affected = 0

  if (action === 'read') {
    const result = await prisma.email.updateMany({
      where: { id: { in: emailIds }, userId },
      data: { isRead: true },
    })
    affected = result.count
  } else if (action === 'archive') {
    // Mark as read + add archive label equivalent (isRead + isSnoozed so it drops out of inbox view)
    const result = await prisma.email.updateMany({
      where: { id: { in: emailIds }, userId },
      data: {
        isRead: true,
        labels: JSON.stringify(['INBOX', 'ARCHIVED']),
      },
    })
    affected = result.count
  } else if (action === 'delete') {
    const result = await prisma.email.deleteMany({
      where: { id: { in: emailIds }, userId },
    })
    affected = result.count
  }

  return NextResponse.json({ success: true, affected, action })
}
