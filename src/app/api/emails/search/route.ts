import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/authOrToken'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const q = searchParams.get('q') || ''
  const includeSnoozed = searchParams.get('snoozed') === 'true'
  const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 100)

  if (!q.trim()) {
    return NextResponse.json({ data: [], total: 0 })
  }

  const where: Record<string, unknown> = {
    userId: user.id,
    OR: [
      { subject:   { contains: q, mode: 'insensitive' } },
      { fromEmail: { contains: q, mode: 'insensitive' } },
      { fromName:  { contains: q, mode: 'insensitive' } },
      { bodyText:  { contains: q, mode: 'insensitive' } },
    ],
  }

  if (!includeSnoozed) {
    where.isSnoozed = false
  }

  try {
    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where,
        include: { analysis: true },
        orderBy: { receivedAt: 'desc' },
        take: limit,
      }),
      prisma.email.count({ where }),
    ])

    return NextResponse.json({ data: emails, total, hasMore: total > limit })
  } catch (err) {
    console.error('[Search] Error:', err)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
