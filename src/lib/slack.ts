export async function sendSlackMessage(webhookUrl: string, text: string, blocks?: any[]): Promise<boolean> {
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(blocks ? { text, blocks } : { text }),
    })
    return res.ok
  } catch {
    return false
  }
}

export function buildBriefingSlackBlocks(briefingText: string, stats: {
  emailCount: number
  criticalCount: number
  tasksCount: number
}) {
  return [
    {
      type: 'header',
      text: { type: 'plain_text', text: '⚡ ARIA Daily Briefing', emoji: true },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*📧 Emails:* ${stats.emailCount}` },
        { type: 'mrkdwn', text: `*🔴 Critical:* ${stats.criticalCount}` },
        { type: 'mrkdwn', text: `*✓ Tasks:* ${stats.tasksCount}` },
      ],
    },
    { type: 'divider' },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: briefingText.slice(0, 2000) },
    },
  ]
}
