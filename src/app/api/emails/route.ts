import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt, encrypt } from '@/lib/encryption'
import { GmailProvider } from '@/lib/providers/gmail'

// How old (ms) the sync cursor must be before a background sync fires
const SYNC_INTERVAL_MS = 3 * 60 * 1000 // 3 minutes

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const filter = searchParams.get('filter') || 'all'
  const search = searchParams.get('search') || ''
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
  const sort = searchParams.get('sort') || 'newest'
  const forceSync = searchParams.get('sync') === 'true'

  const userId = session.user.id

  // ── 1. Background sync — only if stale (non-blocking) ──────────────
  const integration = await prisma.integration.findFirst({
    where: { userId, provider: 'GMAIL', isActive: true },
    select: { id: true, accessToken: true, refreshToken: true, lastSyncAt: true },
  })

  if (integration) {
    const stale = !integration.lastSyncAt ||
      Date.now() - integration.lastSyncAt.getTime() > SYNC_INTERVAL_MS

    if (stale || forceSync) {
      // Fire-and-forget — do not await
      syncGmailEmails(userId, integration).catch((err) =>
        console.error('[Emails] Background sync error:', err)
      )
    }
  }

  // ── 2. Build filter query ──────────────────────────────────────────
  const where: Record<string, unknown> = { userId }

  switch (filter) {
    case 'unread':   where.isRead = false; break
    case 'starred':  where.isStarred = true; break
    case 'critical': where.analysis = { is: { priority: 'CRITICAL' } }; break
    case 'meeting':  where.analysis = { is: { category: 'MEETING' } }; break
    case 'task':     where.analysis = { is: { category: 'TASK' } }; break
    case 'spam':     where.analysis = { is: { category: 'SPAM' } }; break
    case 'waiting': {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      where.isRead = false
      where.receivedAt = { lt: twoDaysAgo }
      where.analysis = { isNot: { category: 'SPAM' } }
      break
    }
  }

  if (search) {
    where.OR = [
      { subject:   { contains: search, mode: 'insensitive' } },
      { fromEmail: { contains: search, mode: 'insensitive' } },
      { fromName:  { contains: search, mode: 'insensitive' } },
    ]
  }

  const orderBy =
    sort === 'priority'
      ? [{ analysis: { urgencyScore: 'desc' as const } }, { receivedAt: 'desc' as const }]
      : { receivedAt: sort === 'oldest' ? ('asc' as const) : ('desc' as const) }

  // ── 3. Query local DB ──────────────────────────────────────────────
  const [emails, total] = await Promise.all([
    prisma.email.findMany({ where, include: { analysis: true }, orderBy, take: limit }),
    prisma.email.count({ where }),
  ])

  return NextResponse.json({ data: emails, total, hasMore: total > limit })
}

// ── Background sync helper ─────────────────────────────────────────────────

async function syncGmailEmails(
  userId: string,
  integration: { id: string; accessToken: string; refreshToken: string | null; lastSyncAt: Date | null }
) {
  const accessToken = decrypt(integration.accessToken)
  const refreshToken = integration.refreshToken ? decrypt(integration.refreshToken) : undefined

  const gmail = new GmailProvider(accessToken, refreshToken, async (newToken) => {
    await prisma.integration.update({
      where: { id: integration.id },
      data: { accessToken: encrypt(newToken) },
    })
  })

  // Only fetch since last sync; cap at 50 to avoid long operations
  const freshEmails = await gmail.fetchEmails({
    limit: 50,
    since: integration.lastSyncAt ?? undefined,
  })

  if (freshEmails.length > 0) {
    // Parallel upserts — much faster than sequential loop
    await Promise.all(
      freshEmails.map((email) =>
        prisma.email.upsert({
          where: {
            userId_provider_externalId: {
              userId,
              provider: 'GMAIL',
              externalId: email.externalId,
            },
          },
          create: {
            userId,
            provider: email.provider,
            externalId: email.externalId,
            subject: email.subject,
            bodyText: email.bodyText.slice(0, 10_000),
            bodyHtml: email.bodyHtml?.slice(0, 50_000),
            fromEmail: email.fromEmail,
            fromName: email.fromName,
            toEmails: JSON.stringify(email.toEmails ?? []),
            ccEmails: JSON.stringify(email.ccEmails ?? []),
            labels: JSON.stringify(email.labels ?? []),
            isRead: email.isRead,
            isStarred: email.isStarred,
            hasAttachments: email.hasAttachments,
            receivedAt: email.receivedAt,
          },
          update: {
            isRead: email.isRead,
            isStarred: email.isStarred,
            labels: JSON.stringify(email.labels ?? []),
          },
        })
      )
    )
  }

  await prisma.integration.update({
    where: { id: integration.id },
    data: { lastSyncAt: new Date() },
  })
}
