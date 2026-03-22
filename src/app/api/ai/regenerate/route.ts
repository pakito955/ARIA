import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { complete } from '@/lib/anthropic'
import { z } from 'zod'

const schema = z.object({
  emailId: z.string(),
  style: z.enum(['short', 'professional', 'friendly']).default('professional'),
  instructions: z.string().optional(),
})

const STYLE_PROMPTS: Record<string, string> = {
  short: 'STYLE: Short and direct. Maximum 3 brief sentences.',
  professional: 'STYLE: Professional and formal. Full greeting, clear response. 3-5 sentences.',
  friendly: 'STYLE: Friendly and warm. More personal tone, yet professional. 3-4 sentences.',
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = schema.safeParse(await req.json())
  if (!body.success) {
    return NextResponse.json({ error: 'Invalid request', details: body.error.flatten() }, { status: 400 })
  }

  const { emailId, style, instructions } = body.data

  const email = await prisma.email.findFirst({
    where: { id: emailId, userId: session.user.id },
    include: { analysis: true },
  })

  if (!email) {
    return NextResponse.json({ error: 'Email not found' }, { status: 404 })
  }

  const BASE_SYSTEM = `You are ARIA, an AI assistant that helps the user write emails.
Write ONLY the reply body — no "Subject:", no preamble, no "ARIA suggests:".
Use the SAME LANGUAGE as the original email.
Sign as the user (no ARIA signature).`

  const stylePrompt = STYLE_PROMPTS[style]
  const customNote = instructions ? `\n\nADDITIONAL INSTRUCTIONS: ${instructions}` : ''
  const systemPrompt = `${BASE_SYSTEM}\n\n${stylePrompt}${customNote}`

  const context = `Replying to email:
FROM: ${email.fromName || email.fromEmail}
SUBJECT: ${email.subject}
MESSAGE: ${email.bodyText.substring(0, 1500)}`

  const result = await complete(systemPrompt, context, 400)

  return NextResponse.json({ reply: result.text.trim(), style })
}
