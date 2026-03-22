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
  short: 'STIL: Kratak i direktan. Maksimalno 3 kratke rečenice.',
  professional: 'STIL: Profesionalan i formalan. Pun pozdrav, jasan odgovor. 3-5 rečenica.',
  friendly: 'STIL: Prijateljski i topao. Osobniji ton, ali profesionalan. 3-4 rečenice.',
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

  const BASE_SYSTEM = `Ti si ARIA, AI assistant koji pomaže korisniku pisati emailove.
Pišeš SAMO tekst odgovora — bez "Subject:", bez uvoda, bez "ARIA predlaže:".
Koristiš ISTI JEZIK kao original email.
Potpisuješ se kao korisnik (bez ARIA potpisa).`

  const stylePrompt = STYLE_PROMPTS[style]
  const customNote = instructions ? `\n\nDODATNA UPUTSTVA: ${instructions}` : ''
  const systemPrompt = `${BASE_SYSTEM}\n\n${stylePrompt}${customNote}`

  const context = `Odgovaramo na email:
OD: ${email.fromName || email.fromEmail}
NASLOV: ${email.subject}
PORUKA: ${email.bodyText.substring(0, 1500)}`

  const result = await complete(systemPrompt, context, 400)

  return NextResponse.json({ reply: result.text.trim(), style })
}
