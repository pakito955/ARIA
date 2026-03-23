import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const template = await prisma.emailTemplate.updateMany({
    where: { id, userId: session.user.id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.subject !== undefined && { subject: body.subject }),
      ...(body.body !== undefined && { body: body.body }),
      ...(body.category !== undefined && { category: body.category }),
      ...(body.variables !== undefined && { variables: JSON.stringify(body.variables) }),
    },
  })

  return NextResponse.json({ updated: template.count })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await prisma.emailTemplate.deleteMany({ where: { id, userId: session.user.id } })

  return NextResponse.json({ deleted: true })
}

// Increment useCount when template is used
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await prisma.emailTemplate.updateMany({
    where: { id, userId: session.user.id },
    data: { useCount: { increment: 1 } },
  })

  return NextResponse.json({ ok: true })
}
