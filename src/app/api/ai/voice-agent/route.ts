import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/authOrToken'
import { anthropic, DEFAULT_MODEL } from '@/lib/anthropic'
import { prisma } from '@/lib/prisma'
import { GmailProvider } from '@/lib/providers/gmail'
import { decrypt } from '@/lib/encryption'

const SYSTEM_PROMPT = `You are ARIA, a highly capable AI executive assistant for the user.
You communicate via Voice, so keep your responses short, conversational, and natural. Avoid markdown formatting or long lists.
You have tools to perform actions like searching emails, drafting emails, sending emails, and managing the calendar.
If the user asks you to do a multi-step task, use tools step by step. If you need user confirmation before sending an email or booking a calendar event, ask them!

If they say "schedule a meeting", you might need to find the person's email if you don't know it, draft an email, read it back to the user, and wait for them to say "Send it".`

export async function POST(req: Request) {
  try {
    const user = await getAuthUser(req as any)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { messages, context } = await req.json()
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Missing messages array' }, { status: 400 })
    }

    // Prepare tools
    const tools: any[] = [
      {
        name: 'search_emails',
        description: 'Search the user inbox for emails from a specific person or topic.',
        input_schema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query (e.g., name, email, or keywords)' }
          },
          required: ['query']
        }
      },
      {
        name: 'draft_email',
        description: 'Drafts an email to a recipient. Use this before sending to get user approval.',
        input_schema: {
          type: 'object',
          properties: {
            to: { type: 'string' },
            subject: { type: 'string' },
            body: { type: 'string' }
          },
          required: ['to', 'subject', 'body']
        }
      },
      {
        name: 'send_email',
        description: 'Sends the email. ONLY call this AFTER the user has explicitly confirmed the draft.',
        input_schema: {
          type: 'object',
          properties: {
            to: { type: 'string' },
            subject: { type: 'string' },
            body: { type: 'string' }
          },
          required: ['to', 'subject', 'body']
        }
      },
      {
        name: 'create_calendar_event',
        description: 'Books an event on the user calendar.',
        input_schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            startTime: { type: 'string', description: 'ISO string' },
            endTime: { type: 'string', description: 'ISO string' },
            participants: { type: 'array', items: { type: 'string' } }
          },
          required: ['title', 'startTime', 'endTime', 'participants']
        }
      }
    ]

    // Construct the conversation thread for Anthropic
    let currentMessages = [...messages]
    let isRunning = true
    let finalAssistantMessage = ''

    while (isRunning) {
      const response = await anthropic.messages.create({
        model: DEFAULT_MODEL,
        max_tokens: 1000,
        system: SYSTEM_PROMPT + `\n\nContext block: The current time is ${new Date().toISOString()}`,
        messages: currentMessages,
        tools: tools,
      })

      // We append the assistant's turn to the conversation
      currentMessages.push({
        role: 'assistant',
        content: response.content
      })

      if (response.stop_reason === 'tool_use') {
        const toolResults = []
        for (const block of response.content) {
          if (block.type === 'tool_use') {
            const toolName = block.name
            const toolInput = block.input as any
            const toolId = block.id

            let resultString = ''
            try {
              if (toolName === 'search_emails') {
                const emails = await prisma.email.findMany({
                  where: { userId: user.id, OR: [{ fromName: { contains: toolInput.query, mode: 'insensitive' } }, { fromEmail: { contains: toolInput.query, mode: 'insensitive' } }] },
                  select: { subject: true, fromName: true, fromEmail: true },
                  take: 5
                })
                resultString = JSON.stringify(emails)
              } else if (toolName === 'draft_email') {
                resultString = `Draft created successfully. Read the body back to the user to confirm: "${toolInput.body}"`
              } else if (toolName === 'send_email') {
                const integration = await prisma.integration.findFirst({ where: { userId: user.id, isActive: true } })
                if (integration && integration.provider === 'GMAIL') {
                  const gmail = new GmailProvider(decrypt(integration.accessToken), integration.refreshToken ? decrypt(integration.refreshToken) : undefined)
                  await gmail.sendEmail({ to: [toolInput.to], subject: toolInput.subject, body: toolInput.body })
                  resultString = "Email sent successfully."
                } else {
                  resultString = "Error: Email integration not found or unsupported."
                }
              } else if (toolName === 'create_calendar_event') {
                const integration = await prisma.integration.findFirst({ where: { userId: user.id, isActive: true } })
                if (integration && integration.provider === 'GMAIL') {
                  const gmail = new GmailProvider(decrypt(integration.accessToken), integration.refreshToken ? decrypt(integration.refreshToken) : undefined)
                  await gmail.createCalendarEvent({
                    title: toolInput.title,
                    startTime: new Date(toolInput.startTime),
                    endTime: new Date(toolInput.endTime),
                    participants: toolInput.participants
                  })
                  resultString = "Calendar event created successfully."
                } else {
                  resultString = "Error: Calendar integration not found."
                }
              } else {
                resultString = "Unknown tool."
              }
            } catch (err: any) {
              resultString = `Tool execution failed: ${err.message}`
            }

            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolId,
              content: resultString
            })
          }
        }

        // Pass tool results back to Anthropic
        currentMessages.push({
          role: 'user',
          content: toolResults
        })

      } else {
        // Stop reason is end_turn or max_tokens. We got our final text response
        isRunning = false
        const textBlock = response.content.find((c: any) => c.type === 'text')
        if (textBlock && textBlock.type === 'text') {
          finalAssistantMessage = textBlock.text
        }
      }
    }

    return NextResponse.json({
      role: 'assistant',
      content: finalAssistantMessage,
      messages: currentMessages // we can return the entire thread so the frontend stays synced
    })

  } catch (error: any) {
    console.error('Voice agent payload error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
