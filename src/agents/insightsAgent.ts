import { completeJSON } from '@/lib/anthropic'

export interface ProductivityInsight {
  type: 'warning' | 'tip' | 'achievement' | 'pattern'
  title: string
  body: string
  metric?: string
  action?: string
}

export interface AIInsightsReport {
  summary: string
  score: number           // 0-100 overall productivity score
  insights: ProductivityInsight[]
  topWin: string
  topOpportunity: string
  weekOverWeekTrend: 'improving' | 'stable' | 'declining'
}

export interface InsightsInput {
  emailsThisWeek: number
  emailsLastWeek: number
  criticalCount: number
  unreadCount: number
  tasksCompleted: number
  tasksPending: number
  avgResponseHours: number
  topCategories: { label: string; value: number }[]
  topSenders: { email: string; name?: string; count: number }[]
  timeSavedHours: number
  aiActionsCount: number
}

const SYSTEM_PROMPT = `You are ARIA's intelligence engine. Analyze the user's email productivity metrics and generate actionable insights. Be specific, data-driven, and constructive — not generic. Focus on patterns that save time or reduce stress. Return ONLY valid JSON.`

export async function generateInsights(input: InsightsInput): Promise<AIInsightsReport> {
  const trend = input.emailsThisWeek > input.emailsLastWeek * 1.2 ? 'increasing'
    : input.emailsThisWeek < input.emailsLastWeek * 0.8 ? 'decreasing'
    : 'stable'

  const schema = `{
  "summary": "2-3 sentence executive summary of the week",
  "score": 78,
  "insights": [
    {
      "type": "achievement|warning|tip|pattern",
      "title": "Short title",
      "body": "1-2 sentence insight",
      "metric": "e.g. 94% response rate",
      "action": "optional next step"
    }
  ],
  "topWin": "Best thing that happened this week",
  "topOpportunity": "Biggest improvement opportunity",
  "weekOverWeekTrend": "improving|stable|declining"
}`

  const fallback: AIInsightsReport = {
    summary: 'Your email productivity is on track this week.',
    score: 70,
    insights: [],
    topWin: 'Maintained consistent email processing.',
    topOpportunity: 'Reduce unread count by enabling auto-archive for newsletters.',
    weekOverWeekTrend: 'stable',
  }

  return await completeJSON<AIInsightsReport>(
    SYSTEM_PROMPT,
    `Email productivity data for this week:
- Emails this week: ${input.emailsThisWeek} (last week: ${input.emailsLastWeek}, trend: ${trend})
- Critical emails: ${input.criticalCount}
- Unread: ${input.unreadCount}
- Tasks completed: ${input.tasksCompleted} / ${input.tasksCompleted + input.tasksPending} total
- Avg response time: ${input.avgResponseHours}h
- Top email categories: ${input.topCategories.map(c => `${c.label} ${c.value}%`).join(', ')}
- Top senders (this week): ${input.topSenders.slice(0, 5).map(s => `${s.name || s.email} (${s.count})`).join(', ')}
- Time saved by ARIA: ${input.timeSavedHours}h
- AI actions taken: ${input.aiActionsCount}

Generate 4-6 specific, actionable insights. Return JSON:\n${schema}`,
    800,
    fallback
  )
}

/**
 * AI-powered rule suggestions based on email patterns.
 */
export interface RuleSuggestion {
  name: string
  triggerField: string
  triggerOperator: string
  triggerValue: string
  action: string
  actionValue?: string
  reasoning: string
  estimatedImpact: string // e.g. "~12 emails/week"
}

const RULES_SYSTEM = `You are ARIA's automation engine. Analyze email patterns and suggest 3-5 automation rules that would save the user time. Focus on high-frequency, low-value emails. Return ONLY valid JSON.`

export async function suggestRules(patterns: {
  topSenders: { email: string; name?: string; count: number; categories: string[] }[]
  categoryBreakdown: { label: string; value: number }[]
  newsletterCount: number
  spamCount: number
  totalEmails: number
}): Promise<RuleSuggestion[]> {
  const schema = `[
  {
    "name": "Archive newsletters from X",
    "triggerField": "from|subject|body|category|priority|sentiment",
    "triggerOperator": "contains|equals|startsWith|endsWith|is",
    "triggerValue": "newsletter@example.com",
    "action": "archive|markRead|createTask|snooze|label|setVip",
    "actionValue": "optional",
    "reasoning": "Why this rule saves time",
    "estimatedImpact": "~8 emails/week"
  }
]`

  const result = await completeJSON<RuleSuggestion[]>(
    RULES_SYSTEM,
    `Email patterns:
- Total emails: ${patterns.totalEmails}
- Newsletters: ${patterns.newsletterCount} (${Math.round(patterns.newsletterCount / patterns.totalEmails * 100)}%)
- Spam/unwanted: ${patterns.spamCount}
- Top senders: ${patterns.topSenders.slice(0, 8).map(s => `${s.name || s.email}: ${s.count} emails (${s.categories.join('/')})`).join(', ')}
- Category breakdown: ${patterns.categoryBreakdown.map(c => `${c.label}: ${c.value}%`).join(', ')}

Suggest 3-5 automation rules. Return JSON array:\n${schema}`,
    700,
    []
  )

  return Array.isArray(result) ? result : []
}
