import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/authOrToken'
import { prisma } from '@/lib/prisma'
import { suggestRules } from '@/agents/insightsAgent'

const db = prisma as any

/**
 * POST /api/rules/suggest
 * Body: { emailIds?: string[], context?: string }
 *
 * Fetches recent email patterns (last 20 emails or from the provided emailIds)
 * and uses Claude to suggest automation rules.
 */
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { emailIds?: string[]; context?: string } = {}
  try {
    body = await req.json()
  } catch {
    // empty body is fine
  }

  try {
    // Build a sample of recent emails for pattern analysis
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const whereClause = body.emailIds?.length
      ? { userId: user.id, id: { in: body.emailIds } }
      : { userId: user.id, receivedAt: { gte: thirtyDaysAgo } }

    const [emails, analyses] = await Promise.all([
      db.email.findMany({
        where: whereClause,
        select: { fromEmail: true, fromName: true },
        take: 20,
        orderBy: { receivedAt: 'desc' },
      }),
      db.aIAnalysis.findMany({
        where: {
          userId: user.id,
          ...(body.emailIds?.length
            ? { emailId: { in: body.emailIds } }
            : { createdAt: { gte: thirtyDaysAgo } }),
        },
        select: {
          category: true,
          email: { select: { fromEmail: true, fromName: true } },
        },
        take: 20,
      }),
    ])

    // Build sender map with categories
    const senderMap: Record<string, { name?: string; count: number; categories: Set<string> }> = {}
    analyses.forEach((a: any) => {
      const emailAddr = a.email?.fromEmail
      if (!emailAddr) return
      if (!senderMap[emailAddr]) {
        senderMap[emailAddr] = { name: a.email?.fromName, count: 0, categories: new Set() }
      }
      senderMap[emailAddr].count++
      if (a.category) senderMap[emailAddr].categories.add(a.category)
    })

    const topSenders = Object.entries(senderMap)
      .map(([email, d]) => ({ email, name: d.name, count: d.count, categories: Array.from(d.categories) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Category breakdown
    const categoryMap: Record<string, number> = {}
    analyses.forEach((a: any) => {
      categoryMap[a.category] = (categoryMap[a.category] || 0) + 1
    })
    const total = analyses.length || 1
    const categoryBreakdown = Object.entries(categoryMap).map(([label, count]) => ({
      label,
      value: Math.round(((count as number) / total) * 100),
    }))

    const newsletterCount = categoryMap['NEWSLETTER'] || 0
    const spamCount = categoryMap['SPAM'] || 0

    const suggestions = await suggestRules({
      topSenders,
      categoryBreakdown,
      newsletterCount,
      spamCount,
      totalEmails: emails.length,
    })

    // Normalise to the shape the task spec requires
    const formatted = suggestions.map((s) => ({
      name: s.name,
      triggerField: s.triggerField,
      triggerOperator: s.triggerOperator,
      triggerValue: s.triggerValue,
      action: s.action,
      actionValue: s.actionValue,
      reasoning: s.reasoning,
    }))

    return NextResponse.json({ suggestions: formatted })
  } catch (err) {
    console.error('[Rules/Suggest] POST error:', err)
    return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 })
  }
}
