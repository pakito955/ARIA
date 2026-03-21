import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/encryption'
import { scheduleEmailSync } from '@/lib/queue'

const TENANT = process.env.MICROSOFT_TENANT_ID || 'common'
const CLIENT_ID = process.env.MICROSOFT_CLIENT_ID!
const CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET!
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/outlook/callback`

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state') // userId

  if (!code || !state) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=oauth_failed`)
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch(
      `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          code,
          redirect_uri: REDIRECT_URI,
          grant_type: 'authorization_code',
        }),
      }
    )

    const tokens = await tokenRes.json()
    if (tokens.error) throw new Error(tokens.error_description)

    // Get user's email address
    const profileRes = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const profile = await profileRes.json()
    const outlookEmail = profile.mail || profile.userPrincipalName

    const integration = await prisma.integration.upsert({
      where: {
        userId_provider_email: {
          userId: state,
          provider: 'OUTLOOK',
          email: outlookEmail,
        },
      },
      create: {
        userId: state,
        provider: 'OUTLOOK',
        email: outlookEmail,
        accessToken: encrypt(tokens.access_token),
        refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
        expiresAt: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000)
          : null,
        scope: tokens.scope,
        isActive: true,
      },
      update: {
        accessToken: encrypt(tokens.access_token),
        refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : undefined,
        expiresAt: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000)
          : null,
        isActive: true,
      },
    })

    await scheduleEmailSync(state, integration.id, 'OUTLOOK', true)

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?connected=outlook`
    )
  } catch (err) {
    console.error('[Outlook OAuth] Error:', err)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=oauth_failed`
    )
  }
}
