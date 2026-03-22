import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  // Allow Vercel cron or internal calls
  const authHeader = req.headers.get('authorization')
  if (authHeader && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await prisma.email.updateMany({
    where: {
      isSnoozed: true,
      snoozeUntil: { lte: new Date() },
    },
    data: {
      isSnoozed: false,
      snoozeUntil: null,
    },
  })

  return NextResponse.json({ unsnoozed: result.count })
}
