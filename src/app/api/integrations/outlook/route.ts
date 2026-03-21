import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/encryption'
import { scheduleEmailSync } from '@/lib/queue'

const TENANT = process.env.MICROSOFT_TENANT_ID || 'common'
const CLIENT_ID = process.env.MICROSOFT_CLIENT_ID!
const CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET!
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/outlook/callback`

const SCOPES = [
  'openid',
  'profile',
  'email',
  'Mail.Read',
  'Mail.Send',
  'Mail.ReadWrite',
  'Calendars.ReadWrite',
  'offline_access',
].join(' ')

// GET /api/integrations/outlook → returns OAuth URL
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    response_mode: 'query',
    state: session.user.id,
  })

  const url = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/authorize?${params}`
  return NextResponse.json({ url })
}

// DELETE → disconnect
export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await prisma.integration.updateMany({
    where: { userId: session.user.id, provider: 'OUTLOOK' },
    data: { isActive: false },
  })

  return NextResponse.json({ success: true })
}
