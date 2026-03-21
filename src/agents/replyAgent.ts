import { complete } from '@/lib/anthropic'
import type { ReplyGenerationInput, ReplyGenerationOutput } from '@/types'

const BASE_SYSTEM = `Ti si ARIA, AI assistant koji pomaže korisniku pisati emailove.
Pišeš SAMO tekst odgovora — bez "Subject:", bez uvoda, bez "ARIA predlaže:".
Koristiš ISTI JEZIK kao original email.
Potpisuješ se kao korisnik (bez ARIA potpisa).`

export async function generateReplies(
  input: ReplyGenerationInput
): Promise<ReplyGenerationOutput> {
  const context = `Odgovaramo na email:
OD: ${input.fromName || input.fromEmail}
NASLOV: ${input.subject}
PORUKA: ${input.bodyText.substring(0, 1500)}`

  const [shortR, profR, friendlyR] = await Promise.all([
    complete(
      `${BASE_SYSTEM}\n\nSTIL: Kratak i direktan. Maksimalno 3 kratke rečenice. Potvrditi ili odgovoriti na ključnu tačku.`,
      context,
      200
    ),
    complete(
      `${BASE_SYSTEM}\n\nSTIL: Profesionalan i formalan. Pun pozdrav, adekvatno adresiranje, jasan odgovor sa svim relevantnim informacijama. 3-5 rečenica.`,
      context,
      350
    ),
    complete(
      `${BASE_SYSTEM}\n\nSTIL: Prijateljski i topao. Osobniji ton, ali profesionalan. 3-4 rečenice.`,
      context,
      280
    ),
  ])

  return {
    short: shortR.text.trim(),
    professional: profR.text.trim(),
    friendly: friendlyR.text.trim(),
  }
}
