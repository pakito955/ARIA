import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/authOrToken'
import { prisma } from '@/lib/prisma'
import { suggestRules } from '@/agents/insightsAgent'

const db = prisma as any

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [emails, analyses] = await Promise.all([
    db.email.findMany({
      where: { userId: user.id, receivedAt: { gte: thirtyDaysAgo } },
      select: { fromEmail: true, fromName: true },
    }),
    db.aIAnalysis.findMany({
      where: { userId: user.id, createdAt: { gte: thirtyDaysAgo } },
      select: { category: true, email: { select: { fromEmail: true, fromName: true } } },
    }),
  ])

  // Build sender map with categories
  const senderMap: Record<string, { name?: string; count: number; categories: Set<string> }> = {}
  analyses.forEach((a: any) => {
    const emailAddr = a.email?.fromEmail
    if (!emailAddr) return
    if (!senderMap[emailAddr]) senderMap[emailAddr] = { name: a.email?.fromName, count: 0, categories: new Set() }
    senderMap[emailAddr].count++
    if (a.category) senderMap[emailAddr].categories.add(a.category)
  })

  const topSenders = Object.entries(senderMap)
    .map(([email, d]) => ({ email, name: d.name, count: d.count, categories: Array.from(d.categories) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Category breakdown
  const categoryMap: Record<string, number> = {}
  analyses.forEach((a: any) => { categoryMap[a.category] = (categoryMap[a.category] || 0) + 1 })
  const total = analyses.length || 1
  const categoryBreakdown = Object.entries(categoryMap)
    .map(([label, count]) => ({ label, value: Math.round((count as number / total) * 100) }))

  const newsletterCount = categoryMap['NEWSLETTER'] || 0
  const spamCount = categoryMap['SPAM'] || 0

  const suggestions = await suggestRules({
    topSenders,
    categoryBreakdown,
    newsletterCount,
    spamCount,
    totalEmails: emails.length,
  })

  return NextResponse.json({ data: suggestions })
}
