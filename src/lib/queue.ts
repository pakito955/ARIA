import { Queue } from 'bullmq'
import type { EmailSyncJob, EmailAnalysisJob, BriefingJob } from '@/types'

const hasRedis = !!process.env.REDIS_URL && process.env.REDIS_URL !== 'redis://localhost:6379'

function parseRedisUrl(url: string) {
  try {
    const u = new URL(url)
    return {
      host: u.hostname || 'localhost',
      port: parseInt(u.port || '6379'),
      password: u.password || undefined,
      tls: u.protocol === 'rediss:' ? {} : undefined,
      maxRetriesPerRequest: null as null,
    }
  } catch {
    return { host: 'localhost', port: 6379, maxRetriesPerRequest: null as null }
  }
}

export const connection = hasRedis
  ? parseRedisUrl(process.env.REDIS_URL!)
  : { host: 'localhost', port: 6379, maxRetriesPerRequest: null as null }

const queueDefaults = {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
}

export const emailSyncQueue: Queue<EmailSyncJob> | null = hasRedis
  ? new Queue<EmailSyncJob>('email-sync', queueDefaults)
  : null

export const emailAnalysisQueue: Queue<EmailAnalysisJob> | null = hasRedis
  ? new Queue<EmailAnalysisJob>('email-analysis', {
      ...queueDefaults,
      defaultJobOptions: { ...queueDefaults.defaultJobOptions, attempts: 2 },
    })
  : null

export const briefingQueue: Queue<BriefingJob> | null = hasRedis
  ? new Queue<BriefingJob>('briefing', {
      ...queueDefaults,
      defaultJobOptions: { ...queueDefaults.defaultJobOptions, attempts: 2 },
    })
  : null

export const reportQueue: Queue<any> | null = hasRedis
  ? new Queue<any>('weekly-report', {
      ...queueDefaults,
      defaultJobOptions: { ...queueDefaults.defaultJobOptions, attempts: 2 },
    })
  : null

export async function scheduleEmailSync(
  userId: string,
  integrationId: string,
  provider: 'GMAIL' | 'OUTLOOK',
  isInitial = false
) {
  if (!emailSyncQueue) return null
  return emailSyncQueue.add(
    `sync-${userId}-${provider}`,
    { userId, integrationId, provider, isInitial },
    { jobId: `sync-${integrationId}` }
  )
}

export async function scheduleEmailAnalysis(emailId: string, userId: string) {
  if (!emailAnalysisQueue) return null
  return emailAnalysisQueue.add(
    'analyze',
    { emailId, userId },
    { jobId: `analyze-${emailId}` }
  )
}

export async function scheduleBriefing(userId: string, date: string) {
  if (!briefingQueue) return null
  return briefingQueue.add(
    'briefing',
    { userId, date },
    { jobId: `briefing-${userId}-${date}` }
  )
}

export async function scheduleWeeklyReport(userId: string, weekStart: string, weekEnd: string) {
  if (!reportQueue) return null
  return reportQueue.add(
    'weekly-report',
    { userId, weekStart, weekEnd },
    { jobId: `report-${userId}-${weekStart}` }
  )
}
