import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 1x1 transparent GIF
const TRACKING_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
)

// NOTE: readReceiptToken, openedAt, openCount fields require `npx prisma db push` first.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  try {
    const db = prisma as any
    // Find email by readReceiptToken (new field — requires migration)
    const email = await db.email.findFirst({
      where: { readReceiptToken: token },
      select: { id: true, openedAt: true, openCount: true },
    })

    if (email) {
      await db.email.update({
        where: { id: email.id },
        data: {
          openedAt: email.openedAt ?? new Date(),
          openCount: { increment: 1 },
        },
      })
    }
  } catch (err) {
    // Silently fail — always return the pixel
    console.error('[Track] Error:', err)
  }

  return new NextResponse(TRACKING_PIXEL, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
    },
  })
}
