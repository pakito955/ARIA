import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/authOrToken'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const db = prisma as any

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  enabled: z.boolean().optional(),
  triggerField: z.enum(['from', 'subject', 'body', 'category', 'priority']).optional(),
  triggerOperator: z.enum(['contains', 'equals', 'startsWith', 'endsWith']).optional(),
  triggerValue: z.string().min(1).optional(),
  action: z.enum(['archive', 'markRead', 'createTask', 'snooze', 'label']).optional(),
  actionValue: z.string().nullable().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = updateSchema.safeParse(await req.json())
  if (!body.success) {
    return NextResponse.json({ error: 'Invalid request', details: body.error.flatten() }, { status: 400 })
  }

  try {
    const existing = await db.emailRule.findFirst({
      where: { id, userId: user.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
    }

    const updated = await db.emailRule.update({
      where: { id },
      data: body.data,
    })

    return NextResponse.json({ data: updated })
  } catch (err) {
    console.error('[Rules] PATCH error:', err)
    return NextResponse.json({ error: 'Failed to update rule' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    const deleted = await db.emailRule.deleteMany({
      where: { id, userId: user.id },
    })

    if (deleted.count === 0) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Rules] DELETE error:', err)
    return NextResponse.json({ error: 'Failed to delete rule' }, { status: 500 })
  }
}
