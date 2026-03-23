import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/authOrToken'
import { prisma } from '@/lib/prisma'
import { complete } from '@/lib/anthropic'
import { z } from 'zod'

const HAIKU = 'claude-haiku-4-5'

const schema = z.object({
  emailIds: z.array(z.string()).min(1).max(20),
  action: z.enum(['summarize', 'create-tasks', 'categorize']),
})

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = schema.safeParse(await req.json())
  if (!body.success) {
    return NextResponse.json({ error: 'Invalid request', details: body.error.flatten() }, { status: 400 })
  }

  const { emailIds, action } = body.data

  try {
    const emails = await prisma.email.findMany({
      where: { id: { in: emailIds }, userId: user.id },
      select: { id: true, subject: true, bodyText: true, fromEmail: true, fromName: true, analysis: true },
    })

    if (emails.length === 0) {
      return NextResponse.json({ error: 'No emails found' }, { status: 404 })
    }

    const results = await Promise.all(
      emails.map(async (email) => {
        try {
          if (action === 'summarize') {
            const system = 'Summarize this email in 1-2 sentences. Be concise. Return plain text only.'
            const { text } = await complete(system, `Subject: ${email.subject}\n\n${email.bodyText.slice(0, 1000)}`, 200, HAIKU)
            return { emailId: email.id, result: text.trim() }
          }

          if (action === 'create-tasks') {
            const system = `Extract actionable tasks from this email. Return a JSON array of objects with "title" and "priority" (HIGH|MEDIUM|LOW) fields. Return ONLY JSON, no markdown.`
            const { text } = await complete(system, `Subject: ${email.subject}\n\n${email.bodyText.slice(0, 1000)}`, 400, HAIKU)
            let tasks: { title: string; priority: string }[] = []
            try {
              const clean = text.replace(/```json\n?|\n?```/g, '').trim()
              tasks = JSON.parse(clean)
            } catch { tasks = [] }

            // Create tasks in DB
            if (tasks.length > 0) {
              await prisma.task.createMany({
                data: tasks.map((t) => ({
                  userId: user.id,
                  emailId: email.id,
                  title: t.title,
                  priority: t.priority || 'MEDIUM',
                  source: 'AI_GENERATED',
                })),
              })
            }

            return { emailId: email.id, result: tasks }
          }

          if (action === 'categorize') {
            const system = `Categorize this email into one of: MEETING, TASK, CRITICAL, INFO, SPAM, NEWSLETTER, INVOICE.
Also provide priority: CRITICAL, HIGH, MEDIUM, LOW.
Return JSON: {"category": string, "priority": string}. Return ONLY JSON.`
            const { text } = await complete(system, `Subject: ${email.subject}\n\n${email.bodyText.slice(0, 500)}`, 100, HAIKU)
            let cat: { category: string; priority: string } = { category: 'INFO', priority: 'MEDIUM' }
            try {
              const clean = text.replace(/```json\n?|\n?```/g, '').trim()
              cat = JSON.parse(clean)
            } catch { /* use defaults */ }
            return { emailId: email.id, result: cat }
          }

          return { emailId: email.id, result: null }
        } catch (err) {
          console.error(`[BulkAction] Error for email ${email.id}:`, err)
          return { emailId: email.id, error: 'Processing failed' }
        }
      })
    )

    return NextResponse.json({ results })
  } catch (err) {
    console.error('[BulkAction] Error:', err)
    return NextResponse.json({ error: 'Bulk action failed' }, { status: 500 })
  }
}
