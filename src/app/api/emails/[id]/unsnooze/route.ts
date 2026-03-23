import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/authOrToken'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    const email = await prisma.email.findFirst({
      where: { id, userId: user.id },
    })

    if (!email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 })
    }

    const updated = await prisma.email.update({
      where: { id },
      data: {
        isSnoozed: false,
        snoozeUntil: null,
      },
    })

    return NextResponse.json({ data: updated })
  } catch (err) {
    console.error('[Unsnooze] Error:', err)
    return NextResponse.json({ error: 'Failed to unsnooze email' }, { status: 500 })
  }
}
