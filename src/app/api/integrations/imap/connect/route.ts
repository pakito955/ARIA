/**
 * POST /api/integrations/imap/connect
 * Validates IMAP credentials via a dry-run connection, encrypts the password,
 * and saves the Integration record for the authenticated user.
 *
 * @Agent2 — Auth & Connections Engineer
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/authOrToken'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/encryption'
import { testImapConnection, detectServerConfig } from '@/lib/providers/imap'
import { scheduleEmailSync } from '@/lib/queue'

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const {
    email,
    password,
    imapHost: rawImapHost,
    imapPort: rawImapPort,
    smtpHost: rawSmtpHost,
    smtpPort: rawSmtpPort,
    useSsl,
  } = body as Record<string, unknown>

  // ─── Validate required fields ──────────────────────────────────────────────
  if (typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'A valid email address is required' }, { status: 400 })
  }
  if (typeof password !== 'string' || password.length < 1) {
    return NextResponse.json({ error: 'Password is required' }, { status: 400 })
  }

  // ─── Resolve server config (auto-detect or user-supplied) ─────────────────
  const detected = detectServerConfig(email)

  const imapHost = typeof rawImapHost === 'string' && rawImapHost.trim()
    ? rawImapHost.trim()
    : detected?.imapHost ?? null

  const imapPort = typeof rawImapPort === 'number'
    ? rawImapPort
    : (typeof rawImapPort === 'string' ? parseInt(rawImapPort, 10) : null) ?? detected?.imapPort ?? 993

  const smtpHost = typeof rawSmtpHost === 'string' && rawSmtpHost.trim()
    ? rawSmtpHost.trim()
    : detected?.smtpHost ?? null

  const smtpPort = typeof rawSmtpPort === 'number'
    ? rawSmtpPort
    : (typeof rawSmtpPort === 'string' ? parseInt(rawSmtpPort, 10) : null) ?? detected?.smtpPort ?? 587

  const sslEnabled = typeof useSsl === 'boolean' ? useSsl : (detected?.useSsl ?? true)

  if (!imapHost) {
    return NextResponse.json(
      { error: 'IMAP host could not be determined. Please provide it manually.' },
      { status: 400 }
    )
  }

  // ─── Dry-run IMAP connection test ──────────────────────────────────────────
  try {
    await testImapConnection({
      email,
      password,
      imapHost,
      imapPort,
      useSsl: sslEnabled,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Connection failed'
    return NextResponse.json(
      { error: `Could not connect to IMAP server: ${msg}` },
      { status: 422 }
    )
  }

  // ─── Encrypt password — never store plaintext ──────────────────────────────
  const encryptedPassword = encrypt(password)

  // ─── Upsert Integration record ─────────────────────────────────────────────
  try {
    const integration = await prisma.integration.upsert({
      where: {
        userId_provider_email: {
          userId: user.id,
          provider: 'IMAP',
          email,
        },
      },
      update: {
        isActive: true,
        encryptedPassword,
        imapHost,
        imapPort,
        smtpHost,
        smtpPort,
        useSsl: sslEnabled,
      },
      create: {
        userId: user.id,
        provider: 'IMAP',
        email,
        encryptedPassword,
        imapHost,
        imapPort,
        smtpHost,
        smtpPort,
        useSsl: sslEnabled,
        isActive: true,
      },
    })

    // Kick off initial email sync in the background
    scheduleEmailSync(user.id, integration.id, 'IMAP', true).catch(() => {
      // Non-fatal — user can trigger sync manually
    })

    return NextResponse.json({
      success: true,
      integrationId: integration.id,
      email: integration.email,
      imapHost,
      smtpHost,
    })
  } catch (err) {
    console.error('[imap/connect] DB error:', err)
    return NextResponse.json({ error: 'Failed to save integration' }, { status: 500 })
  }
}

// DELETE /api/integrations/imap/connect — disconnect an IMAP account
export async function DELETE(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email')

  await prisma.integration.updateMany({
    where: {
      userId: user.id,
      provider: 'IMAP',
      ...(email ? { email } : {}),
    },
    data: { isActive: false },
  })

  return NextResponse.json({ success: true })
}
