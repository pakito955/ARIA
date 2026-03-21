import { complete } from '@/lib/anthropic'

export async function generateFollowUp(
  recipientName: string,
  originalSubject: string,
  daysSince: number
): Promise<string> {
  const system = `Ti si ARIA. Pišeš kratke, profesionalne follow-up emailove.
Cilj: podsjetiti primatelja na prethodni email, bez agresivnosti.
Jezik: isti kao originalni naslov emaila. Max 3-4 rečenice.
Samo tekst emaila, bez "Subject:" ili potpisa.`

  const { text } = await complete(
    system,
    `Piši follow-up za: ${recipientName}
Originalni predmet: "${originalSubject}"
Prošlo dana bez odgovora: ${daysSince}`,
    250
  )

  return text.trim()
}
