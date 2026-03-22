import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { complete } from '@/lib/anthropic'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { draftText, contextSubject } = await req.json()
  if (!draftText?.trim()) return NextResponse.json({ tone: 'ok', warning: null })

  const result = await complete(
    'You are a professional email tone analyzer. Analyze the email draft and return ONLY a JSON object with no markdown, no code blocks.',
    `Email draft:\n"""\n${draftText.slice(0, 800)}\n"""\n\nContext subject: ${contextSubject || 'N/A'}\n\nReturn ONLY this JSON:\n{"tone": "ok" | "aggressive" | "passive" | "cold" | "too_casual", "warning": null or a short 1-sentence warning}\n\nOnly flag if there is a clear issue. Most professional emails should return "ok".`,
    100
  )

  try {
    const cleaned = result.text.replace(/```json\n?|\n?```/g, '').trim()
    const parsed = JSON.parse(cleaned)
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ tone: 'ok', warning: null })
  }
}
