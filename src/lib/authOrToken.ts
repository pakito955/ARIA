import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

export interface AuthUser {
  id: string
  email: string | null | undefined
  name?: string | null
}

/**
 * Returns the authenticated user from either a NextAuth session
 * or a Bearer token issued for the Chrome Extension.
 */
export async function getAuthUser(req: NextRequest): Promise<AuthUser | null> {
  // 1. Try session first (web app users)
  const session = await auth()
  if (session?.user?.id) {
    return session.user as AuthUser
  }

  // 2. Try Bearer token (Chrome Extension)
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.slice(7).trim()
  if (!token) return null

  const extToken = await prisma.extensionToken.findUnique({
    where: { token },
    include: { user: { select: { id: true, email: true, name: true } } },
  })

  if (!extToken) return null

  // Update lastUsedAt without blocking the response
  prisma.extensionToken
    .update({ where: { id: extToken.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {})

  return extToken.user
}
