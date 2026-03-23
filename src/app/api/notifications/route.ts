import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/authOrToken'
import { prisma } from '@/lib/prisma'

// NOTE: Requires `npx prisma db push` to create the Notification table.
const db = prisma as any

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const notifications = await db.notification.findMany({
      where: { userId: user.id },
      orderBy: [{ read: 'asc' }, { createdAt: 'desc' }],
      take: 50,
    })

    const unreadCount = notifications.filter((n: any) => !n.read).length

    return NextResponse.json({ data: notifications, unreadCount })
  } catch (err) {
    console.error('[Notifications] GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}

// POST to mark all as read
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await db.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Notifications] POST error:', err)
    return NextResponse.json({ error: 'Failed to mark notifications as read' }, { status: 500 })
  }
}
