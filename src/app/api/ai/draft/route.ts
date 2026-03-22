import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { z } from 'zod'

// In-memory draft store (per user+email). In production this would be persisted to DB.
const draftStore = new Map<string, { draftText: string; style: string; updatedAt: Date }>()

const saveSchema = z.object({
  emailId: z.string(),
  draftText: z.string(),
  style: z.enum(['short', 'professional', 'friendly']).optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const emailId = req.nextUrl.searchParams.get('emailId')
  if (!emailId) {
    return NextResponse.json({ error: 'emailId required' }, { status: 400 })
  }

  const key = `${session.user.id}:${emailId}`
  const draft = draftStore.get(key)

  if (!draft) {
    return NextResponse.json({ data: null })
  }

  return NextResponse.json({ data: draft })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = saveSchema.safeParse(await req.json())
  if (!body.success) {
    return NextResponse.json({ error: 'Invalid request', details: body.error.flatten() }, { status: 400 })
  }

  const { emailId, draftText, style } = body.data
  const key = `${session.user.id}:${emailId}`

  draftStore.set(key, {
    draftText,
    style: style ?? 'professional',
    updatedAt: new Date(),
  })

  return NextResponse.json({ success: true, saved: true })
}
