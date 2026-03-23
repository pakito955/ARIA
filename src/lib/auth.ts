import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from './prisma'
import { encrypt } from './encryption'
import { testImapConnection, detectServerConfig } from './providers/imap'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'select_account consent',
          access_type: 'offline',
          response_type: 'code',
          scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/gmail.modify',
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/calendar.events',
          ].join(' '),
        },
      },
    }),
    Credentials({
      name: 'IMAP',
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        console.log("[Auth] Authorize attempt:", credentials?.email)
        const { email, password } = credentials as Record<string, string>
        if (!email || !password) return null

        const config = detectServerConfig(email)
        if (!config) throw new Error("Pružalac nije prepoznat.")

        try {
          await testImapConnection({ ...config, email, password })
          let user = await prisma.user.findUnique({ where: { email } })
          if (!user) {
            user = await prisma.user.create({ data: { email, name: email.split('@')[0] } })
          }

          await (prisma as any).integration.upsert({
            where: { userId_provider_email: { userId: user.id, provider: 'IMAP', email } },
            create: {
              userId: user.id,
              provider: 'IMAP',
              email,
              encryptedPassword: encrypt(password),
              ...config,
              isActive: true,
            },
            update: {
              encryptedPassword: encrypt(password),
              isActive: true,
            }
          })

          return { id: user.id, email: user.email, name: user.name }
        } catch (err) {
          console.error("[Auth] IMAP Error:", err)
          return null
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (account && user) {
        token.id = user.id
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.provider = account.provider
        token.providerEmail = user.email

        // Auto-create Integration record so email sync works
        if (account.provider === 'google' && user.id && account.access_token) {
          try {
            await prisma.integration.upsert({
              where: {
                userId_provider_email: {
                  userId: user.id,
                  provider: 'GMAIL',
                  email: user.email!,
                },
              },
              create: {
                userId: user.id,
                provider: 'GMAIL',
                email: user.email!,
                accessToken: encrypt(account.access_token),
                refreshToken: account.refresh_token
                  ? encrypt(account.refresh_token)
                  : null,
                expiresAt: account.expires_at
                  ? new Date(account.expires_at * 1000)
                  : null,
                scope: account.scope,
                isActive: true,
              },
              update: {
                accessToken: encrypt(account.access_token),
                refreshToken: account.refresh_token
                  ? encrypt(account.refresh_token)
                  : undefined,
                expiresAt: account.expires_at
                  ? new Date(account.expires_at * 1000)
                  : null,
                isActive: true,
              },
            })
          } catch (e) {
            console.error('[Auth] Failed to upsert integration:', e)
          }
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        ;(session as any).accessToken = token.accessToken
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
})
