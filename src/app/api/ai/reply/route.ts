import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/authOrToken'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encryption'
import { GmailProvider } from '@/lib/providers/gmail'
import { OutlookProvider } from '@/lib/providers/outlook'
import { z } from 'zod'

const sendSchema = z.object({
  emailId: z.string(),
  replyText: z.string().min(1),
  style: z.enum(['short', 'professional', 'friendly']).optional(),
})

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = sendSchema.safeParse(await req.json())
  if (!body.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { emailId, replyText } = body.data

  const email = await prisma.email.findFirst({
    where: { id: emailId, userId: user.id },
  })
  if (!email) {
    return NextResponse.json({ error: 'Email not found' }, { status: 404 })
  }

  // Get integration for this email provider
  const integration = await prisma.integration.findFirst({
    where: { userId: user.id, provider: email.provider, isActive: true },
  })
  if (!integration) {
    return NextResponse.json({ error: 'No active integration found' }, { status: 400 })
  }

  const accessToken = decrypt(integration.accessToken)

  // Send via correct provider
  if (email.provider === 'GMAIL') {
    const gmail = new GmailProvider(
      accessToken,
      integration.refreshToken ? decrypt(integration.refreshToken) : undefined
    )
    await gmail.sendEmail({
      to: [email.fromEmail],
      subject: `Re: ${email.subject}`,
      body: replyText,
      replyToId: email.externalId,
      threadId: email.threadId ?? undefined,
    })
  } else {
    const outlook = new OutlookProvider(accessToken)
    await outlook.sendEmail({
      to: [email.fromEmail],
      subject: `Re: ${email.subject}`,
      body: replyText,
      replyToId: email.externalId,
    })
  }

  // Save sent email to database so it appears in Sent folder
  try {
    await prisma.email.create({
      data: {
        userId: user.id,
        externalId: `sent_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        provider: email.provider,
        threadId: email.threadId,
        subject: `Re: ${email.subject}`,
        bodyText: replyText,
        bodyHtml: `<div>${replyText.replace(/\n/g, '<br>')}</div>`,
        fromEmail: user.email || 'me',
        fromName: user.name || 'Me',
        toEmails: JSON.stringify([email.fromEmail]),
        ccEmails: JSON.stringify([]),
        isRead: true,
        folder: 'SENT',
        receivedAt: new Date(),
      },
    })
  } catch (err) {
    console.error('[Reply] Failed to save sent copy:', err)
    // Non-critical — email was already sent
  }

  // Mark original as read
  await prisma.email.update({
    where: { id: emailId },
    data: { isRead: true },
  })

  // Fire-and-forget: ingest sent email into knowledge base
  fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/knowledge/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-internal-key': process.env.INTERNAL_API_KEY || 'aria-internal' },
    body: JSON.stringify({
      userId: user.id,
      type: 'SENT',
      subject: `Re: ${email.subject}`,
      body: replyText,
      fromEmail: user.email || 'me',
      toEmail: email.fromEmail,
    }),
  }).catch(() => {})

  return NextResponse.json({ success: true })
}
