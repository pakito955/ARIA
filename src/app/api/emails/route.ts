import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encryption'
import { GmailProvider } from '@/lib/providers/gmail'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const filter = searchParams.get('filter') || 'all'
  const search = searchParams.get('search') || ''
  const limit = parseInt(searchParams.get('limit') || '50')
  const sort = searchParams.get('sort') || 'newest'

  const userId = session.user.id

  // ── 1. Sync fresh emails from Gmail ────────────────────────────────
  const integration = await prisma.integration.findFirst({
    where: { userId, provider: 'GMAIL', isActive: true },
  })

  if (integration) {
    try {
      const accessToken = decrypt(integration.accessToken)
      const refreshToken = integration.refreshToken
        ? decrypt(integration.refreshToken)
        : undefined

      const gmail = new GmailProvider(accessToken, refreshToken)

      // Fetch latest 30 emails from Gmail
      const freshEmails = await gmail.fetchEmails({
        limit: 30,
        since: integration.lastSyncAt ?? undefined,
      })

      // Upsert into local DB
      for (const email of freshEmails) {
        await prisma.email.upsert({
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
            bodyText: email.bodyText.slice(0, 10000),
            bodyHtml: email.bodyHtml?.slice(0, 50000),
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
          },
        })
      }

      // Update last sync time
      await prisma.integration.update({
        where: { id: integration.id },
        data: { lastSyncAt: new Date() },
      })
    } catch (err) {
      console.error('[Emails] Sync error:', err)
      // Continue — return cached emails from DB
    }
  }

  // ── 2. Query from local DB ─────────────────────────────────────────
  const where: any = { userId }

  if (filter === 'unread') where.isRead = false
  else if (filter === 'starred') where.isStarred = true
  else if (filter === 'critical') where.analysis = { priority: 'CRITICAL' }
  else if (filter === 'meeting') where.analysis = { category: 'MEETING' }
  else if (filter === 'task') where.analysis = { category: 'TASK' }
  else if (filter === 'spam') where.analysis = { category: 'SPAM' }

  if (search) {
    where.OR = [
      { subject: { contains: search } },
      { fromEmail: { contains: search } },
      { fromName: { contains: search } },
    ]
  }

  const orderBy: any =
    sort === 'priority'
      ? [{ analysis: { urgencyScore: 'desc' } }, { receivedAt: 'desc' }]
      : { receivedAt: sort === 'oldest' ? 'asc' : 'desc' }

  const [emails, total] = await Promise.all([
    prisma.email.findMany({
      where,
      include: { analysis: true },
      orderBy,
      take: limit,
    }),
    prisma.email.count({ where }),
  ])

  return NextResponse.json({ data: emails, total, hasMore: total > limit })
}
