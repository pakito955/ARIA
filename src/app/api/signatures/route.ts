import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/authOrToken'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const db = prisma as any

const createSchema = z.object({
  name: z.string().min(1).max(100),
  content: z.string().min(1),
  isDefault: z.boolean().optional().default(false),
})

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const signatures = await db.emailSignature.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    })
    return NextResponse.json({ data: signatures })
  } catch (err) {
    console.error('[Signatures] GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch signatures' }, { status: 500 })
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
    // If this is the default, unset existing default
    if (body.data.isDefault) {
      await db.emailSignature.updateMany({
        where: { userId: user.id, isDefault: true },
        data: { isDefault: false },
      })
    }

    const signature = await db.emailSignature.create({
      data: {
        userId: user.id,
        name: body.data.name,
        content: body.data.content,
        isDefault: body.data.isDefault ?? false,
      },
    })

    return NextResponse.json({ data: signature }, { status: 201 })
  } catch (err) {
    console.error('[Signatures] POST error:', err)
    return NextResponse.json({ error: 'Failed to create signature' }, { status: 500 })
  }
}
