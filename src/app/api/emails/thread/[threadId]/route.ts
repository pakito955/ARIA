import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/authOrToken'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { threadId } = await params

  try {
    const emails = await prisma.email.findMany({
      where: { threadId, userId: user.id },
      orderBy: { receivedAt: 'asc' },
      include: { analysis: true },
    })

    return NextResponse.json({ data: emails, total: emails.length })
  } catch (err) {
    console.error('[Thread] Error:', err)
    return NextResponse.json({ error: 'Failed to fetch thread' }, { status: 500 })
  }
}
