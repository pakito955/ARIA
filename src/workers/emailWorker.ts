/**
 * ARIA Background Workers
 * Run with: npm run queue:worker
 */

import { Worker } from 'bullmq'
import { connection as redisConnection } from '@/lib/queue'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encryption'
import { GmailProvider } from '@/lib/providers/gmail'
import { OutlookProvider } from '@/lib/providers/outlook'
import { classifyEmail } from '@/agents/classificationAgent'
import { generateBriefing } from '@/agents/briefingAgent'
import type { EmailSyncJob, EmailAnalysisJob, BriefingJob, WeeklyReportJob } from '@/types'

console.log('🤖 ARIA Worker starting...')

// ─── Email Sync Worker ────────────────────────────────────────────────────────

const syncWorker = new Worker<EmailSyncJob>(
  'email-sync',
  async (job) => {
    const { userId, integrationId, isInitial } = job.data

    const integration = await prisma.integration.findUnique({
      where: { id: integrationId },
    })
    if (!integration) throw new Error('Integration not found')

    const accessToken = decrypt(integration.accessToken)
    const refreshToken = integration.refreshToken ? decrypt(integration.refreshToken) : undefined

    let provider
    if (integration.provider === 'GMAIL') {
      provider = new GmailProvider(accessToken, refreshToken)
    } else {
      provider = new OutlookProvider(accessToken, refreshToken, async (newToken) => {
        const { encrypt } = await import('@/lib/encryption');
        const { prisma } = await import('@/lib/prisma');
        await prisma.integration.update({
          where: { id: integrationId },
          data: { accessToken: encrypt(newToken) },
        });
      })
    }

    const emails = await provider.fetchEmails({
      limit: isInitial ? 100 : 25,
      since: isInitial ? undefined : integration.lastSyncAt ?? undefined,
    })

    console.log(`[Sync] Fetched ${emails.length} emails for user ${userId}`)

    // Upsert emails in database
    let newCount = 0
    for (const email of emails) {
      const existing = await prisma.email.findUnique({
        where: {
          userId_provider_externalId: {
            userId,
            provider: email.provider,
            externalId: email.externalId,
          },
        },
      })

      if (!existing) {
        await prisma.email.create({
          data: {
            userId,
            provider: email.provider,
            externalId: email.externalId,
            threadId: email.threadId ? await upsertThread(userId, email) : null,
            subject: email.subject,
            bodyText: email.bodyText,
            bodyHtml: email.bodyHtml,
            fromEmail: email.fromEmail,
            fromName: email.fromName,
            toEmails: JSON.stringify(email.toEmails ?? []),
            ccEmails: JSON.stringify(email.ccEmails ?? []),
            isRead: email.isRead,
            isStarred: email.isStarred,
            labels: JSON.stringify(email.labels ?? []),
            hasAttachments: email.hasAttachments,
            receivedAt: email.receivedAt,
          },
        })
        newCount++
      }
    }

    // Update sync timestamp
    await prisma.integration.update({
      where: { id: integrationId },
      data: { lastSyncAt: new Date() },
    })

    // Queue analysis for new emails (auto-analyze setting)
    const settings = await prisma.userSettings.findUnique({ where: { userId } })
    if (settings?.autoAnalyze && newCount > 0) {
      const newEmails = await prisma.email.findMany({
        where: { userId, analysis: null },
        orderBy: { receivedAt: 'desc' },
        take: newCount,
        select: { id: true },
      })

      const { scheduleEmailAnalysis } = await import('@/lib/queue')
      await Promise.all(
        newEmails.map((e) => scheduleEmailAnalysis(e.id, userId))
      )
    }

    return { synced: emails.length, new: newCount }
  },
  { connection: redisConnection, concurrency: 3 }
)

// ─── Email Analysis Worker ────────────────────────────────────────────────────

const analysisWorker = new Worker<EmailAnalysisJob>(
  'email-analysis',
  async (job) => {
    const { emailId, userId } = job.data

    const email = await prisma.email.findUnique({ where: { id: emailId } })
    if (!email) throw new Error('Email not found')

    // Skip spam heuristics
    if (isLikelySpam(email.subject, email.fromEmail)) {
      await prisma.aIAnalysis.create({
        data: {
          emailId,
          userId,
          priority: 'LOW',
          category: 'SPAM',
          intent: 'Automatski newsletter ili spam',
          summary: 'Email klasificiran kao spam ili newsletter.',
          sentiment: 'NEUTRAL',
          urgencyScore: 1,
          suggestedAction: 'Ignorisati',
          meetingDetected: false,
          taskExtracted: false,
          confidenceScore: 0.85,
          meetingParticipants: '[]',
        },
      })
      return { skipped: true }
    }

    const start = Date.now()
    const analysis = await classifyEmail({
      subject: email.subject,
      bodyText: email.bodyText,
      fromEmail: email.fromEmail,
      fromName: email.fromName ?? undefined,
    })

    // Save analysis
    await prisma.aIAnalysis.create({
      data: {
        emailId,
        userId,
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
        processingMs: Date.now() - start,
      },
    })

    // CRM & Invoice Automation -> Webhooks
    if (analysis.category === 'INVOICE' || analysis.category === 'LEAD') {
      const eventName = analysis.category === 'INVOICE' ? 'INVOICE_RECEIVED' : 'LEAD_RECEIVED'
      const webhooks = await prisma.webhook.findMany({
        where: { userId, event: eventName, isActive: true },
      })
      for (const wh of webhooks) {
        try {
          await fetch(wh.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: eventName,
              emailId: email.id,
              subject: email.subject,
              from: email.fromEmail,
              amount: analysis.amount,
              summary: analysis.summary,
              receivedAt: email.receivedAt,
            }),
          })
          console.log(`[Webhook] Forwarded ${analysis.category.toLowerCase()} ${email.id} to ${wh.url}`)
        } catch (err) {
          console.error(`[Webhook] Failed sending to ${wh.url}:`, err)
        }
      }
    }

    // Auto create task if AI detected one
    if (analysis.taskExtracted && analysis.taskText) {
      const settings = await prisma.userSettings.findUnique({ where: { userId } })
      if (settings?.autoCreateTasks) {
        await prisma.task.create({
          data: {
            userId,
            emailId,
            title: analysis.taskText,
            priority: analysis.priority,
            source: 'AI_GENERATED',
            dueDate: analysis.deadlineText ? parseDateText(analysis.deadlineText) : null,
          },
        })
      }
    }

    return { emailId, priority: analysis.priority }
  },
  { connection: redisConnection, concurrency: 5 }
)

// ─── Briefing Worker ──────────────────────────────────────────────────────────

const briefingWorker = new Worker<BriefingJob>(
  'briefing',
  async (job) => {
    const { userId, date } = job.data

    const emails = await prisma.email.findMany({
      where: { userId, receivedAt: { gte: new Date(date) } },
      include: { analysis: true },
      orderBy: { receivedAt: 'desc' },
      take: 20,
    })

    const tasks = await prisma.task.findMany({
      where: { userId, status: { in: ['TODO', 'IN_PROGRESS'] } },
      orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
      take: 10,
    })

    const waitingCount = await prisma.email.count({
      where: {
        userId,
        receivedAt: { lte: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
        isRead: false,
      },
    })

    const content = await generateBriefing({
      emails: emails.map((e) => ({
        sender: e.fromName || e.fromEmail,
        subject: e.subject,
        category: e.analysis?.category || 'INFO',
        priority: e.analysis?.priority || 'MEDIUM',
      })),
      todayEvents: [],
      pendingTasks: tasks.map((t) => ({
        id: t.id,
        userId: t.userId,
        title: t.title,
        priority: t.priority,
        status: t.status,
        source: t.source,
        createdAt: t.createdAt,
        dueDate: t.dueDate ?? undefined,
      })),
      waitingReplies: waitingCount,
    } as any)

    await prisma.briefing.upsert({
      where: { userId_date: { userId, date: new Date(date) } },
      create: {
        userId,
        date: new Date(date),
        content,
        emailCount: emails.length,
        criticalCount: emails.filter((e) => e.analysis?.priority === 'CRITICAL').length,
        tasksCount: tasks.length,
        waitingCount,
      },
      update: { content },
    })

    return { briefingGenerated: true }
  },
  { connection: redisConnection, concurrency: 2 }
)

// ─── Event handlers ───────────────────────────────────────────────────────────

syncWorker.on('completed', (job, result) => {
  console.log(`✅ [Sync] Job ${job.id} done:`, result)
})

syncWorker.on('failed', (job, err) => {
  console.error(`❌ [Sync] Job ${job?.id} failed:`, err.message)
})

analysisWorker.on('completed', (job, result) => {
  console.log(`✅ [Analysis] ${result.emailId} → ${result.priority}`)
})

analysisWorker.on('failed', (job, err) => {
  console.error(`❌ [Analysis] Job ${job?.id} failed:`, err.message)
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function upsertThread(userId: string, email: any): Promise<string | null> {
  if (!email.threadId) return null
  try {
    const thread = await prisma.thread.upsert({
      where: {
        userId_provider_externalId: {
          userId,
          provider: email.provider,
          externalId: email.threadId,
        },
      },
      create: {
        userId,
        provider: email.provider,
        externalId: email.threadId,
        subject: email.subject,
        participants: JSON.stringify([email.fromEmail]),
        lastEmailAt: email.receivedAt,
      },
      update: {
        lastEmailAt: email.receivedAt,
        messageCount: { increment: 1 },
      },
    })
    return thread.id
  } catch {
    return null
  }
}

function isLikelySpam(subject: string, fromEmail: string): boolean {
  const spamDomains = ['noreply@', 'no-reply@', 'newsletter@', 'marketing@', 'notifications@']
  const spamKeywords = ['unsubscribe', 'weekly digest', 'newsletter', 'promotion', 'offer expires']

  if (spamDomains.some((d) => fromEmail.toLowerCase().includes(d))) return true
  if (spamKeywords.some((k) => subject.toLowerCase().includes(k))) return true
  return false
}

function parseDateText(text: string): Date | null {
  // Simple heuristic: look for common date formats
  const now = new Date()
  const lower = text.toLowerCase()

  if (lower.includes('danas') || lower.includes('today')) {
    return now
  }
  if (lower.includes('sutra') || lower.includes('tomorrow')) {
    return new Date(now.getTime() + 24 * 60 * 60 * 1000)
  }
  if (lower.includes('petak') || lower.includes('friday')) {
    const daysUntilFriday = (5 - now.getDay() + 7) % 7 || 7
    return new Date(now.getTime() + daysUntilFriday * 24 * 60 * 60 * 1000)
  }

  // Try parsing as date string
  const parsed = new Date(text)
  return isNaN(parsed.getTime()) ? null : parsed
}

const reportWorker = new Worker<WeeklyReportJob>(
  'weekly-report',
  async (job) => {
    // 1. If it's the global cron ping, schedule individual jobs for all users
    if (job.data.isGlobalCron) {
      console.log('📅 [Report] Global cron triggered. Enqueuing individual reports...')
      const users = await prisma.user.findMany({ select: { id: true } })
      const now = new Date()
      // Use date-fns startOfWeek/endOfWeek logic equivalent 
      const daysSinceMonday = (now.getDay() || 7) - 1
      const weekStart = new Date(now)
      weekStart.setDate(weekStart.getDate() - daysSinceMonday)
      weekStart.setHours(0, 0, 0, 0)
      
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)
      weekEnd.setHours(23, 59, 59, 999)

      const { reportQueue } = await import('@/lib/queue')
      if (reportQueue) {
        for (const user of users) {
          await reportQueue.add(
            'weekly-report-user',
            { userId: user.id, weekStart: weekStart.toISOString(), weekEnd: weekEnd.toISOString() },
            { jobId: `report-${user.id}-${weekStart.toISOString()}` }
          )
        }
      }
      return { success: true, count: users.length }
    }

    // 2. Process individual user report
    const { userId, weekStart, weekEnd } = job.data
    if (!userId || !weekStart || !weekEnd) throw new Error('Missing job data')

    const start = new Date(weekStart)
    const end = new Date(weekEnd)

    // Calculate stats
    const [emails, analyses, completedTasks, criticalEmails] = await Promise.all([
      prisma.email.count({ where: { userId, receivedAt: { gte: start, lte: end } } }),
      prisma.aIAnalysis.count({ where: { userId, createdAt: { gte: start } } }),
      prisma.task.count({ where: { userId, status: 'DONE', updatedAt: { gte: start } } }),
      prisma.email.count({
        where: { userId, receivedAt: { gte: start, lte: end }, analysis: { priority: { in: ['CRITICAL', 'HIGH'] } } }
      })
    ])

    const timeSaved = Math.round((analyses * 2) / 60 * 10) / 10

    // Fetch primary integration to send FROM
    const integration = await prisma.integration.findFirst({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'asc' }
    })
    
    if (!integration) {
      console.log(`[Report] User ${userId} has no active integration. Skipping.`)
      return { skipped: true }
    }

    const htmlBody = buildWeeklyReportHtml({
      emails, analyses, completedTasks, criticalEmails, timeSaved,
      weekStartStr: start.toLocaleDateString('bs-BA', { day: 'numeric', month: 'long' }),
      weekEndStr: end.toLocaleDateString('bs-BA', { day: 'numeric', month: 'long', year: 'numeric' })
    })

    const accessToken = decrypt(integration.accessToken)
    
    try {
      if (integration.provider === 'GMAIL') {
        const gmail = new GmailProvider(accessToken, integration.refreshToken ? decrypt(integration.refreshToken) : undefined)
        await gmail.sendEmail({
          to: [integration.email],
          subject: `Sedmični ARIA Izvještaj: ${timeSaved} sati ušteđeno! 🚀`,
          body: 'Your email client does not support HTML. Please view ARIA dashboard.',
          html: htmlBody
        })
      } else {
        const outlook = new OutlookProvider(accessToken, integration.refreshToken ? decrypt(integration.refreshToken) : undefined, () => {})
        await outlook.sendEmail({
          to: [integration.email],
          subject: `Sedmični ARIA Izvještaj: ${timeSaved} sati ušteđeno! 🚀`,
          body: 'Your email client does not support HTML. Please view ARIA dashboard.',
          html: htmlBody // Wait, outlook provider supports HTML if modify it or if it accepts body. Both providers do via our interface.
        })
      }
      console.log(`✅ [Report] Sent to ${integration.email}`)
    } catch (err: any) {
      console.error(`❌ [Report] Failed to send report to ${integration.email}: ${err.message}`)
      throw err
    }

    return { sent: true }
  },
  { connection: redisConnection, concurrency: 2 }
)

// Schedule the global cron on startup
import { reportQueue } from '@/lib/queue'
if (reportQueue) {
  reportQueue.add(
    'weekly-global-cron',
    { isGlobalCron: true },
    { repeat: { pattern: '0 16 * * 5' }, jobId: 'weekly-global-cron' } // Every Friday 16:00
  ).catch(console.error)
}

function buildWeeklyReportHtml(data: any) {
  return `
  <!DOCTYPE html>
  <html lang="bs">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ARIA Weekly Report</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #09090b; color: #ececf1; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <div style="max-w-width: 600px; margin: 0 auto; background-color: #0B0B0F; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 40px;">
        <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #7C5CFF, #A78BFA); border-radius: 12px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; color: white;">A</div>
        <h1 style="margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.5px;">Tvoj ARIA Sedmični Izvještaj</h1>
        <p style="margin: 8px 0 0; color: #a1a1aa; font-size: 14px;">${data.weekStartStr} — ${data.weekEndStr}</p>
      </div>

      <div style="background-color: #12121A; border: 1px solid #1F1F2E; border-radius: 16px; padding: 32px; margin-bottom: 24px;">
        <h2 style="margin: 0 0 8px; font-size: 16px; color: #a1a1aa; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">Vrijeme ušteđeno ove sedmice</h2>
        <div style="font-size: 48px; font-weight: 700; color: #A78BFA; line-height: 1;">${data.timeSaved} sati</div>
        <p style="margin: 12px 0 0; color: #71717a; font-size: 14px;">ARIA je analizirala i sortirala tvoje mailove, štedeći ti vrijeme i fokus.</p>
      </div>

      <div style="display: flex; gap: 16px; margin-bottom: 24px;">
        <div style="flex: 1; background-color: #12121A; border: 1px solid #1F1F2E; border-radius: 16px; padding: 24px; text-align: center;">
          <div style="font-size: 28px; font-weight: 600; color: #fff; margin-bottom: 4px;">${data.analyses}</div>
          <div style="font-size: 12px; color: #a1a1aa;">Emailova analizirano</div>
        </div>
        <div style="flex: 1; background-color: #12121A; border: 1px solid #1F1F2E; border-radius: 16px; padding: 24px; text-align: center;">
          <div style="font-size: 28px; font-weight: 600; color: #34d399; margin-bottom: 4px;">${data.criticalEmails}</div>
          <div style="font-size: 12px; color: #a1a1aa;">Kritičnih poruka</div>
        </div>
        <div style="flex: 1; background-color: #12121A; border: 1px solid #1F1F2E; border-radius: 16px; padding: 24px; text-align: center;">
          <div style="font-size: 28px; font-weight: 600; color: #60a5fa; margin-bottom: 4px;">${data.completedTasks}</div>
          <div style="font-size: 12px; color: #a1a1aa;">Zadataka završeno</div>
        </div>
      </div>

      <div style="text-align: center; border-top: 1px solid #1F1F2E; padding-top: 32px; margin-top: 32px;">
        <p style="margin: 0; color: #71717a; font-size: 12px;">Prijatan vikend ti želi tvoj AI asistent.</p>
      </div>
    </div>
  </body>
  </html>
  `
}

process.on('SIGTERM', async () => {
  await syncWorker.close()
  await analysisWorker.close()
  await briefingWorker.close()
  await reportWorker.close()
  process.exit(0)
})

