import { Client } from '@microsoft/microsoft-graph-client'
import type {
  EmailProviderInterface,
  UnifiedEmail,
  FetchEmailsOptions,
  SendEmailOptions,
  Thread,
  CalendarEvent,
  CreateCalendarEventOptions,
} from '@/types'

export class OutlookProvider implements EmailProviderInterface {
  readonly provider = 'OUTLOOK' as const
  private client: Client
  public newAccessToken: string | null = null

  constructor(
    private accessToken: string,
    private refreshToken?: string,
    private onTokenRefresh?: (newToken: string) => void
  ) {
    this.client = Client.init({
      authProvider: (done) => done(null, this.newAccessToken || this.accessToken),
    })
  }

  async refreshAccessToken(clientId: string, clientSecret: string, tenantId = 'common') {
    if (!this.refreshToken) return;

    try {
      const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'refresh_token',
          refresh_token: this.refreshToken,
        }),
      });

      if (!res.ok) throw new Error('Failed to refresh Outlook token');

      const data = await res.json();
      if (data.access_token) {
        this.newAccessToken = data.access_token;
        this.onTokenRefresh?.(data.access_token);
      }
    } catch (error) {
      console.error('[Outlook] Error refreshing token:', error);
    }
  }

  // ─── Emails ──────────────────────────────────────────────────────────────────

  async fetchEmails(options: FetchEmailsOptions = {}): Promise<UnifiedEmail[]> {
    const { limit = 50, pageToken, since } = options

    let url = `/me/mailFolders/inbox/messages?$top=${limit}&$orderby=receivedDateTime desc`

    if (since) {
      url += `&$filter=receivedDateTime gt ${since.toISOString()}`
    }

    if (pageToken) {
      url = pageToken // Outlook provides full URL for paging
    }

    const res = await this.client.api(url).get()
    const messages: any[] = res.value || []

    return messages.map(parseOutlookMessage).filter(Boolean) as UnifiedEmail[]
  }

  async fetchEmail(externalId: string): Promise<UnifiedEmail | null> {
    try {
      const msg = await this.client
        .api(`/me/messages/${externalId}`)
        .select('id,subject,body,bodyPreview,from,toRecipients,ccRecipients,isRead,isDraft,hasAttachments,receivedDateTime,conversationId,flag,categories')
        .get()

      return parseOutlookMessage(msg)
    } catch (err) {
      console.error(`[Outlook] Failed to fetch message ${externalId}:`, err)
      return null
    }
  }

  async sendEmail(options: SendEmailOptions): Promise<void> {
    const { to, cc, subject, body, html, replyToId } = options

    const message = {
      subject,
      body: {
        contentType: html ? 'HTML' : 'Text',
        content: html || body,
      },
      toRecipients: to.map((email) => ({ emailAddress: { address: email } })),
      ccRecipients: (cc || []).map((email) => ({
        emailAddress: { address: email },
      })),
    }

    if (replyToId) {
      await this.client
        .api(`/me/messages/${replyToId}/replyAll`)
        .post({ message })
    } else {
      await this.client.api('/me/sendMail').post({ message, saveToSentItems: true })
    }
  }

  async markAsRead(externalId: string): Promise<void> {
    await this.client
      .api(`/me/messages/${externalId}`)
      .patch({ isRead: true })
  }

  async fetchThreads(limit = 20): Promise<Thread[]> {
    const res = await this.client
      .api(`/me/mailFolders/inbox/messages?$top=${limit}&$orderby=receivedDateTime desc`)
      .select('conversationId,subject,from,toRecipients,receivedDateTime')
      .get()

    const seen = new Set<string>()
    const threads: Thread[] = []

    for (const msg of res.value || []) {
      if (seen.has(msg.conversationId)) continue
      seen.add(msg.conversationId)

      threads.push({
        id: msg.conversationId,
        externalId: msg.conversationId,
        subject: msg.subject || '(No subject)',
        participants: [
          msg.from?.emailAddress?.address,
          ...(msg.toRecipients || []).map(
            (r: any) => r.emailAddress?.address
          ),
        ].filter(Boolean),
        messageCount: 1,
        lastEmailAt: new Date(msg.receivedDateTime),
      })
    }

    return threads
  }

  async getDeltaLink(): Promise<string> {
    const res = await this.client
      .api('/me/mailFolders/inbox/messages/delta')
      .get()
    return res['@odata.deltaLink'] || ''
  }

  // ─── Calendar ─────────────────────────────────────────────────────────────────

  async getCalendarEvents(from: Date, to: Date): Promise<CalendarEvent[]> {
    const res = await this.client
      .api('/me/calendarView')
      .query({
        startDateTime: from.toISOString(),
        endDateTime: to.toISOString(),
        $top: 50,
        $orderby: 'start/dateTime asc',
      })
      .select('id,subject,bodyPreview,start,end,location,onlineMeeting,attendees')
      .get()

    return (res.value || []).map((e: any) => ({
      id: e.id,
      externalId: e.id,
      title: e.subject || '(No title)',
      description: e.bodyPreview,
      startTime: new Date(e.start?.dateTime + 'Z'),
      endTime: new Date(e.end?.dateTime + 'Z'),
      location: e.location?.displayName,
      meetingUrl: e.onlineMeeting?.joinUrl,
      participants: (e.attendees || []).map(
        (a: any) => a.emailAddress?.address
      ).filter(Boolean),
    }))
  }

  async createCalendarEvent(options: CreateCalendarEventOptions): Promise<CalendarEvent> {
    const { title, description, startTime, endTime, participants } = options

    const event = await this.client.api('/me/events').post({
      subject: title,
      body: { contentType: 'Text', content: description || '' },
      start: { dateTime: startTime.toISOString(), timeZone: 'UTC' },
      end: { dateTime: endTime.toISOString(), timeZone: 'UTC' },
      attendees: participants.map((email) => ({
        emailAddress: { address: email },
        type: 'required',
      })),
      isOnlineMeeting: true,
      onlineMeetingProvider: 'teamsForBusiness',
    })

    return {
      id: event.id,
      externalId: event.id,
      title: event.subject,
      startTime,
      endTime,
      meetingUrl: event.onlineMeeting?.joinUrl,
      participants,
    }
  }
}

// ─── Parser ───────────────────────────────────────────────────────────────────

function parseOutlookMessage(msg: any): UnifiedEmail | null {
  if (!msg) return null

  return {
    id: msg.id,
    userId: '',
    provider: 'OUTLOOK',
    externalId: msg.id,
    threadId: msg.conversationId,
    subject: msg.subject || '(No subject)',
    bodyText: msg.body?.content
      ? msg.body.contentType === 'html'
        ? msg.body.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
        : msg.body.content
      : msg.bodyPreview || '',
    bodyHtml: msg.body?.contentType === 'html' ? msg.body.content : undefined,
    fromEmail: msg.from?.emailAddress?.address || '',
    fromName: msg.from?.emailAddress?.name,
    toEmails: (msg.toRecipients || []).map(
      (r: any) => r.emailAddress?.address
    ).filter(Boolean),
    ccEmails: (msg.ccRecipients || []).map(
      (r: any) => r.emailAddress?.address
    ).filter(Boolean),
    isRead: msg.isRead ?? true,
    isStarred: msg.flag?.flagStatus === 'flagged',
    isSnoozed: false,
    labels: msg.categories || [],
    hasAttachments: msg.hasAttachments ?? false,
    receivedAt: new Date(msg.receivedDateTime),
  }
}
