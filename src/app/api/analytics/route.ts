import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { startOfWeek, eachDayOfInterval, endOfWeek, format, subDays } from 'date-fns'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 })
  const thirtyDaysAgo = subDays(new Date(), 30)
  const ninetyDaysAgo = subDays(new Date(), 90)

  const [emails, analyses, tasks, allEmails, recentEmails] = await Promise.all([
    prisma.email.findMany({
      where: { userId, receivedAt: { gte: weekStart } },
      select: { receivedAt: true, analysis: { select: { category: true, processingMs: true } } },
    }),
    prisma.aIAnalysis.count({ where: { userId } }),
    prisma.task.count({ where: { userId, status: 'DONE' } }),
    // For heatmap — last 90 days
    prisma.email.findMany({
      where: { userId, receivedAt: { gte: ninetyDaysAgo } },
      select: { receivedAt: true },
    }),
    // For top senders — last 30 days
    prisma.email.findMany({
      where: { userId, receivedAt: { gte: thirtyDaysAgo } },
      select: { fromEmail: true, fromName: true },
    }),
  ])

  // Weekly volume by day
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd })
  const weeklyVolume = days.map((day) => {
    const dayStr = format(day, 'yyyy-MM-dd')
    return emails.filter((e) => format(e.receivedAt, 'yyyy-MM-dd') === dayStr).length
  })

  // Category breakdown
  const catCounts: Record<string, number> = {}
  emails.forEach((e) => {
    const cat = e.analysis?.category || 'INFO'
    catCounts[cat] = (catCounts[cat] || 0) + 1
  })
  const total = emails.length || 1
  const categories = Object.entries(catCounts).map(([label, count]) => ({
    label,
    value: Math.round((count / total) * 100),
    color: {
      TASK: '#86efac', MEETING: '#f4a0b5', INFO: '#7eb8f7',
      CRITICAL: '#f4a0b5', SPAM: '#5a5a78', INVOICE: '#e8c97a', NEWSLETTER: '#5a5a78',
    }[label] || '#5a5a78',
  }))

  // Time saved estimate
  const timeSaved = Math.round((analyses / 30) * 10) / 10

  // Top senders
  const senderCounts: Record<string, { email: string; name: string; count: number }> = {}
  recentEmails.forEach((e) => {
    if (!senderCounts[e.fromEmail]) {
      senderCounts[e.fromEmail] = { email: e.fromEmail, name: e.fromName || e.fromEmail, count: 0 }
    }
    senderCounts[e.fromEmail].count++
  })
  const topSenders = Object.values(senderCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  // Email heatmap — 7 days x 24 hours matrix
  const heatmap: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0))
  allEmails.forEach((e) => {
    const d = new Date(e.receivedAt)
    const day = d.getDay() // 0=Sun
    const hour = d.getHours()
    const row = day === 0 ? 6 : day - 1 // Mon=0, Sun=6
    heatmap[row][hour]++
  })

  // Average response time proxy: time from receivedAt to analysis createdAt
  const analysesWithTime = await prisma.aIAnalysis.findMany({
    where: { userId, createdAt: { gte: thirtyDaysAgo } },
    select: { createdAt: true, email: { select: { receivedAt: true } } },
    take: 100,
  })
  const deltas = analysesWithTime
    .map((a) => (new Date(a.createdAt).getTime() - new Date(a.email.receivedAt).getTime()) / 3600000)
    .filter((h) => h > 0 && h < 48)
  const avgResponseHours = deltas.length > 0
    ? Math.round((deltas.reduce((a, b) => a + b, 0) / deltas.length) * 10) / 10
    : 0

  return NextResponse.json({
    emailsThisWeek: emails.length,
    timeSaved,
    responseRate: 94,
    aiActions: analyses,
    weeklyVolume,
    categories,
    topSenders,
    heatmap,
    avgResponseHours,
  })
}
