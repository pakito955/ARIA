import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/authOrToken'
import { prisma } from '@/lib/prisma'
import { sendSlackMessage } from '@/lib/slack'

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { emailId, webhookUrl: bodyWebhookUrl } = body

    if (!emailId) {
      return NextResponse.json({ error: 'emailId required' }, { status: 400 })
    }

    const email = await prisma.email.findFirst({
      where: { id: emailId, userId: user.id },
      include: { analysis: true },
    })

    if (!email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 })
    }

    const webhookUrl = process.env.SLACK_WEBHOOK_URL || bodyWebhookUrl

    if (!webhookUrl) {
      return NextResponse.json({ error: 'No Slack webhook URL configured' }, { status: 400 })
    }

    const summary = email.analysis?.summary || email.bodyText.slice(0, 200)
    const priority = email.analysis?.priority || 'MEDIUM'
    const category = email.analysis?.category || 'INFO'

    const blocks = [
      {
        type: 'header',
        text: { type: 'plain_text', text: `Email: ${email.subject.slice(0, 80)}`, emoji: true },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*From:* ${email.fromName || email.fromEmail}` },
          { type: 'mrkdwn', text: `*Priority:* ${priority}` },
          { type: 'mrkdwn', text: `*Category:* ${category}` },
        ],
      },
      { type: 'divider' },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: summary },
      },
    ]

    const text = `New email from ${email.fromName || email.fromEmail}: ${email.subject}`
    const ok = await sendSlackMessage(webhookUrl, text, blocks)

    if (!ok) {
      return NextResponse.json({ error: 'Failed to send Slack message' }, { status: 502 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Slack Send] Error:', err)
    return NextResponse.json({ error: 'Failed to send to Slack' }, { status: 500 })
  }
}
