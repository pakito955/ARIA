import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/authOrToken'
import { prisma } from '@/lib/prisma'
import { generateInsights } from '@/agents/insightsAgent'

const db = prisma as any

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

  // Parallel data fetch
  const [
    emailsThisWeek,
    emailsLastWeek,
    criticalEmails,
    unreadEmails,
    tasks,
    analyses,
    aiActions,
  ] = await Promise.all([
    db.email.count({ where: { userId: user.id, receivedAt: { gte: weekAgo } } }),
    db.email.count({ where: { userId: user.id, receivedAt: { gte: twoWeeksAgo, lt: weekAgo } } }),
    db.email.count({ where: { userId: user.id, analysis: { priority: 'CRITICAL' }, receivedAt: { gte: weekAgo } } }),
    db.email.count({ where: { userId: user.id, isRead: false } }),
    db.task.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 100 }),
    db.aIAnalysis.findMany({
      where: { userId: user.id, createdAt: { gte: weekAgo } },
      select: { category: true, tokensUsed: true, processingMs: true },
    }),
    db.aIAnalysis.count({ where: { userId: user.id, createdAt: { gte: weekAgo } } }),
  ])

  // Category breakdown
  const categoryMap: Record<string, number> = {}
  analyses.forEach((a: any) => {
    categoryMap[a.category] = (categoryMap[a.category] || 0) + 1
  })
  const totalAnalyses = analyses.length || 1
  const categories = Object.entries(categoryMap).map(([label, count]) => ({
    label,
    value: Math.round((count as number / totalAnalyses) * 100),
  }))

  // Top senders this week
  const emails = await db.email.findMany({
    where: { userId: user.id, receivedAt: { gte: weekAgo } },
    select: { fromEmail: true, fromName: true, analysis: { select: { category: true } } },
  })

  const senderMap: Record<string, { name?: string; count: number; categories: Set<string> }> = {}
  emails.forEach((e: any) => {
    if (!senderMap[e.fromEmail]) senderMap[e.fromEmail] = { name: e.fromName, count: 0, categories: new Set() }
    senderMap[e.fromEmail].count++
    if (e.analysis?.category) senderMap[e.fromEmail].categories.add(e.analysis.category)
  })

  const topSenders = Object.entries(senderMap)
    .map(([email, data]) => ({ email, name: data.name, count: data.count, categories: Array.from(data.categories) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  // Time saved estimate (2 min saved per analyzed email)
  const timeSavedHours = Math.round((aiActions * 2) / 60 * 10) / 10

  const tasksDone = tasks.filter((t: any) => t.status === 'DONE').length
  const tasksPending = tasks.filter((t: any) => t.status !== 'DONE').length

  const insights = await generateInsights({
    emailsThisWeek,
    emailsLastWeek,
    criticalCount: criticalEmails,
    unreadCount: unreadEmails,
    tasksCompleted: tasksDone,
    tasksPending,
    avgResponseHours: 0,
    topCategories: categories,
    topSenders: topSenders.map(s => ({ email: s.email, name: s.name, count: s.count })),
    timeSavedHours,
    aiActionsCount: aiActions,
  })

  return NextResponse.json({
    ...insights,
    meta: {
      emailsThisWeek,
      emailsLastWeek,
      criticalEmails,
      unreadEmails,
      tasksDone,
      tasksPending,
      timeSavedHours,
      aiActions,
      categories,
      topSenders: topSenders.slice(0, 5).map(s => ({ email: s.email, name: s.name, count: s.count })),
    },
  })
}
