import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/authOrToken'
import { complete } from '@/lib/anthropic'

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { prompt, tone = 'professional', recipient } = await req.json()
  if (!prompt?.trim()) return NextResponse.json({ error: 'prompt required' }, { status: 400 })

  const result = await complete(
    'You are an expert email writer. Write clear, professional emails based on user instructions. Return ONLY the email content — no subject line, no "Dear" salutation unless specifically requested. Do not include explanations or meta-commentary.',
    `Write an email with the following instructions:
"${prompt}"

${recipient ? `Recipient: ${recipient}` : ''}
Tone: ${tone}

Return a JSON object with:
{"subject": "...", "body": "..."}

Body should be ready-to-send. No markdown. Use \\n for line breaks.`,
    600
  )

  try {
    const clean = result.text.replace(/```json\n?|\n?```/g, '').trim()
    const parsed = JSON.parse(clean)
    return NextResponse.json({ subject: parsed.subject || '', body: parsed.body || result.text })
  } catch {
    return NextResponse.json({ subject: '', body: result.text })
  }
}
