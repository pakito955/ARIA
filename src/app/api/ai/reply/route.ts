import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
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
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = sendSchema.safeParse(await req.json())
  if (!body.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { emailId, replyText } = body.data

  const email = await prisma.email.findFirst({
    where: { id: emailId, userId: session.user.id },
  })
  if (!email) {
    return NextResponse.json({ error: 'Email not found' }, { status: 404 })
  }

  // Get integration for this email provider
  const integration = await prisma.integration.findFirst({
    where: { userId: session.user.id, provider: email.provider, isActive: true },
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

  // Mark original as read
  await prisma.email.update({
    where: { id: emailId },
    data: { isRead: true },
  })

  return NextResponse.json({ success: true })
}
