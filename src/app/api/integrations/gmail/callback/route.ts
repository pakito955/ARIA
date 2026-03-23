import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/encryption'
import { scheduleEmailSync } from '@/lib/queue'

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/gmail/callback`
  )
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state') // userId

  if (!code || !state) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=oauth_failed`)
  }

  const oauth2Client = getOAuth2Client()

  try {
    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)

    // Get user's Gmail address
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
    const profile = await gmail.users.getProfile({ userId: 'me' })
    const gmailEmail = profile.data.emailAddress!

    // Upsert integration with encrypted tokens
    const integration = await prisma.integration.upsert({
      where: {
        userId_provider_email: {
          userId: state,
          provider: 'GMAIL',
          email: gmailEmail,
        },
      },
      create: {
        userId: state,
        provider: 'GMAIL',
        email: gmailEmail,
        accessToken: encrypt(tokens.access_token!),
        refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        scope: tokens.scope,
        isActive: true,
      },
      update: {
        accessToken: encrypt(tokens.access_token!),
        refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : undefined,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        isActive: true,
      },
    })

    // Trigger initial sync
    await scheduleEmailSync(state, integration.id, 'GMAIL', true)

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?connected=gmail`
    )
  } catch (err) {
    console.error('[Gmail OAuth] Callback error:', err)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=oauth_failed`
    )
  }
}
