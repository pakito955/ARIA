import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/authOrToken'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const db = prisma as any

const createSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(10000),
  source: z.enum(['MANUAL', 'NOTE', 'PASTE']).optional().default('MANUAL'),
  tags: z.array(z.string()).optional().default([]),
})

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('q') || ''

  const items = await db.knowledgeItem.findMany({
    where: {
      userId: user.id,
      ...(search ? {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { content: { contains: search, mode: 'insensitive' } },
        ],
      } : {}),
    },
    orderBy: [{ useCount: 'desc' }, { updatedAt: 'desc' }],
  })

  return NextResponse.json({ data: items })
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = createSchema.safeParse(await req.json())
  if (!body.success) {
    return NextResponse.json({ error: 'Invalid request', details: body.error.flatten() }, { status: 400 })
  }

  const item = await db.knowledgeItem.create({
    data: {
      userId: user.id,
      title: body.data.title,
      content: body.data.content,
      source: body.data.source,
      tags: JSON.stringify(body.data.tags),
    },
  })

  return NextResponse.json({ data: item }, { status: 201 })
}
