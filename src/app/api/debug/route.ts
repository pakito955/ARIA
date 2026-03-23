import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  }

  const userId = session.user.id

  try {
    const [integrations, emailCount, user] = await Promise.all([
      prisma.integration.findMany({
        where: { userId },
        select: {
          id: true,
          provider: true,
          email: true,
          isActive: true,
          lastSyncAt: true,
          expiresAt: true,
          scope: true,
          // Don't expose tokens
        },
      }),
      prisma.email.count({ where: { userId } }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true },
      }),
    ])

    return NextResponse.json({
      user,
      integrations,
      emailCount,
      env: {
        hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
        hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
        hasEncryptionKey: !!process.env.ENCRYPTION_KEY,
        hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
        authUrl: process.env.AUTH_URL || process.env.NEXTAUTH_URL,
        nodeEnv: process.env.NODE_ENV,
      },
    })
  } catch (err) {
    return NextResponse.json({
      error: String(err),
      message: 'DB query failed — likely schema mismatch (run prisma db push)',
    }, { status: 500 })
  }
}
