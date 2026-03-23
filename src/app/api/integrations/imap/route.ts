/**
 * GET /api/integrations/imap
 * Returns all active IMAP integrations for the authenticated user.
 * Passwords are never returned.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/authOrToken'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const integrations = await prisma.integration.findMany({
    where: { userId: user.id, provider: 'IMAP' },
    select: {
      id: true,
      email: true,
      imapHost: true,
      smtpHost: true,
      imapPort: true,
      smtpPort: true,
      useSsl: true,
      isActive: true,
      lastSyncAt: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(integrations)
}
