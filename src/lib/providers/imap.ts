/**
 * IMAPProvider — implements EmailProviderInterface for any IMAP/SMTP server.
 * Used for iCloud, Yahoo, cPanel, Hostinger, and any standards-compliant host.
 *
 * Dependencies: imap-simple, mailparser, nodemailer
 * @Agent4 — Protocol Specialist
 */

import imaps from 'imap-simple'
import { simpleParser, type ParsedMail } from 'mailparser'
import nodemailer from 'nodemailer'
import type {
  EmailProviderInterface,
  UnifiedEmail,
  FetchEmailsOptions,
  SendEmailOptions,
  Thread,
  CalendarEvent,
  CreateCalendarEventOptions,
} from '@/types'

export interface ImapConfig {
  email: string
  password: string        // plaintext — caller must decrypt before passing
  imapHost: string
  imapPort: number
  smtpHost: string
  smtpPort: number
  useSsl?: boolean
}

export class IMAPProvider implements EmailProviderInterface {
  readonly provider = 'IMAP' as const
  private config: ImapConfig

  constructor(config: ImapConfig) {
    this.config = config
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private async openConnection(): Promise<imaps.ImapSimple> {
    return imaps.connect({
      imap: {
        user: this.config.email,
        password: this.config.password,
        host: this.config.imapHost,
        port: this.config.imapPort,
        tls: this.config.useSsl !== false,
        tlsOptions: { rejectUnauthorized: false },
        authTimeout: 15000,
        connTimeout: 20000,
      },
    })
  }

  private buildExternalId(uid: number, mailbox: string): string {
    return `${mailbox}:${uid}`
  }

  private parseUidFromExternalId(externalId: string): { mailbox: string; uid: number } {
    const sep = externalId.lastIndexOf(':')
    return {
      mailbox: externalId.slice(0, sep) || 'INBOX',
      uid: parseInt(externalId.slice(sep + 1), 10),
    }
  }

  private parsedMailToUnified(
    parsed: ParsedMail,
    uid: number,
    mailbox: string
  ): UnifiedEmail {
    const toAddrs = (parsed.to
      ? Array.isArray(parsed.to) ? parsed.to : [parsed.to]
      : []
    ).flatMap((a) => (a.value ?? []).map((v) => v.address ?? ''))

    const ccAddrs = (parsed.cc
      ? Array.isArray(parsed.cc) ? parsed.cc : [parsed.cc]
      : []
    ).flatMap((a) => (a.value ?? []).map((v) => v.address ?? ''))

    const fromAddr = parsed.from?.value?.[0]
    const labels = mailbox !== 'INBOX' ? [mailbox] : []

    return {
      id: this.buildExternalId(uid, mailbox),
      userId: '',               // caller fills this in before saving
      provider: 'IMAP',
      externalId: this.buildExternalId(uid, mailbox),
      threadId: parsed.inReplyTo?.toString(),
      subject: parsed.subject ?? '(no subject)',
      bodyText: parsed.text ?? '',
      bodyHtml: typeof parsed.html === 'string' ? parsed.html : undefined,
      fromEmail: fromAddr?.address ?? '',
      fromName: fromAddr?.name || undefined,
      toEmails: toAddrs.filter(Boolean),
      ccEmails: ccAddrs.filter(Boolean),
      isRead: false,            // will be overridden by flags
      isStarred: false,
      isSnoozed: false,
      labels,
      hasAttachments: (parsed.attachments?.length ?? 0) > 0,
      receivedAt: parsed.date ?? new Date(),
    }
  }

  // ─── fetchEmails ─────────────────────────────────────────────────────────────

  async fetchEmails(options: FetchEmailsOptions = {}): Promise<UnifiedEmail[]> {
    const { limit = 50, since } = options
    const connection = await this.openConnection()

    try {
      await connection.openBox('INBOX')

      // Build search criteria
      const criteria: string[] = ['ALL']
      if (since) {
        // IMAP SINCE date must be formatted as "DD-Mon-YYYY"
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
        const d = since
        const sinceStr = `${d.getDate()}-${months[d.getMonth()]}-${d.getFullYear()}`
        criteria[0] = `SINCE "${sinceStr}"`
      }

      const searchCriteria = since ? [['SINCE', since]] : [['ALL']]
      const fetchOptions = {
        bodies: ['HEADER', 'TEXT', ''],
        markSeen: false,
        struct: true,
      }

      const messages = await connection.search(searchCriteria, fetchOptions)

      // Take the most recent `limit` messages
      const slice = messages.slice(-limit).reverse()

      const emails: UnifiedEmail[] = []
      for (const msg of slice) {
        try {
          const allPart = msg.parts.find((p) => p.which === '')
          if (!allPart) continue

          const rawBuffer = Buffer.isBuffer(allPart.body)
            ? allPart.body
            : Buffer.from(String(allPart.body), 'utf-8')

          const parsed = await simpleParser(rawBuffer)
          const uid = msg.attributes.uid
          const flags = msg.attributes.flags ?? []

          const unified = this.parsedMailToUnified(parsed, uid, 'INBOX')
          unified.isRead = flags.includes('\\Seen')
          unified.isStarred = flags.includes('\\Flagged')

          emails.push(unified)
        } catch {
          // Skip malformed messages — don't crash the sync
        }
      }

      return emails
    } finally {
      connection.end()
    }
  }

  // ─── fetchEmail ──────────────────────────────────────────────────────────────

  async fetchEmail(externalId: string): Promise<UnifiedEmail | null> {
    const { mailbox, uid } = this.parseUidFromExternalId(externalId)
    const connection = await this.openConnection()

    try {
      await connection.openBox(mailbox)
      const messages = await connection.search(
        [['UID', String(uid)]],
        { bodies: [''], markSeen: false, struct: true }
      )

      if (!messages.length) return null

      const allPart = messages[0].parts.find((p) => p.which === '')
      if (!allPart) return null

      const rawBuffer = Buffer.isBuffer(allPart.body)
        ? allPart.body
        : Buffer.from(String(allPart.body), 'utf-8')

      const parsed = await simpleParser(rawBuffer)
      const flags = messages[0].attributes.flags ?? []
      const unified = this.parsedMailToUnified(parsed, uid, mailbox)
      unified.isRead = flags.includes('\\Seen')
      unified.isStarred = flags.includes('\\Flagged')

      return unified
    } finally {
      connection.end()
    }
  }

  // ─── markAsRead ──────────────────────────────────────────────────────────────

  async markAsRead(externalId: string): Promise<void> {
    const { mailbox, uid } = this.parseUidFromExternalId(externalId)
    const connection = await this.openConnection()

    try {
      await connection.openBox(mailbox)
      await connection.addFlags(uid, '\\Seen')
    } finally {
      connection.end()
    }
  }

  // ─── sendEmail ───────────────────────────────────────────────────────────────

  async sendEmail(options: SendEmailOptions): Promise<void> {
    const { to, cc, subject, body, html, replyToId } = options

    const transporter = nodemailer.createTransport({
      host: this.config.smtpHost,
      port: this.config.smtpPort,
      // port 465 → implicit TLS; port 587/25 → STARTTLS
      secure: this.config.smtpPort === 465,
      auth: {
        user: this.config.email,
        pass: this.config.password,
      },
      tls: { rejectUnauthorized: false },
    })

    await transporter.sendMail({
      from: this.config.email,
      to: to.join(', '),
      cc: cc?.join(', '),
      subject,
      text: body,
      html: html ?? undefined,
      // Thread continuity via In-Reply-To
      ...(replyToId ? { inReplyTo: replyToId, references: replyToId } : {}),
    })
  }

  // ─── fetchThreads ────────────────────────────────────────────────────────────
  // IMAP doesn't have native threading — we simulate by grouping on Subject.

  async fetchThreads(limit = 20): Promise<Thread[]> {
    const emails = await this.fetchEmails({ limit: limit * 3 })
    const seen = new Map<string, Thread>()

    for (const email of emails) {
      const key = email.subject.replace(/^(Re:|Fwd:)\s*/i, '').trim()
      const existing = seen.get(key)
      if (existing) {
        existing.messageCount++
        if (!existing.participants.includes(email.fromEmail)) {
          existing.participants.push(email.fromEmail)
        }
        if (email.receivedAt > existing.lastEmailAt) {
          existing.lastEmailAt = email.receivedAt
        }
      } else {
        seen.set(key, {
          id: email.externalId,
          externalId: email.externalId,
          subject: email.subject,
          participants: [email.fromEmail],
          messageCount: 1,
          lastEmailAt: email.receivedAt,
        })
      }
    }

    return [...seen.values()]
      .sort((a, b) => b.lastEmailAt.getTime() - a.lastEmailAt.getTime())
      .slice(0, limit)
  }

  // ─── Calendar — not supported ────────────────────────────────────────────────

  async getCalendarEvents(_from: Date, _to: Date): Promise<CalendarEvent[]> {
    return []
  }

  async createCalendarEvent(_event: CreateCalendarEventOptions): Promise<CalendarEvent> {
    throw new Error('Calendar is not supported for IMAP accounts')
  }
}

// ─── Dry-run connection test — used by Agent2's connect route ─────────────────

export async function testImapConnection(config: {
  email: string
  password: string
  imapHost: string
  imapPort: number
  useSsl?: boolean
}): Promise<void> {
  const connection = await imaps.connect({
    imap: {
      user: config.email,
      password: config.password,
      host: config.imapHost,
      port: config.imapPort,
      tls: config.useSsl !== false,
      tlsOptions: { rejectUnauthorized: false },
      authTimeout: 12000,
      connTimeout: 15000,
    },
  })
  // If we get here the credentials are valid
  connection.end()
}

// ─── Auto-detect known IMAP/SMTP hosts ───────────────────────────────────────

export interface DetectedServerConfig {
  imapHost: string
  imapPort: number
  smtpHost: string
  smtpPort: number
  useSsl: boolean
}

const KNOWN_HOSTS: Record<string, DetectedServerConfig> = {
  'gmail.com':       { imapHost: 'imap.gmail.com',            imapPort: 993, smtpHost: 'smtp.gmail.com',            smtpPort: 587, useSsl: true },
  'googlemail.com':  { imapHost: 'imap.gmail.com',            imapPort: 993, smtpHost: 'smtp.gmail.com',            smtpPort: 587, useSsl: true },
  'icloud.com':      { imapHost: 'imap.mail.me.com',          imapPort: 993, smtpHost: 'smtp.mail.me.com',          smtpPort: 587, useSsl: true },
  'me.com':          { imapHost: 'imap.mail.me.com',          imapPort: 993, smtpHost: 'smtp.mail.me.com',          smtpPort: 587, useSsl: true },
  'mac.com':         { imapHost: 'imap.mail.me.com',          imapPort: 993, smtpHost: 'smtp.mail.me.com',          smtpPort: 587, useSsl: true },
  'yahoo.com':       { imapHost: 'imap.mail.yahoo.com',       imapPort: 993, smtpHost: 'smtp.mail.yahoo.com',       smtpPort: 587, useSsl: true },
  'yahoo.co.uk':     { imapHost: 'imap.mail.yahoo.com',       imapPort: 993, smtpHost: 'smtp.mail.yahoo.com',       smtpPort: 587, useSsl: true },
  'hotmail.com':     { imapHost: 'outlook.office365.com',     imapPort: 993, smtpHost: 'smtp.office365.com',        smtpPort: 587, useSsl: true },
  'outlook.com':     { imapHost: 'outlook.office365.com',     imapPort: 993, smtpHost: 'smtp.office365.com',        smtpPort: 587, useSsl: true },
  'live.com':        { imapHost: 'outlook.office365.com',     imapPort: 993, smtpHost: 'smtp.office365.com',        smtpPort: 587, useSsl: true },
  'msn.com':         { imapHost: 'outlook.office365.com',     imapPort: 993, smtpHost: 'smtp.office365.com',        smtpPort: 587, useSsl: true },
  'aol.com':         { imapHost: 'imap.aol.com',              imapPort: 993, smtpHost: 'smtp.aol.com',              smtpPort: 587, useSsl: true },
  'zoho.com':        { imapHost: 'imap.zoho.com',             imapPort: 993, smtpHost: 'smtp.zoho.com',             smtpPort: 587, useSsl: true },
  'protonmail.com':  { imapHost: '127.0.0.1',                 imapPort: 1143, smtpHost: '127.0.0.1',                smtpPort: 1025, useSsl: false },
  'proton.me':       { imapHost: '127.0.0.1',                 imapPort: 1143, smtpHost: '127.0.0.1',                smtpPort: 1025, useSsl: false },
}

export function detectServerConfig(email: string): DetectedServerConfig | null {
  const domain = email.split('@')[1]?.toLowerCase()
  if (!domain) return null

  if (KNOWN_HOSTS[domain]) return KNOWN_HOSTS[domain]

  // Generic cPanel / Hostinger fallback: mail.{domain}
  return {
    imapHost: `mail.${domain}`,
    imapPort: 993,
    smtpHost: `mail.${domain}`,
    smtpPort: 465,
    useSsl: true,
  }
}
