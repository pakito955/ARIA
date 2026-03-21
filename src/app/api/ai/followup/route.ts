import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateFollowUp } from '@/agents/followUpAgent'
import { decrypt } from '@/lib/encryption'
import { GmailProvider } from '@/lib/providers/gmail'
import { OutlookProvider } from '@/lib/providers/outlook'
import { z } from 'zod'

const schema = z.object({ emailId: z.string() })

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = schema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: 'emailId required' }, { status: 400 })

  const email = await prisma.email.findFirst({
    where: { id: body.data.emailId, userId: session.user.id },
  })
  if (!email) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const daysAgo = Math.floor(
    (Date.now() - email.receivedAt.getTime()) / (1000 * 60 * 60 * 24)
  )

  const followUpText = await generateFollowUp(
    email.fromName || email.fromEmail,
    email.subject,
    daysAgo
  )

  // Send via provider
  const integration = await prisma.integration.findFirst({
    where: { userId: session.user.id, provider: email.provider, isActive: true },
  })
  if (!integration) return NextResponse.json({ error: 'No integration' }, { status: 400 })

  const accessToken = decrypt(integration.accessToken)

  if (email.provider === 'GMAIL') {
    const gmail = new GmailProvider(
      accessToken,
      integration.refreshToken ? decrypt(integration.refreshToken) : undefined
    )
    await gmail.sendEmail({
      to: [email.fromEmail],
      subject: `Re: ${email.subject}`,
      body: followUpText,
      threadId: email.threadId ?? undefined,
    })
  } else {
    const outlook = new OutlookProvider(accessToken)
    await outlook.sendEmail({
      to: [email.fromEmail],
      subject: `Re: ${email.subject}`,
      body: followUpText,
    })
  }

  return NextResponse.json({ success: true, followUpText })
}
