import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/authOrToken'

// Called by Vercel cron — checks follow-up reminders and creates notifications
// NOTE: This route uses new Prisma models (Notification, followUpAt) that require
// running `npx prisma db push` to activate.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const now = new Date()
  let notificationsCreated = 0
  let unsnoozed = 0

  try {
    const db = prisma as any

    // 1. Un-snooze emails where snoozeUntil has passed
    const snoozedEmails = await prisma.email.findMany({
      where: {
        isSnoozed: true,
        snoozeUntil: { lte: now },
      },
      select: { id: true, userId: true, subject: true },
    })

    if (snoozedEmails.length > 0) {
      await prisma.email.updateMany({
        where: { id: { in: snoozedEmails.map((e) => e.id) } },
        data: { isSnoozed: false, snoozeUntil: null },
      })

      // Create notifications for un-snoozed emails (requires Notification model)
      if (db.notification) {
        await db.notification.createMany({
          data: snoozedEmails.map((email: any) => ({
            userId: email.userId,
            type: 'snooze',
            title: 'Snoozed email is back',
            body: `"${email.subject.slice(0, 80)}" is back in your inbox`,
            emailId: email.id,
          })),
        })
        notificationsCreated += snoozedEmails.length
      }

      unsnoozed = snoozedEmails.length
    }

    // 2. Check follow-up reminders that are due
    const dueFollowups = await prisma.followupReminder.findMany({
      where: {
        isDone: false,
        dueAt: { lte: now },
      },
      include: {
        email: { select: { subject: true } },
      },
    })

    if (db.notification) {
      for (const reminder of dueFollowups) {
        const existingNotif = await db.notification.findFirst({
          where: {
            userId: reminder.userId,
            emailId: reminder.emailId,
            type: 'followup',
            createdAt: { gte: new Date(reminder.dueAt.getTime() - 60 * 1000) },
          },
        })

        if (!existingNotif) {
          await db.notification.create({
            data: {
              userId: reminder.userId,
              type: 'followup',
              title: 'Follow-up reminder',
              body: `Time to follow up on: "${reminder.email.subject.slice(0, 80)}"`,
              emailId: reminder.emailId,
            },
          })
          notificationsCreated++
        }
      }
    }

    return NextResponse.json({ unsnoozed, notificationsCreated, followupsChecked: dueFollowups.length })
  } catch (err) {
    console.error('[FollowupCheck] Error:', err)
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 })
  }
}
