import { Queue } from 'bullmq'
import type { EmailSyncJob, EmailAnalysisJob, BriefingJob } from '@/types'

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

export const connection = parseRedisUrl(process.env.REDIS_URL || 'redis://localhost:6379')

const queueDefaults = {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
}

export const emailSyncQueue = new Queue<EmailSyncJob>('email-sync', queueDefaults)

export const emailAnalysisQueue = new Queue<EmailAnalysisJob>('email-analysis', {
  ...queueDefaults,
  defaultJobOptions: { ...queueDefaults.defaultJobOptions, attempts: 2 },
})

export const briefingQueue = new Queue<BriefingJob>('briefing', {
  ...queueDefaults,
  defaultJobOptions: { ...queueDefaults.defaultJobOptions, attempts: 2 },
})

export async function scheduleEmailSync(
  userId: string,
  integrationId: string,
  provider: 'GMAIL' | 'OUTLOOK',
  isInitial = false
) {
  return emailSyncQueue.add(
    `sync-${userId}-${provider}`,
    { userId, integrationId, provider, isInitial },
    { jobId: `sync-${integrationId}` }
  )
}

export async function scheduleEmailAnalysis(emailId: string, userId: string) {
  return emailAnalysisQueue.add(
    'analyze',
    { emailId, userId },
    { jobId: `analyze-${emailId}` }
  )
}

export async function scheduleBriefing(userId: string, date: string) {
  return briefingQueue.add(
    'briefing',
    { userId, date },
    { jobId: `briefing-${userId}-${date}` }
  )
}
