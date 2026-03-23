import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/authOrToken'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  try {
    const user = await getAuthUser(req as any)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const webhooks = await prisma.webhook.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(webhooks)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthUser(req as any)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { name, url, event } = await req.json()
    if (!name || !url || !event) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const webhook = await prisma.webhook.create({
      data: {
        userId: user.id,
        name,
        url,
        event
      }
    })

    return NextResponse.json(webhook)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getAuthUser(req as any)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'Select webhook to delete' }, { status: 400 })

    await prisma.webhook.deleteMany({
      where: { id, userId: user.id }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
