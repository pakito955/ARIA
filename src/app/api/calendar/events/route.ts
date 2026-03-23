import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt, encrypt } from '@/lib/encryption'
import { GmailProvider } from '@/lib/providers/gmail'

async function getGmailProvider(userId: string) {
  const integration = await prisma.integration.findFirst({
    where: { userId, provider: 'GMAIL', isActive: true },
  })
  if (!integration) return { gmail: null, integration: null }

  const gmail = new GmailProvider(
    decrypt(integration.accessToken),
    integration.refreshToken ? decrypt(integration.refreshToken) : undefined,
    async (newToken) => {
      // Always encrypt the refreshed token before storing
      await prisma.integration.update({
        where: { id: integration.id },
        data: { accessToken: encrypt(newToken) },
      })
    }
  )
  return { gmail, integration }
}

// GET /api/calendar/events — fetch upcoming events from Google Calendar
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : new Date()
  const to = searchParams.get('to')
    ? new Date(searchParams.get('to')!)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const { gmail } = await getGmailProvider(session.user.id)

  if (!gmail) {
    // Return DB-cached events if no integration
    const cached = await prisma.calendarEvent.findMany({
      where: {
        userId: session.user.id,
        startTime: { gte: from },
        endTime: { lte: to },
      },
      orderBy: { startTime: 'asc' },
    })
    return NextResponse.json({ events: cached, source: 'cache' })
  }

  try {
    const events = await gmail.getCalendarEvents(from, to)

    // Upsert into local DB for offline availability (best-effort)
    const userId = session.user!.id!
    await Promise.all(
      events.map((ev) => {
        const eventId = ev.externalId || ev.id
        if (!eventId) return null
        return prisma.calendarEvent.upsert({
          where: { id: eventId },
          create: {
            id: eventId,
            userId,
            externalId: ev.externalId,
            provider: 'GMAIL',
            title: ev.title,
            description: ev.description,
            startTime: ev.startTime,
            endTime: ev.endTime,
            location: ev.location,
            meetingUrl: ev.meetingUrl,
            participants: JSON.stringify(ev.participants),
          },
          update: {
            title: ev.title,
            description: ev.description,
            startTime: ev.startTime,
            endTime: ev.endTime,
            location: ev.location,
            meetingUrl: ev.meetingUrl,
          },
        }).catch(() => null)
      })
    )

    return NextResponse.json({ events, source: 'live' })
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: { message?: string } }; status?: number }; message?: string }
    const msg = e?.response?.data?.error?.message || e?.message || 'Failed to fetch calendar events'
    console.error('[Calendar] GET error:', msg)

    // Fall back to DB cache on error
    const cached = await prisma.calendarEvent.findMany({
      where: { userId: session.user.id, startTime: { gte: from }, endTime: { lte: to } },
      orderBy: { startTime: 'asc' },
    })
    return NextResponse.json({ events: cached, source: 'cache', warning: msg })
  }
}

// POST /api/calendar/events — create a new calendar event
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { title, description, startTime, endTime, participants = [] } = body

  if (!title || !startTime || !endTime) {
    return NextResponse.json(
      { error: 'title, startTime, and endTime are required' },
      { status: 400 }
    )
  }

  // Validate dates
  const start = new Date(startTime)
  const end = new Date(endTime)
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return NextResponse.json({ error: 'Invalid startTime or endTime' }, { status: 400 })
  }
  if (end <= start) {
    return NextResponse.json({ error: 'endTime must be after startTime' }, { status: 400 })
  }

  const userId = session.user!.id!
  const { gmail } = await getGmailProvider(userId)

  if (!gmail) {
    return NextResponse.json({ error: 'No active Gmail integration. Connect Gmail first.' }, { status: 400 })
  }

  try {
    const event = await gmail.createCalendarEvent({
      title,
      description: description || '',
      startTime: start,
      endTime: end,
      participants: Array.isArray(participants) ? participants : [],
    })

    // Persist locally
    await prisma.calendarEvent.create({
      data: {
        id: event.externalId || event.id,
        userId,
        externalId: event.externalId,
        provider: 'GMAIL',
        title: event.title,
        description: description || undefined,
        startTime: start,
        endTime: end,
        meetingUrl: event.meetingUrl,
        participants: JSON.stringify(participants),
        ariaCreated: true,
      },
    }).catch(() => {}) // non-critical

    return NextResponse.json({ success: true, event })
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: { message?: string } }; status?: number }; code?: number; message?: string }
    const googleMsg = e?.response?.data?.error?.message || e?.message || 'Failed to create calendar event'
    const status = e?.response?.status || (typeof e?.code === 'number' ? e.code : 500)
    return NextResponse.json({ error: googleMsg }, { status: status >= 400 ? status : 500 })
  }
}
