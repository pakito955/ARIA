import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/authOrToken'
import { prisma } from '@/lib/prisma'
import { complete } from '@/lib/anthropic'

const HAIKU = 'claude-haiku-4-5'

interface MeetingDetection {
  isMeetingRequest: boolean
  suggestedTitle: string
  suggestedDuration: number
  extractedDate?: string
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { emailId } = await req.json()
    if (!emailId) {
      return NextResponse.json({ error: 'emailId required' }, { status: 400 })
    }

    const email = await prisma.email.findFirst({
      where: { id: emailId, userId: user.id },
      select: { subject: true, bodyText: true, fromName: true, fromEmail: true, analysis: true },
    })

    if (!email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 })
    }

    // Use existing analysis if available
    if (email.analysis?.meetingDetected !== undefined) {
      return NextResponse.json({
        isMeetingRequest: email.analysis.meetingDetected,
        suggestedTitle: email.analysis.meetingDetected ? email.subject : '',
        suggestedDuration: 60,
        extractedDate: email.analysis.meetingTime || undefined,
      })
    }

    const system = `You are an assistant that detects meeting requests in emails.
Return a JSON object with:
- "isMeetingRequest": boolean
- "suggestedTitle": string (meeting title if it is a request, empty string otherwise)
- "suggestedDuration": number (suggested duration in minutes, e.g. 30, 60, 90)
- "extractedDate": string (ISO date string if a specific date/time was mentioned, null otherwise)

Return ONLY valid JSON, no markdown.`

    const prompt = `Subject: ${email.subject}
From: ${email.fromName || email.fromEmail}

${email.bodyText.slice(0, 1500)}`

    const { text } = await complete(system, prompt, 400, HAIKU)

    let result: MeetingDetection
    try {
      const clean = text.replace(/```json\n?|\n?```/g, '').trim()
      result = JSON.parse(clean)
    } catch {
      result = {
        isMeetingRequest: false,
        suggestedTitle: '',
        suggestedDuration: 60,
      }
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('[DetectMeeting] Error:', err)
    return NextResponse.json({ error: 'Meeting detection failed' }, { status: 500 })
  }
}
