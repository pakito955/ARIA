import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/authOrToken'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const format = searchParams.get('format') || 'json' // json | csv

  // Get all unique senders with stats
  const emails = await prisma.email.findMany({
    where: { userId: user.id },
    select: {
      fromEmail: true,
      fromName: true,
      receivedAt: true,
      isRead: true,
      analysis: { select: { priority: true, category: true, sentiment: true } },
    },
    orderBy: { receivedAt: 'desc' },
  })

  const vips = await prisma.vipContact.findMany({
    where: { userId: user.id },
    select: { email: true },
  })
  const vipSet = new Set(vips.map((v) => v.email))

  const tasks = await prisma.task.findMany({
    where: { userId: user.id },
    select: { email: { select: { fromEmail: true } }, status: true },
  })

  const taskCounts = new Map<string, number>()
  for (const t of tasks) {
    if (t.email?.fromEmail) {
      taskCounts.set(t.email.fromEmail, (taskCounts.get(t.email.fromEmail) || 0) + 1)
    }
  }

  // Aggregate per sender
  const contactMap = new Map<string, {
    email: string
    name: string
    totalEmails: number
    criticalEmails: number
    lastContact: string
    firstContact: string
    isVip: boolean
    tasks: number
    dominantCategory: string
  }>()

  for (const email of emails) {
    const key = email.fromEmail
    if (!contactMap.has(key)) {
      contactMap.set(key, {
        email: email.fromEmail,
        name: email.fromName || email.fromEmail,
        totalEmails: 0,
        criticalEmails: 0,
        lastContact: email.receivedAt.toISOString(),
        firstContact: email.receivedAt.toISOString(),
        isVip: vipSet.has(key),
        tasks: taskCounts.get(key) || 0,
        dominantCategory: email.analysis?.category || 'INFO',
      })
    }

    const c = contactMap.get(key)!
    c.totalEmails++
    if (email.analysis?.priority === 'CRITICAL') c.criticalEmails++
    if (email.receivedAt.toISOString() < c.firstContact) {
      c.firstContact = email.receivedAt.toISOString()
    }
  }

  const contacts = Array.from(contactMap.values())
    .filter((c) => !c.email.includes('noreply') && !c.email.includes('no-reply'))
    .sort((a, b) => b.totalEmails - a.totalEmails)

  if (format === 'csv') {
    const headers = ['Email', 'Name', 'Total Emails', 'Critical', 'Last Contact', 'First Contact', 'VIP', 'Tasks', 'Category']
    const rows = contacts.map((c) => [
      c.email,
      c.name,
      c.totalEmails,
      c.criticalEmails,
      c.lastContact.slice(0, 10),
      c.firstContact.slice(0, 10),
      c.isVip ? 'Yes' : 'No',
      c.tasks,
      c.dominantCategory,
    ])

    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="aria-contacts.csv"',
      },
    })
  }

  return NextResponse.json({ contacts, total: contacts.length })
}
