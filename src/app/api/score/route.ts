import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { startOfDay, endOfDay, subDays } from 'date-fns'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id
  const today = new Date()
  const todayStart = startOfDay(today)
  const todayEnd = endOfDay(today)

  const [emailsRead, tasksCompleted, analysesRun, totalEmails] = await Promise.all([
    prisma.email.count({ where: { userId, isRead: true, updatedAt: { gte: todayStart, lte: todayEnd } } }),
    prisma.task.count({ where: { userId, status: 'DONE', updatedAt: { gte: todayStart, lte: todayEnd } } }),
    prisma.aIAnalysis.count({ where: { userId, createdAt: { gte: todayStart, lte: todayEnd } } }),
    prisma.email.count({ where: { userId, receivedAt: { gte: todayStart, lte: todayEnd } } }),
  ])

  // Score breakdown (max 100)
  const readScore = Math.min(emailsRead * 2, 30)
  const taskScore = Math.min(tasksCompleted * 5, 30)
  const analysisScore = Math.min(analysesRun * 3, 20)
  const replyRate = totalEmails > 0 ? emailsRead / totalEmails : 0
  const replyScore = replyRate > 0.5 ? 20 : Math.round(replyRate * 40)

  const score = readScore + taskScore + analysisScore + replyScore

  // Streak: count consecutive days with score > 0
  let streak = 0
  for (let i = 1; i <= 30; i++) {
    const d = subDays(today, i)
    const count = await prisma.email.count({
      where: { userId, isRead: true, updatedAt: { gte: startOfDay(d), lte: endOfDay(d) } },
    })
    if (count > 0) streak++
    else break
  }

  return NextResponse.json({
    score,
    streak,
    breakdown: { emailsRead, tasksCompleted, analysesRun, replyRate: Math.round(replyRate * 100) },
  })
}
