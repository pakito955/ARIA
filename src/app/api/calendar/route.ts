import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/authOrToken'
import { prisma } from '@/lib/prisma'
import { GmailProvider } from '@/lib/providers/gmail'
import { OutlookProvider } from '@/lib/providers/outlook'
import { decrypt } from '@/lib/encryption'

export async function POST(req: Request) {
  try {
    const user = await getAuthUser(req as any)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { title, startTime, endTime, emailId } = body

    if (!title || !startTime || !endTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    let externalId = null
    let provider = null

    // Try to sync with actual provider if integration exists
    const integration = await prisma.integration.findFirst({
      where: { userId: user.id, isActive: true }
    })

    if (integration) {
      try {
        const accessToken = decrypt(integration.accessToken)
        const refreshToken = integration.refreshToken ? decrypt(integration.refreshToken) : undefined
        provider = integration.provider

        if (integration.provider === 'GMAIL') {
          const api = new GmailProvider(accessToken, refreshToken)
          const event = await api.createCalendarEvent({
            title,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            description: `Created via ARIA AI Assistant from Email ID: ${emailId || 'unknown'}`,
            participants: []
          })
          externalId = event.id
        } else if (integration.provider === 'OUTLOOK') {
          const api = new OutlookProvider(accessToken, refreshToken, async (newToken) => {
            const { encrypt } = await import('@/lib/encryption')
            await prisma.integration.update({
              where: { id: integration.id },
              data: { accessToken: encrypt(newToken) }
            })
          })
          const event = await api.createCalendarEvent({
            title,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            description: `Created via ARIA AI Assistant from Email ID: ${emailId || 'unknown'}`,
            participants: []
          })
          externalId = event.id
        }
      } catch (err: any) {
        console.warn('Failed to sync event with provider, saving locally only:', err.message)
      }
    }

    const event = await prisma.calendarEvent.create({
      data: {
        userId: user.id,
        title,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        externalId,
        provider,
        ariaCreated: true,
      }
    })

    return NextResponse.json(event)
  } catch (error: any) {
    console.error('Calendar booking POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
