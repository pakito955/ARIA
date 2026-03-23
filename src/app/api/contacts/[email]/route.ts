import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/authOrToken'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = user.id
  const { email: rawEmail } = await params
  const contactEmail = decodeURIComponent(rawEmail)

  const [emails, vip, tasks] = await Promise.all([
    prisma.email.findMany({
      where: { userId, fromEmail: contactEmail },
      orderBy: { receivedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        subject: true,
        fromName: true,
        receivedAt: true,
        analysis: { select: { category: true, priority: true } },
      },
    }),
    prisma.vipContact.findFirst({ where: { userId, email: contactEmail } }),
    prisma.task.count({
      where: { userId, email: { fromEmail: contactEmail } },
    }),
  ])

  const name = emails[0]?.fromName ?? null

  return NextResponse.json({
    email: contactEmail,
    name,
    totalEmails: emails.length,
    lastContact: emails[0]?.receivedAt ?? null,
    emails,
    isVip: !!vip,
    tasks,
  })
}
