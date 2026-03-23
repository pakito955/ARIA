import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/authOrToken'
import { prisma } from '@/lib/prisma'
import { decrypt, encrypt } from '@/lib/encryption'
import { GmailProvider } from '@/lib/providers/gmail'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const userId = user.id

  const email = await prisma.email.findFirst({
    where: { id, userId },
    select: { externalId: true, provider: true },
  })

  if (!email) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Mark as read in DB immediately
  await prisma.email.update({ where: { id }, data: { isRead: true } })

  // Archive on provider in background (non-blocking)
  if (email.provider === 'GMAIL') {
    archiveOnGmail(userId, email.externalId).catch((err) =>
      console.error('[Archive] Gmail error:', err)
    )
  }

  return NextResponse.json({ success: true })
}

async function archiveOnGmail(userId: string, externalId: string) {
  const integration = await prisma.integration.findFirst({
    where: { userId, provider: 'GMAIL', isActive: true },
  })
  if (!integration) return

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

  await gmail.archiveEmail(externalId)
}
