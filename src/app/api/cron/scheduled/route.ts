import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

// Called by Vercel cron every 15 minutes
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Also allow authenticated users to trigger manually
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const now = new Date()

  const due = await prisma.scheduledEmail.findMany({
    where: {
      status: 'PENDING',
      scheduledAt: { lte: now },
    },
    include: { user: { include: { integrations: { where: { isActive: true }, take: 1 } } } },
  })

  let sent = 0
  let failed = 0

  for (const email of due) {
    try {
      const integration = email.user.integrations[0]
      if (!integration) {
        await prisma.scheduledEmail.update({
          where: { id: email.id },
          data: { status: 'FAILED' },
        })
        failed++
        continue
      }

      // Call the existing send email endpoint logic
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
      const res = await fetch(`${baseUrl}/api/ai/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailId: email.replyToId,
          replyText: email.body,
          style: 'professional',
        }),
      })

      if (res.ok) {
        await prisma.scheduledEmail.update({
          where: { id: email.id },
          data: { status: 'SENT', sentAt: new Date() },
        })
        sent++
      } else {
        await prisma.scheduledEmail.update({
          where: { id: email.id },
          data: { status: 'FAILED' },
        })
        failed++
      }
    } catch {
      await prisma.scheduledEmail.update({
        where: { id: email.id },
        data: { status: 'FAILED' },
      })
      failed++
    }
  }

  return NextResponse.json({ processed: due.length, sent, failed })
}
