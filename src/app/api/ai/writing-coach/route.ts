import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/authOrToken'
import { complete } from '@/lib/anthropic'

const HAIKU = 'claude-haiku-4-5'

interface WritingCoachResult {
  tone: string
  clarityScore: number
  suggestions: string[]
  improvedVersion: string
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { draft } = await req.json()
    if (!draft || typeof draft !== 'string') {
      return NextResponse.json({ error: 'draft (string) required' }, { status: 400 })
    }

    const system = `You are an expert writing coach for professional email communication.
Analyze the given email draft and return a JSON object with:
- "tone": string describing the tone (e.g., "Professional", "Casual", "Aggressive", "Friendly", "Formal")
- "clarityScore": number from 1-10 (10 being extremely clear)
- "suggestions": array of 2-4 specific improvement suggestions as strings
- "improvedVersion": an improved version of the draft

Return ONLY valid JSON, no markdown.`

    const prompt = `Analyze this email draft:\n\n${draft.slice(0, 3000)}`

    const { text } = await complete(system, prompt, 1500, HAIKU)

    let result: WritingCoachResult
    try {
      const clean = text.replace(/```json\n?|\n?```/g, '').trim()
      result = JSON.parse(clean)
    } catch {
      result = {
        tone: 'Professional',
        clarityScore: 7,
        suggestions: ['Consider being more concise', 'Add a clear call to action'],
        improvedVersion: draft,
      }
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('[WritingCoach] Error:', err)
    return NextResponse.json({ error: 'Writing coach analysis failed' }, { status: 500 })
  }
}
