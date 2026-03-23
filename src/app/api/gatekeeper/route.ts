import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/authOrToken'
import { prisma } from '@/lib/prisma'

// GET all VIP contacts for the user
export async function GET(req: Request) {
  try {
    const user = await getAuthUser(req as any)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const vips = await prisma.vipContact.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(vips)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// ADD a new VIP contact
export async function POST(req: Request) {
  try {
    const user = await getAuthUser(req as any)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { email, name, reason } = await req.json()
    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })

    const vip = await prisma.vipContact.upsert({
      where: {
        userId_email: { userId: user.id, email }
      },
      update: {
        name,
        reason
      },
      create: {
        userId: user.id,
        email,
        name,
        reason
      }
    })

    return NextResponse.json(vip)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// REMOVE a VIP contact
export async function DELETE(req: Request) {
  try {
    const user = await getAuthUser(req as any)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id, email } = await req.json()
    
    if (id) {
      await prisma.vipContact.delete({
        where: { id }
      })
    } else if (email) {
      await prisma.vipContact.delete({
        where: { userId_email: { userId: user.id, email } }
      })
    } else {
      return NextResponse.json({ error: 'Must provide id or email' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
