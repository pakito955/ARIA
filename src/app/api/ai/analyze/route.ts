import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { classifyEmail } from '@/agents/classificationAgent'
import { generateReplies } from '@/agents/replyAgent'
import { z } from 'zod'

const schema = z.object({ emailId: z.string() })

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = schema.safeParse(await req.json())
  if (!body.success) {
    return NextResponse.json({ error: 'emailId required' }, { status: 400 })
  }

  const { emailId } = body.data

  const email = await prisma.email.findFirst({
    where: { id: emailId, userId: session.user.id },
    include: { analysis: true },
  })

  if (!email) {
    return NextResponse.json({ error: 'Email not found' }, { status: 404 })
  }

  // Return cached analysis if exists
  if (email.analysis) {
    return NextResponse.json({ data: email.analysis, cached: true })
  }

  const start = Date.now()

  // Run classification + reply generation in parallel
  const [analysis, replies] = await Promise.all([
    classifyEmail({
      subject: email.subject,
      bodyText: email.bodyText,
      fromEmail: email.fromEmail,
      fromName: email.fromName ?? undefined,
    }),
    generateReplies({
      subject: email.subject,
      bodyText: email.bodyText,
      fromEmail: email.fromEmail,
      fromName: email.fromName ?? undefined,
    }),
  ])

  const processingMs = Date.now() - start

  // Save to DB (SQLite: arrays stored as JSON strings)
  const saved = await prisma.aIAnalysis.create({
    data: {
      emailId,
      userId: session.user.id,
      priority: analysis.priority,
      category: analysis.category,
      intent: analysis.intent,
      summary: analysis.summary,
      deadlineText: analysis.deadlineText,
      amount: analysis.amount,
      sentiment: analysis.sentiment,
      urgencyScore: analysis.urgencyScore,
      suggestedAction: analysis.suggestedAction,
      meetingDetected: analysis.meetingDetected,
      meetingTime: analysis.meetingTime,
      meetingParticipants: JSON.stringify(analysis.meetingParticipants ?? []),
      taskExtracted: analysis.taskExtracted,
      taskText: analysis.taskText,
      confidenceScore: analysis.confidenceScore,
      replyShort: replies.short,
      replyProfessional: replies.professional,
      replyFriendly: replies.friendly,
      processingMs,
    },
  })

  // Auto-create task if detected
  if (analysis.taskExtracted && analysis.taskText) {
    await prisma.task.upsert({
      where: { id: `email-task-${emailId}` },
      create: {
        id: `email-task-${emailId}`,
        userId: session.user.id,
        emailId,
        title: analysis.taskText,
        priority: analysis.priority,
        source: 'AI_GENERATED',
      },
      update: {},
    })
  }

  return NextResponse.json({ data: saved, cached: false })
}
