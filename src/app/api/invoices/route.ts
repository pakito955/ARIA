import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const emails = await prisma.email.findMany({
    where: {
      userId: session.user.id,
      OR: [
        { analysis: { category: 'INVOICE' } },
        { analysis: { amount: { not: null } } },
        { subject: { contains: 'invoice', mode: 'insensitive' } },
        { subject: { contains: 'payment', mode: 'insensitive' } },
        { subject: { contains: 'bill', mode: 'insensitive' } },
      ],
    },
    orderBy: { receivedAt: 'desc' },
    take: 50,
    select: {
      id: true,
      subject: true,
      fromEmail: true,
      fromName: true,
      receivedAt: true,
      analysis: {
        select: {
          amount: true,
          deadline: true,
          deadlineText: true,
          summary: true,
          priority: true,
        },
      },
    },
  })

  // Calculate totals
  let totalAmount = 0
  const parsed = emails.map((e) => {
    const amountStr = e.analysis?.amount || ''
    const numeric = parseFloat(amountStr.replace(/[^0-9.]/g, '')) || 0
    totalAmount += numeric
    return {
      ...e,
      amountNumeric: numeric,
      currency: amountStr.match(/[€$£]/) ? amountStr.match(/[€$£]/)?.[0] : '€',
      isOverdue: e.analysis?.deadline ? new Date(e.analysis.deadline) < new Date() : false,
    }
  })

  const overdue = parsed.filter((e) => e.isOverdue)
  const upcoming = parsed.filter((e) => !e.isOverdue && e.analysis?.deadline)
  const noDeadline = parsed.filter((e) => !e.analysis?.deadline)

  return NextResponse.json({
    all: parsed,
    overdue,
    upcoming,
    noDeadline,
    totalAmount,
    count: parsed.length,
  })
}
