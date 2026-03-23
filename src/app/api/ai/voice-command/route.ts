import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/authOrToken'
import { prisma } from '@/lib/prisma'
import { completeJSON } from '@/lib/anthropic'

const SYSTEM_PROMPT = `You are ARIA's voice command interpreter.
The user speaks a command. You must determine their intent and return a JSON object.

Valid actions:
- ARCHIVE_EMAIL (requires context.selectedEmailId)
- COMPOSE_EMAIL
- READ_BRIEFING
- UNKNOWN

JSON Format:
{
  "action": "ARCHIVE_EMAIL" | "COMPOSE_EMAIL" | "READ_BRIEFING" | "UNKNOWN",
  "emailId": "string or null",
  "response": "Short confirmation string spoken back to the user, like 'Archiving email now.'"
}`

export async function POST(req: Request) {
  try {
    const user = await getAuthUser(req as any)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { command, context } = await req.json()
    if (!command) return NextResponse.json({ error: 'Missing command' }, { status: 400 })

    const result = await completeJSON(
      SYSTEM_PROMPT, 
      `Command: "${command}"\nContext: ${JSON.stringify(context)}`,
      300,
      { action: 'UNKNOWN', emailId: null, response: 'I did not understand.' }
    )

    if (result.action === 'READ_BRIEFING') {
      const unreadCount = await prisma.email.count({ where: { userId: user.id, isRead: false } })
      const criticalCount = await prisma.email.count({ 
        where: { userId: user.id, isRead: false, analysis: { is: { priority: 'CRITICAL' } } } 
      })
      const extra = criticalCount > 0 ? criticalCount + ' of them require your immediate attention.' : 'None are critical.'
      result.response = 'You have ' + unreadCount + ' unread emails. ' + extra
    }

    return NextResponse.json({
      action: result.action,
      emailId: result.action === 'ARCHIVE_EMAIL' ? context.selectedEmailId : null,
      response: result.response
    })

  } catch (error: any) {
    console.error('Voice command payload error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
