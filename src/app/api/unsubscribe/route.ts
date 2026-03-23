import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Find likely newsletters/marketing emails
  const newsletters = await prisma.email.findMany({
    where: {
      userId: session.user.id,
      OR: [
        { analysis: { category: 'NEWSLETTER' } },
        { analysis: { category: 'SPAM' } },
        { labels: { contains: 'CATEGORY_PROMOTIONS' } },
        { fromEmail: { contains: 'noreply' } },
        { fromEmail: { contains: 'no-reply' } },
        { fromEmail: { contains: 'newsletter' } },
        { fromEmail: { contains: 'marketing' } },
        { fromEmail: { contains: 'promo' } },
        { fromEmail: { contains: 'updates' } },
        { fromEmail: { contains: 'news@' } },
        { fromEmail: { contains: 'info@' } },
      ],
    },
    orderBy: { receivedAt: 'desc' },
    select: {
      fromEmail: true,
      fromName: true,
      subject: true,
      receivedAt: true,
    },
    take: 500,
  })

  // Group by sender domain
  const senderMap = new Map<string, {
    email: string
    name: string
    domain: string
    count: number
    lastReceived: string
    sample: string
  }>()

  for (const email of newsletters) {
    const domain = email.fromEmail.split('@')[1] || email.fromEmail
    const key = email.fromEmail

    if (senderMap.has(key)) {
      const existing = senderMap.get(key)!
      existing.count++
      if (email.receivedAt > new Date(existing.lastReceived)) {
        existing.lastReceived = email.receivedAt.toISOString()
      }
    } else {
      senderMap.set(key, {
        email: email.fromEmail,
        name: email.fromName || email.fromEmail,
        domain,
        count: 1,
        lastReceived: email.receivedAt.toISOString(),
        sample: email.subject,
      })
    }
  }

  const senders = Array.from(senderMap.values())
    .sort((a, b) => b.count - a.count)

  return NextResponse.json({ senders, total: senders.length })
}

// POST: mark sender as unsubscribed (archive all their emails)
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { fromEmail } = await req.json()
  if (!fromEmail) return NextResponse.json({ error: 'fromEmail required' }, { status: 400 })

  // Archive all emails from this sender
  const result = await prisma.email.updateMany({
    where: {
      userId: session.user.id,
      fromEmail,
    },
    data: {
      labels: JSON.stringify(['ARCHIVED', 'UNSUBSCRIBED']),
      isRead: true,
    },
  })

  return NextResponse.json({ archived: result.count })
}
