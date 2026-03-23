import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/authOrToken'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  emailIds: z.array(z.string()).min(1).max(100),
  action: z.enum(['archive', 'read', 'delete', 'analyze']),
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

  const { emailIds, action } = body.data
  const userId = user.id

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
  } else if (action === 'analyze') {
    // Queue analysis for each email (fire-and-forget, cap at 10)
    const toAnalyze = emailIds.slice(0, 10)
    const baseUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL || 'http://localhost:3000'
    await Promise.allSettled(
      toAnalyze.map((emailId) =>
        fetch(`${baseUrl}/api/ai/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emailId }),
        })
      )
    )
    affected = toAnalyze.length
  }

  return NextResponse.json({ success: true, affected, action })
}
