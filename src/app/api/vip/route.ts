import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/authOrToken'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const addSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  reason: z.string().optional(),
})

const deleteSchema = z.object({
  email: z.string().email(),
})

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const contacts = await prisma.vipContact.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ data: contacts })
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = addSchema.safeParse(await req.json())
  if (!body.success) {
    return NextResponse.json({ error: 'Invalid request', details: body.error.flatten() }, { status: 400 })
  }

  const { email, name, reason } = body.data

  const contact = await prisma.vipContact.upsert({
    where: { userId_email: { userId: user.id, email } },
    create: {
      userId: user.id,
      email,
      name,
      reason,
    },
    update: {
      name,
      reason,
    },
  })

  return NextResponse.json({ success: true, data: contact })
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = deleteSchema.safeParse(await req.json())
  if (!body.success) {
    return NextResponse.json({ error: 'Invalid request', details: body.error.flatten() }, { status: 400 })
  }

  const { email } = body.data

  await prisma.vipContact.deleteMany({
    where: { userId: user.id, email },
  })

  return NextResponse.json({ success: true })
}
