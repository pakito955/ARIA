// POST /api/ai/brain-dump
// Body: { transcript: string }
// Returns: BrainDumpResult + persisted entities
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/authOrToken'
import { prisma } from '@/lib/prisma'
import { parseBrainDump } from '@/agents/brainDumpAgent'
import { z } from 'zod'

const db = prisma as any

const schema = z.object({
  transcript: z.string().min(3).max(10000),
})

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = schema.safeParse(await req.json())
  if (!body.success) {
    return NextResponse.json({ error: 'Invalid request', details: body.error.flatten() }, { status: 400 })
  }

  const result = await parseBrainDump(body.data.transcript, {
    name: user.name || undefined,
    email: user.email ?? undefined,
  })

  // Persist tasks
  const createdTasks: any[] = []
  for (const task of result.tasks) {
    const created = await db.task.create({
      data: {
        userId: user.id,
        title: task.title,
        description: task.description || null,
        priority: task.priority,
        dueDate: task.dueDate ? new Date(task.dueDate) : null,
        status: 'TODO',
        source: 'AI_GENERATED',
      },
    })
    createdTasks.push(created)
  }

  // Persist contact notes (upsert — append to existing)
  const createdNotes: any[] = []
  for (const note of result.contactNotes) {
    const existing = await db.contactNote.findUnique({
      where: { userId_email: { userId: user.id, email: note.email } },
    })
    const newNoteText = existing
      ? `${existing.note}\n\n[Brain Dump ${new Date().toLocaleDateString()}]: ${note.note}`
      : note.note

    const upserted = await db.contactNote.upsert({
      where: { userId_email: { userId: user.id, email: note.email } },
      create: { userId: user.id, email: note.email, note: newNoteText, source: 'BRAIN_DUMP' },
      update: { note: newNoteText, source: 'BRAIN_DUMP' },
    })
    createdNotes.push(upserted)
  }

  // Persist draft emails to approval queue
  const createdDrafts: any[] = []
  for (const draft of result.draftEmails) {
    const created = await db.draftEmail.create({
      data: {
        userId: user.id,
        toEmail: draft.toEmail,
        subject: draft.subject,
        body: draft.body,
        source: 'BRAIN_DUMP',
        triggerType: 'voice_draft',
        status: 'PENDING',
      },
    })
    createdDrafts.push(created)
  }

  return NextResponse.json({
    result,
    persisted: {
      tasks: createdTasks.length,
      contactNotes: createdNotes.length,
      drafts: createdDrafts.length,
    },
  })
}
