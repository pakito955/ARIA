import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encryption'
import { GmailProvider } from '@/lib/providers/gmail'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { title, description, startTime, endTime, participants = [] } = body

  if (!title || !startTime || !endTime) {
    return NextResponse.json({ error: 'title, startTime, endTime are required' }, { status: 400 })
  }

  const integration = await prisma.integration.findFirst({
    where: { userId: session.user.id, provider: 'GMAIL', isActive: true },
  })

  if (!integration) {
    return NextResponse.json({ error: 'No active Gmail integration' }, { status: 400 })
  }

  const gmail = new GmailProvider(
    decrypt(integration.accessToken),
    integration.refreshToken ? decrypt(integration.refreshToken) : undefined,
    async (newToken) => {
      await prisma.integration.update({
        where: { id: integration.id },
        data: { accessToken: newToken },
      })
    }
  )

  const event = await gmail.createCalendarEvent({
    title,
    description: description || '',
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    participants,
  })

  return NextResponse.json({ success: true, event })
}
