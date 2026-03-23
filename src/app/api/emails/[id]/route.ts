import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/authOrToken'
import { prisma } from '@/lib/prisma'
import { decrypt, encrypt } from '@/lib/encryption'
import { GmailProvider } from '@/lib/providers/gmail'

type RouteCtx = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: RouteCtx) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const email = await prisma.email.findFirst({
    where: { id, userId: user.id },
    include: {
      analysis: true,
      tasks: { select: { id: true, title: true, status: true, priority: true } },
    },
  })

  if (!email) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Mark as read without blocking the response
  if (!email.isRead) {
    prisma.email.update({ where: { id }, data: { isRead: true } }).catch(() => {})
    // Also mark on provider in the background
    markReadOnProvider(user.id, email.externalId, email.provider).catch(() => {})
  }

  return NextResponse.json({ data: { ...email, isRead: true } })
}

export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  const user2 = await getAuthUser(req)
  if (!user2) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json().catch(() => ({}))

  const ALLOWED_FIELDS = ['isRead', 'isStarred', 'isSnoozed', 'snoozeUntil'] as const
  const updates: Record<string, unknown> = {}
  for (const key of ALLOWED_FIELDS) {
    if (key in body) updates[key] = body[key]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const updated = await prisma.email.updateMany({
    where: { id, userId: user2.id },
    data: updates,
  })

  if (updated.count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ success: true })
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getGmailProvider(userId: string) {
  const integration = await prisma.integration.findFirst({
    where: { userId, provider: 'GMAIL', isActive: true },
  })
  if (!integration) return null

  const gmail = new GmailProvider(
    decrypt(integration.accessToken),
    integration.refreshToken ? decrypt(integration.refreshToken) : undefined,
    async (newToken) => {
      await prisma.integration.update({
        where: { id: integration.id },
        data: { accessToken: encrypt(newToken) },
      })
    }
  )
  return gmail
}

async function markReadOnProvider(userId: string, externalId: string, provider: string) {
  if (provider !== 'GMAIL') return
  const gmail = await getGmailProvider(userId)
  await gmail?.markAsRead(externalId)
}

