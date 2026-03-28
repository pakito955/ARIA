import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/authOrToken'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encryption'
import { GmailProvider } from '@/lib/providers/gmail'
import { OutlookProvider } from '@/lib/providers/outlook'
import { z } from 'zod'

const sendSchema = z.object({
  to: z.string().min(1),
  subject: z.string().min(1),
  body: z.string().min(1),
  cc: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = sendSchema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: 'Invalid request', details: body.error.flatten() }, { status: 400 })

  const { to, subject, body: emailBody, cc } = body.data

  const integration = await prisma.integration.findFirst({
    where: { userId: user.id, isActive: true },
    orderBy: { createdAt: 'desc' },
  })

  if (!integration) {
    return NextResponse.json({ error: 'No active email integration. Connect Gmail or Outlook in Settings.' }, { status: 400 })
  }

  const accessToken = decrypt(integration.accessToken)

  try {
    if (integration.provider === 'GMAIL') {
      const gmail = new GmailProvider(
        accessToken,
        integration.refreshToken ? decrypt(integration.refreshToken) : undefined
      )
      await gmail.sendEmail({
        to: [to],
        subject,
        body: emailBody,
        cc: cc ? [cc] : undefined,
      })
    } else {
      const outlook = new OutlookProvider(accessToken)
      await outlook.sendEmail({
        to: [to],
        subject,
        body: emailBody,
        cc: cc ? [cc] : undefined,
      })
    }

    // Save sent email to database
    const sentRecord = await prisma.email.create({
      data: {
        userId: user.id,
        externalId: `sent_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        provider: integration.provider,
        subject,
        bodyText: emailBody,
        bodyHtml: `<div>${emailBody.replace(/\n/g, '<br>')}</div>`,
        fromEmail: user.email || 'me',
        fromName: user.name || 'Me',
        toEmails: JSON.stringify([to]),
        ccEmails: JSON.stringify(cc ? [cc] : []),
        isRead: true,
        folder: 'SENT',
        receivedAt: new Date(),
      },
    })

    // Fire-and-forget: ingest into knowledge base
    fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/knowledge/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-key': process.env.INTERNAL_API_KEY || 'aria-internal' },
      body: JSON.stringify({
        userId: user.id,
        type: 'SENT',
        subject,
        body: emailBody,
        fromEmail: user.email || 'me',
        toEmail: to,
      }),
    }).catch(() => {})

    return NextResponse.json({ success: true, emailId: sentRecord.id })
  } catch (err: any) {
    console.error('[Send] Error:', err)
    return NextResponse.json({ error: err.message || 'Failed to send email' }, { status: 500 })
  }
}
