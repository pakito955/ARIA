import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/authOrToken'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const contactEmail = searchParams.get('email')
  if (!contactEmail) return NextResponse.json({ error: 'email required' }, { status: 400 })

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

  const [recent, previous] = await Promise.all([
    prisma.email.count({
      where: {
        userId: user.id,
        fromEmail: contactEmail,
        receivedAt: { gte: thirtyDaysAgo },
      },
    }),
    prisma.email.count({
      where: {
        userId: user.id,
        fromEmail: contactEmail,
        receivedAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
      },
    }),
  ])

  let trend: 'improving' | 'stable' | 'declining' | 'new'
  let score: number

  if (previous === 0 && recent > 0) {
    trend = 'new'
    score = 75
  } else if (previous === 0 && recent === 0) {
    trend = 'stable'
    score = 50
  } else {
    const ratio = recent / Math.max(previous, 1)
    if (ratio >= 1.3) {
      trend = 'improving'
      score = Math.min(95, 60 + recent * 5)
    } else if (ratio <= 0.5) {
      trend = 'declining'
      score = Math.max(10, 50 - (previous - recent) * 5)
    } else {
      trend = 'stable'
      score = 65
    }
  }

  return NextResponse.json({ trend, score, recent, previous })
}
