// GET /api/queue  — list pending drafts
// POST /api/queue — create a draft manually
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/authOrToken'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const db = prisma as any

const createSchema = z.object({
  toEmail: z.string().email(),
  subject: z.string().min(1).max(500),
  body: z.string().min(1),
  source: z.enum(['RULE', 'WEBHOOK', 'BRAIN_DUMP']).optional().default('RULE'),
  triggerType: z.string().optional(),
  triggerData: z.string().optional(),
  ruleId: z.string().optional(),
  sourceEmailId: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || 'PENDING'

  const drafts = await db.draftEmail.findMany({
    where: { userId: user.id, status },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  const total = await db.draftEmail.count({
    where: { userId: user.id, status: 'PENDING' },
  })

  return NextResponse.json({ data: drafts, pendingCount: total })
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = createSchema.safeParse(await req.json())
  if (!body.success) {
    return NextResponse.json({ error: 'Invalid request', details: body.error.flatten() }, { status: 400 })
  }

  const draft = await db.draftEmail.create({
    data: { userId: user.id, ...body.data },
  })

  return NextResponse.json({ data: draft }, { status: 201 })
}
