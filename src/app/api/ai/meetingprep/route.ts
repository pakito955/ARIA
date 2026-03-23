import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/authOrToken'
import { prisma } from '@/lib/prisma'
import { generateMeetingPrep } from '@/agents/meetingPrepAgent'

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { emailId } = await req.json()
  if (!emailId) return NextResponse.json({ error: 'emailId required' }, { status: 400 })

  const email = await prisma.email.findFirst({
    where: { id: emailId, userId: user.id },
    include: { analysis: true },
  })
  if (!email) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const prep = await generateMeetingPrep({
    subject: email.subject,
    fromName: email.fromName ?? undefined,
    fromEmail: email.fromEmail,
    bodyText: email.bodyText,
    meetingTime: email.analysis?.meetingTime,
    participants: email.analysis?.meetingParticipants
      ? JSON.parse(email.analysis.meetingParticipants as string)
      : [],
  })

  return NextResponse.json({ prep })
}
