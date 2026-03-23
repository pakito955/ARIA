import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/authOrToken'
import { prisma } from '@/lib/prisma'
import { queryKnowledge, buildKnowledgeContext } from '@/agents/knowledgeAgent'

const db = prisma as any

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { context } = await req.json()
  if (!context) return NextResponse.json({ error: 'context required' }, { status: 400 })

  const rawItems = await db.knowledgeItem.findMany({
    where: { userId: user.id },
    orderBy: { useCount: 'desc' },
    take: 50,
  })

  const items = rawItems.map((item: any) => ({
    id: item.id,
    title: item.title,
    content: item.content,
    tags: JSON.parse(item.tags || '[]'),
  }))

  const result = await queryKnowledge(context, items)

  // Increment useCount for matched items
  if (result.relevantItems.length > 0) {
    await db.knowledgeItem.updateMany({
      where: { id: { in: result.relevantItems.map(i => i.id) } },
      data: { useCount: { increment: 1 } },
    })
  }

  return NextResponse.json({
    ...result,
    contextString: buildKnowledgeContext(result.relevantItems),
  })
}
