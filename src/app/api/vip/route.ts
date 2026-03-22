import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
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

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const contacts = await prisma.vipContact.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ data: contacts })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = addSchema.safeParse(await req.json())
  if (!body.success) {
    return NextResponse.json({ error: 'Invalid request', details: body.error.flatten() }, { status: 400 })
  }

  const { email, name, reason } = body.data

  const contact = await prisma.vipContact.upsert({
    where: { userId_email: { userId: session.user.id, email } },
    create: {
      userId: session.user.id,
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
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = deleteSchema.safeParse(await req.json())
  if (!body.success) {
    return NextResponse.json({ error: 'Invalid request', details: body.error.flatten() }, { status: 400 })
  }

  const { email } = body.data

  await prisma.vipContact.deleteMany({
    where: { userId: session.user.id, email },
  })

  return NextResponse.json({ success: true })
}
