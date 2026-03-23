import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/authOrToken'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const db = prisma as any

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(10000).optional(),
  tags: z.array(z.string()).optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const item = await db.knowledgeItem.findFirst({
    where: { id, userId: user.id },
  })
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = updateSchema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 })

  const updated = await db.knowledgeItem.update({
    where: { id },
    data: {
      ...(body.data.title && { title: body.data.title }),
      ...(body.data.content && { content: body.data.content }),
      ...(body.data.tags && { tags: JSON.stringify(body.data.tags) }),
    },
  })

  return NextResponse.json({ data: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const item = await db.knowledgeItem.findFirst({
    where: { id, userId: user.id },
  })
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.knowledgeItem.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
