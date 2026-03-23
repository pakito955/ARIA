import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/authOrToken'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const db = prisma as any

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  content: z.string().min(1).optional(),
  isDefault: z.boolean().optional(),
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
    const existing = await db.emailSignature.findFirst({
      where: { id, userId: user.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Signature not found' }, { status: 404 })
    }

    // If setting as default, unset others
    if (body.data.isDefault) {
      await db.emailSignature.updateMany({
        where: { userId: user.id, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      })
    }

    const updated = await db.emailSignature.update({
      where: { id },
      data: body.data,
    })

    return NextResponse.json({ data: updated })
  } catch (err) {
    console.error('[Signatures] PATCH error:', err)
    return NextResponse.json({ error: 'Failed to update signature' }, { status: 500 })
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
    const deleted = await db.emailSignature.deleteMany({
      where: { id, userId: user.id },
    })

    if (deleted.count === 0) {
      return NextResponse.json({ error: 'Signature not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Signatures] DELETE error:', err)
    return NextResponse.json({ error: 'Failed to delete signature' }, { status: 500 })
  }
}
