import { NextRequest, NextResponse } from 'next/server'
import { ingestEmailIntoKnowledge } from '@/agents/knowledgeAgent'

// Internal endpoint — secured by internal key
export async function POST(req: NextRequest) {
  const internalKey = req.headers.get('x-internal-key')
  if (internalKey !== (process.env.INTERNAL_API_KEY || 'aria-internal')) {
    // Also allow authenticated users
    const { getAuthUser } = await import('@/lib/authOrToken')
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const body = await req.json()
    const { userId, type, subject, body: emailBody, fromEmail, toEmail } = body

    if (!userId || !type || !subject || !emailBody) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Run ingestion asynchronously — respond immediately
    ingestEmailIntoKnowledge({
      userId,
      subject,
      body: emailBody,
      fromEmail,
      toEmail,
      type,
    }).catch((err) => console.error('[Ingest] Background error:', err))

    return NextResponse.json({ success: true, message: 'Ingestion queued' })
  } catch (err) {
    console.error('[Ingest] Error:', err)
    return NextResponse.json({ error: 'Ingest failed' }, { status: 500 })
  }
}
