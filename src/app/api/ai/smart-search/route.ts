import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { completeJSON } from '@/lib/anthropic'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { query } = await req.json()
  if (!query?.trim()) return NextResponse.json({ emails: [] })

  // Use Claude to interpret the query and extract filters
  const filters = await completeJSON<{
    keywords?: string[]
    priority?: string
    category?: string
    hasAmount?: boolean
    sentiment?: string
    fromDomain?: string
    isUnread?: boolean
  }>(
    'You are a search query interpreter for an email app. Extract search filters from natural language queries. Return ONLY valid JSON.',
    `User query: "${query}"

Extract search intent into this JSON structure:
{
  "keywords": ["word1", "word2"],   // key terms to search in subject/body
  "priority": "CRITICAL|HIGH|MEDIUM|LOW|null",
  "category": "MEETING|TASK|INVOICE|NEWSLETTER|SPAM|INFO|null",
  "hasAmount": true/false/null,    // true if query is about money/invoices
  "sentiment": "NEGATIVE|URGENT|null",
  "fromDomain": "domain.com|null", // if searching by sender company
  "isUnread": true/false/null
}

Examples:
"emails about money" → {"keywords": ["payment","invoice","money"], "category": "INVOICE", "hasAmount": true}
"critical unread" → {"priority": "CRITICAL", "isUnread": true}
"meetings from Google" → {"category": "MEETING", "fromDomain": "google.com"}`,
    200,
    { keywords: [query] }
  )

  // Build Prisma where clause
  const where: Record<string, unknown> = { userId: session.user.id }

  if (filters.isUnread === true) where.isRead = false
  if (filters.fromDomain) where.fromEmail = { contains: filters.fromDomain }

  const keywordConditions = filters.keywords?.length
    ? filters.keywords.map((kw) => ({
        OR: [
          { subject: { contains: kw, mode: 'insensitive' as const } },
          { bodyText: { contains: kw, mode: 'insensitive' as const } },
        ],
      }))
    : []

  const analysisWhere: Record<string, unknown> = {}
  if (filters.priority) analysisWhere.priority = filters.priority
  if (filters.category) analysisWhere.category = filters.category
  if (filters.sentiment) analysisWhere.sentiment = filters.sentiment
  if (filters.hasAmount) analysisWhere.amount = { not: null }

  const emails = await prisma.email.findMany({
    where: {
      ...where,
      ...(keywordConditions.length > 0 ? { AND: keywordConditions } : {}),
      ...(Object.keys(analysisWhere).length > 0 ? { analysis: analysisWhere } : {}),
    },
    orderBy: { receivedAt: 'desc' },
    take: 30,
    select: {
      id: true,
      subject: true,
      fromEmail: true,
      fromName: true,
      bodyText: true,
      isRead: true,
      isStarred: true,
      hasAttachments: true,
      receivedAt: true,
      analysis: {
        select: {
          priority: true,
          category: true,
          summary: true,
          urgencyScore: true,
          confidenceScore: true,
          sentiment: true,
          amount: true,
        },
      },
    },
  })

  return NextResponse.json({ emails, filtersApplied: filters })
}
