// PATCH /api/queue/[id]  — approve or reject a draft
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/authOrToken'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encryption'
import { GmailProvider } from '@/lib/providers/gmail'

const db = prisma as any

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { action } = await req.json() // 'approve' | 'reject'

  const draft = await db.draftEmail.findFirst({
    where: { id, userId: user.id },
  })
  if (!draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
  if (draft.status !== 'PENDING') {
    return NextResponse.json({ error: 'Draft already processed' }, { status: 409 })
  }

  if (action === 'reject') {
    await db.draftEmail.update({
      where: { id },
      data: { status: 'REJECTED' },
    })
    return NextResponse.json({ success: true, status: 'REJECTED' })
  }

  if (action === 'approve') {
    // Send the email via Gmail
    const integration = await prisma.integration.findFirst({
      where: { userId: user.id, provider: 'GMAIL', isActive: true },
    })

    if (integration) {
      try {
        const accessToken = decrypt(integration.accessToken)
        const gmail = new GmailProvider(
          accessToken,
          integration.refreshToken ? decrypt(integration.refreshToken) : undefined
        )
        await gmail.sendEmail({
          to: [draft.toEmail],
          subject: draft.subject,
          body: draft.body,
        })
        await db.draftEmail.update({
          where: { id },
          data: { status: 'SENT', sentAt: new Date() },
        })
        return NextResponse.json({ success: true, status: 'SENT' })
      } catch (err) {
        console.error('[Queue] Send failed:', err)
        // Mark approved but not sent so user can retry
        await db.draftEmail.update({
          where: { id },
          data: { status: 'APPROVED' },
        })
        return NextResponse.json({ success: true, status: 'APPROVED', warning: 'Send failed — marked approved' })
      }
    } else {
      // No integration — just mark approved
      await db.draftEmail.update({
        where: { id },
        data: { status: 'APPROVED' },
      })
      return NextResponse.json({ success: true, status: 'APPROVED' })
    }
  }

  return NextResponse.json({ error: 'Invalid action. Use "approve" or "reject".' }, { status: 400 })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const deleted = await db.draftEmail.deleteMany({ where: { id, userId: user.id } })
  if (deleted.count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ success: true })
}
