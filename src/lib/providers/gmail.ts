import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
import type {
  EmailProviderInterface,
  UnifiedEmail,
  FetchEmailsOptions,
  SendEmailOptions,
  Thread,
  CalendarEvent,
  CreateCalendarEventOptions,
} from '@/types'

export class GmailProvider implements EmailProviderInterface {
  readonly provider = 'GMAIL' as const
  private auth: OAuth2Client

  public newAccessToken: string | null = null

  constructor(
    accessToken: string,
    refreshToken?: string,
    onTokenRefresh?: (newToken: string) => void
  ) {
    this.auth = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    )
    this.auth.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    })
    this.auth.on('tokens', (tokens) => {
      if (tokens.access_token) {
        this.newAccessToken = tokens.access_token
        onTokenRefresh?.(tokens.access_token)
      }
    })
  }

  async archiveEmail(externalId: string): Promise<void> {
    await this.gmail().users.messages.modify({
      userId: 'me',
      id: externalId,
      requestBody: { removeLabelIds: ['INBOX'] },
    })
  }

  private gmail() {
    return google.gmail({ version: 'v1', auth: this.auth })
  }

  private calendar() {
    return google.calendar({ version: 'v3', auth: this.auth })
  }

  // ─── Emails ──────────────────────────────────────────────────────────────────

  async fetchEmails(options: FetchEmailsOptions = {}): Promise<UnifiedEmail[]> {
    const { limit = 50, pageToken, query = '', since } = options

    let q = query
    if (since) {
      const unixTs = Math.floor(since.getTime() / 1000)
      q += ` after:${unixTs}`
    }

    const list = await this.gmail().users.messages.list({
      userId: 'me',
      maxResults: limit,
      pageToken,
      q: q.trim() || 'in:inbox',
      labelIds: options.labelIds,
    })

    const messageIds = list.data.messages || []
    if (!messageIds.length) return []

    // Batch fetch messages in parallel (max 10 at a time)
    const chunks = chunkArray(messageIds, 10)
    const allMessages: UnifiedEmail[] = []

    for (const chunk of chunks) {
      const messages = await Promise.all(
        chunk.map((m) => this.fetchEmail(m.id!))
      )
      allMessages.push(...messages.filter(Boolean) as UnifiedEmail[])
    }

    return allMessages
  }

  async fetchEmail(externalId: string): Promise<UnifiedEmail | null> {
    try {
      const msg = await this.gmail().users.messages.get({
        userId: 'me',
        id: externalId,
        format: 'full',
      })

      return parseGmailMessage(msg.data)
    } catch (err) {
      console.error(`[Gmail] Failed to fetch message ${externalId}:`, err)
      return null
    }
  }

  async sendEmail(options: SendEmailOptions): Promise<void> {
    const { to, cc, subject, body, html, replyToId, threadId } = options

    let rawMessage: string

    if (replyToId) {
      // Fetch the original message to get In-Reply-To header
      const orig = await this.gmail().users.messages.get({
        userId: 'me',
        id: replyToId,
        format: 'metadata',
        metadataHeaders: ['Message-ID', 'Subject'],
      })
      const origMsgId = orig.data.payload?.headers?.find(
        (h) => h.name === 'Message-ID'
      )?.value

      rawMessage = buildMimeMessage({
        to: to.join(', '),
        cc: cc?.join(', '),
        subject,
        body: html || body,
        inReplyTo: origMsgId ?? undefined,
        references: origMsgId ?? undefined,
        isHtml: !!html,
      })
    } else {
      rawMessage = buildMimeMessage({
        to: to.join(', '),
        cc: cc?.join(', '),
        subject,
        body: html || body,
        isHtml: !!html,
      })
    }

    const encoded = Buffer.from(rawMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    await this.gmail().users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encoded,
        threadId,
      },
    })
  }

  async markAsRead(externalId: string): Promise<void> {
    await this.gmail().users.messages.modify({
      userId: 'me',
      id: externalId,
      requestBody: { removeLabelIds: ['UNREAD'] },
    })
  }

  async fetchThreads(limit = 20): Promise<Thread[]> {
    const list = await this.gmail().users.threads.list({
      userId: 'me',
      maxResults: limit,
      labelIds: ['INBOX'],
    })

    const threads = list.data.threads || []
    if (!threads.length) return []

    // Parallel fetch — eliminates N+1
    const threadDetails = await Promise.all(
      threads.map((t) =>
        this.gmail().users.threads.get({
          userId: 'me',
          id: t.id!,
          format: 'metadata',
          metadataHeaders: ['Subject', 'From', 'Date'],
        }).catch(() => null)
      )
    )

    return threadDetails
      .filter(Boolean)
      .map((thread) => {
        const msgs = thread!.data.messages || []
        const lastMsg = msgs[msgs.length - 1]
        const headers = lastMsg?.payload?.headers || []
        const getHeader = (name: string) =>
          headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || ''

        const participants = [
          ...new Set(
            msgs.map((m) => {
              const from = m.payload?.headers?.find(
                (h) => h.name?.toLowerCase() === 'from'
              )?.value || ''
              return extractEmail(from)
            })
          ),
        ].filter(Boolean)

        return {
          id: thread!.data.id!,
          externalId: thread!.data.id!,
          subject: getHeader('Subject') || '(No subject)',
          participants,
          messageCount: msgs.length,
          lastEmailAt: new Date(parseInt(lastMsg?.internalDate || '0')),
        }
      })
  }

  async getHistoryId(): Promise<string> {
    const profile = await this.gmail().users.getProfile({ userId: 'me' })
    return profile.data.historyId || ''
  }

  // ─── Calendar ─────────────────────────────────────────────────────────────────

  async getCalendarEvents(from: Date, to: Date): Promise<CalendarEvent[]> {
    const res = await this.calendar().events.list({
      calendarId: 'primary',
      timeMin: from.toISOString(),
      timeMax: to.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 50,
    })

    return (res.data.items || []).map((e) => ({
      id: e.id || '',
      externalId: e.id || '',
      title: e.summary || '(No title)',
      description: e.description || undefined,
      startTime: new Date(e.start?.dateTime || e.start?.date || ''),
      endTime: new Date(e.end?.dateTime || e.end?.date || ''),
      location: e.location || undefined,
      meetingUrl: e.hangoutLink || extractMeetingUrl(e.description || ''),
      participants: (e.attendees || []).map((a) => a.email || '').filter(Boolean),
    }))
  }

  async createCalendarEvent(options: CreateCalendarEventOptions): Promise<CalendarEvent> {
    const { title, description, startTime, endTime, participants } = options

    const event = await this.calendar().events.insert({
      calendarId: 'primary',
      sendNotifications: true,
      requestBody: {
        summary: title,
        description,
        start: { dateTime: startTime.toISOString() },
        end: { dateTime: endTime.toISOString() },
        attendees: participants.map((email) => ({ email })),
        conferenceData: {
          createRequest: {
            requestId: `aria-${Date.now()}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      },
      conferenceDataVersion: 1,
    })

    return {
      id: event.data.id || '',
      externalId: event.data.id || '',
      title: event.data.summary || title,
      startTime,
      endTime,
      meetingUrl: event.data.hangoutLink || undefined,
      participants,
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseGmailMessage(msg: any): UnifiedEmail | null {
  if (!msg) return null

  const headers = msg.payload?.headers || []
  const getHeader = (name: string) =>
    headers.find((h: any) => h.name?.toLowerCase() === name.toLowerCase())?.value || ''

  const subject = getHeader('subject') || '(No subject)'
  const from = getHeader('from')
  const to = getHeader('to').split(',').map((e: string) => e.trim()).filter(Boolean)
  const cc = getHeader('cc').split(',').map((e: string) => e.trim()).filter(Boolean)
  const date = getHeader('date')

  const { bodyText, bodyHtml } = extractBody(msg.payload)

  const labels = msg.labelIds || []
  const isUnread = labels.includes('UNREAD')

  return {
    id: msg.id,
    userId: '',
    provider: 'GMAIL',
    externalId: msg.id,
    threadId: msg.threadId,
    subject,
    bodyText,
    bodyHtml,
    fromEmail: extractEmail(from),
    fromName: extractName(from),
    toEmails: to,
    ccEmails: cc,
    isRead: !isUnread,
    isStarred: labels.includes('STARRED'),
    isSnoozed: false,
    labels,
    hasAttachments: checkAttachments(msg.payload),
    receivedAt: date ? new Date(date) : new Date(parseInt(msg.internalDate || '0')),
  }
}

function extractBody(payload: any): { bodyText: string; bodyHtml: string } {
  if (!payload) return { bodyText: '', bodyHtml: '' }

  let bodyText = ''
  let bodyHtml = ''

  const decode = (data: string) =>
    Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8')

  function walk(part: any) {
    if (!part) return
    const mime = part.mimeType || ''

    if (mime === 'text/plain' && part.body?.data) {
      bodyText = decode(part.body.data)
    } else if (mime === 'text/html' && part.body?.data) {
      bodyHtml = decode(part.body.data)
    } else if (part.parts) {
      part.parts.forEach(walk)
    }
  }

  walk(payload)

  // Fallback: decode top-level body
  if (!bodyText && !bodyHtml && payload.body?.data) {
    const text = decode(payload.body.data)
    if (payload.mimeType === 'text/html') bodyHtml = text
    else bodyText = text
  }

  // Strip HTML to text if no plain text
  if (!bodyText && bodyHtml) {
    bodyText = bodyHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  }

  return { bodyText, bodyHtml }
}

function checkAttachments(payload: any): boolean {
  if (!payload?.parts) return false
  return payload.parts.some(
    (p: any) => p.filename && p.filename.length > 0
  )
}

function extractEmail(from: string): string {
  const match = from.match(/<(.+?)>/)
  return match ? match[1] : from.trim()
}

function extractName(from: string): string {
  const match = from.match(/^(.+?)\s*</)
  return match ? match[1].replace(/"/g, '').trim() : ''
}

function extractMeetingUrl(text: string): string | undefined {
  const patterns = [
    /https:\/\/meet\.google\.com\/[a-z-]+/,
    /https:\/\/zoom\.us\/j\/\d+/,
    /https:\/\/teams\.microsoft\.com\/l\/meetup-join\/[^\s]+/,
  ]
  for (const p of patterns) {
    const m = text.match(p)
    if (m) return m[0]
  }
  return undefined
}

function buildMimeMessage(opts: {
  to: string
  cc?: string
  subject: string
  body: string
  inReplyTo?: string
  references?: string
  isHtml?: boolean
}): string {
  const lines = [
    `To: ${opts.to}`,
    opts.cc ? `Cc: ${opts.cc}` : '',
    `Subject: ${opts.subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: ${opts.isHtml ? 'text/html' : 'text/plain'}; charset=UTF-8`,
    opts.inReplyTo ? `In-Reply-To: ${opts.inReplyTo}` : '',
    opts.references ? `References: ${opts.references}` : '',
    '',
    opts.body,
  ].filter((l) => l !== null)

  return lines.join('\r\n')
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}
