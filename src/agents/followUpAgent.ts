import { complete } from '@/lib/anthropic'

export async function generateFollowUp(
  recipientName: string,
  originalSubject: string,
  daysSince: number
): Promise<string> {
  const system = `You are ARIA. You write short, professional follow-up emails.
Goal: remind the recipient of the previous email, without being aggressive.
Language: same as the original email subject. Max 3-4 sentences.
Email body only — no "Subject:" or signature.`

  const { text } = await complete(
    system,
    `Write a follow-up for: ${recipientName}
Original subject: "${originalSubject}"
Days elapsed without a reply: ${daysSince}`,
    250
  )

  return text.trim()
}
