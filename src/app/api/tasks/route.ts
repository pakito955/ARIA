import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/authOrToken'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
  emailId: z.string().optional(),
})

const updateSchema = z.object({
  id: z.string(),
  title: z.string().min(1).optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED']).optional(),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional(),
  dueDate: z.string().nullable().optional(),
})

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const status = searchParams.get('status')

  const tasks = await prisma.task.findMany({
    where: {
      userId: user.id,
      ...(status ? { status: status as any } : { status: { not: 'CANCELLED' } }),
    },
    include: {
      email: { select: { subject: true, fromName: true, fromEmail: true } },
    },
    orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
  })

  return NextResponse.json({ data: tasks })
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = createSchema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: body.error.message }, { status: 400 })

  const task = await prisma.task.create({
    data: {
      ...body.data,
      userId: user.id,
      dueDate: body.data.dueDate ? new Date(body.data.dueDate) : null,
      source: 'MANUAL',
    },
  })

  return NextResponse.json({ data: task }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = updateSchema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: body.error.message }, { status: 400 })

  const { id, ...updates } = body.data

  const task = await prisma.task.updateMany({
    where: { id, userId: user.id },
    data: {
      ...updates,
      dueDate: updates.dueDate === null ? null : updates.dueDate ? new Date(updates.dueDate) : undefined,
    },
  })

  return NextResponse.json({ success: task.count > 0 })
}
