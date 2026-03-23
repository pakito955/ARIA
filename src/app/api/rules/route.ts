import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/authOrToken'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const db = prisma as any

const createSchema = z.object({
  name: z.string().min(1).max(200),
  enabled: z.boolean().optional().default(true),
  triggerField: z.enum(['from', 'subject', 'body', 'category', 'priority', 'sentiment', 'hasAttachment']),
  triggerOperator: z.enum(['contains', 'equals', 'startsWith', 'endsWith', 'is']),
  triggerValue: z.string().min(1),
  action: z.enum(['archive', 'markRead', 'createTask', 'snooze', 'label', 'forward', 'notifyWebhook', 'autoReply', 'setVip']),
  actionValue: z.string().optional(),
  aiGenerated: z.boolean().optional().default(false),
})

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const rules = await db.emailRule.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json({ data: rules })
  } catch (err) {
    console.error('[Rules] GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch rules' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = createSchema.safeParse(await req.json())
  if (!body.success) {
    return NextResponse.json({ error: 'Invalid request', details: body.error.flatten() }, { status: 400 })
  }

  try {
    const rule = await db.emailRule.create({
      data: {
        userId: user.id,
        name: body.data.name,
        enabled: body.data.enabled ?? true,
        triggerField: body.data.triggerField,
        triggerOperator: body.data.triggerOperator,
        triggerValue: body.data.triggerValue,
        action: body.data.action,
        actionValue: body.data.actionValue,
        aiGenerated: body.data.aiGenerated ?? false,
      },
    })
    return NextResponse.json({ data: rule }, { status: 201 })
  } catch (err) {
    console.error('[Rules] POST error:', err)
    return NextResponse.json({ error: 'Failed to create rule' }, { status: 500 })
  }
}
