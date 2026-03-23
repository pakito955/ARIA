import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

// GET — list tokens for current user
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tokens = await prisma.extensionToken.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    select: { id: true, label: true, lastUsedAt: true, createdAt: true },
  })

  return NextResponse.json({ tokens })
}

// POST — generate a new token
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const label = (body.label as string)?.trim() || 'Chrome Extension'

  // Limit to 5 tokens per user
  const count = await prisma.extensionToken.count({ where: { userId: session.user.id } })
  if (count >= 5) {
    return NextResponse.json({ error: 'Token limit reached (max 5). Revoke an existing token first.' }, { status: 400 })
  }

  const token = randomBytes(32).toString('hex') // 64-char hex string

  const record = await prisma.extensionToken.create({
    data: { userId: session.user.id, token, label },
    select: { id: true, token: true, label: true, createdAt: true },
  })

  return NextResponse.json({ token: record })
}

// DELETE — revoke a token by id
export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await req.json().catch(() => ({}))
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  await prisma.extensionToken.deleteMany({
    where: { id, userId: session.user.id },
  })

  return NextResponse.json({ ok: true })
}
