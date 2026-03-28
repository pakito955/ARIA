import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/authOrToken'
import { prisma } from '@/lib/prisma'
import { queryKnowledge, buildKnowledgeContext } from '@/agents/knowledgeAgent'

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { query, limit = 10 } = await req.json()
  if (!query?.trim()) return NextResponse.json({ error: 'query required' }, { status: 400 })

  try {
    const db = prisma as any
    const rawItems = await db.knowledgeItem.findMany({
      where: { userId: user.id },
      orderBy: [{ useCount: 'desc' }, { updatedAt: 'desc' }],
      take: 50,
    })

    if (!rawItems.length) {
      return NextResponse.json({ results: [], context: '', count: 0 })
    }

    const items = rawItems.map((item: any) => ({
      id: item.id,
      title: item.title,
      content: item.content,
      tags: JSON.parse(item.tags || '[]'),
    }))

    const result = await queryKnowledge(query, items)
    const context = result.shouldInject ? buildKnowledgeContext(result.relevantItems) : ''

    // Update useCount for matched items
    if (result.relevantItems.length > 0) {
      await db.knowledgeItem.updateMany({
        where: { id: { in: result.relevantItems.map((i: any) => i.id) } },
        data: { useCount: { increment: 1 } },
      }).catch(() => {})
    }

    return NextResponse.json({
      results: result.relevantItems.slice(0, limit),
      context,
      count: result.relevantItems.length,
      shouldInject: result.shouldInject,
    })
  } catch (err) {
    console.error('[KnowledgeSearch] Error:', err)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
