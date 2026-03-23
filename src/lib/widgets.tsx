/**
 * Widget Registry — defines all available dashboard widgets
 */

export type WidgetSize = '1/3' | '2/3' | 'full'
export type WidgetCategory = 'productivity' | 'analytics' | 'ai' | 'tools'

export interface WidgetDef {
  id: string
  name: string
  description: string
  size: WidgetSize
  category: WidgetCategory
  icon: string   // emoji for gallery preview
  defaultEnabled: boolean
}

export const WIDGET_REGISTRY: WidgetDef[] = [
  {
    id: 'critical-now',
    name: 'Critical Now',
    description: 'AI-flagged emails that need immediate attention',
    size: '2/3',
    category: 'productivity',
    icon: '🔴',
    defaultEnabled: true,
  },
  {
    id: 'next-action',
    name: 'Next Best Action',
    description: 'ARIA recommends your most impactful next step',
    size: '1/3',
    category: 'ai',
    icon: '⚡',
    defaultEnabled: true,
  },
  {
    id: 'today-timeline',
    name: 'Today Timeline',
    description: 'Your scheduled events for today',
    size: '1/3',
    category: 'productivity',
    icon: '🗓',
    defaultEnabled: true,
  },
  {
    id: 'daily-score',
    name: 'Daily Score',
    description: 'Inbox management performance score',
    size: '1/3',
    category: 'analytics',
    icon: '🎯',
    defaultEnabled: true,
  },
  {
    id: 'followups',
    name: 'Follow-ups',
    description: 'Pending follow-up reminders and overdue items',
    size: '1/3',
    category: 'productivity',
    icon: '🔔',
    defaultEnabled: true,
  },
  {
    id: 'invoices',
    name: 'Invoice Tracker',
    description: 'Invoice and payment emails with overdue detection',
    size: '1/3',
    category: 'tools',
    icon: '💰',
    defaultEnabled: true,
  },
  {
    id: 'ai-briefing',
    name: 'AI Briefing',
    description: 'AI-generated morning summary of your inbox',
    size: '2/3',
    category: 'ai',
    icon: '🧠',
    defaultEnabled: true,
  },
  {
    id: 'email-volume',
    name: 'Email Volume',
    description: 'Visual chart of email activity over the last 7 days',
    size: '2/3',
    category: 'analytics',
    icon: '📊',
    defaultEnabled: true,
  },
  {
    id: 'quick-actions',
    name: 'Quick Actions',
    description: 'One-click shortcuts for your most common tasks',
    size: '1/3',
    category: 'tools',
    icon: '🚀',
    defaultEnabled: true,
  },
  {
    id: 'top-senders',
    name: 'Top Senders',
    description: 'Most active contacts in your inbox this week',
    size: '1/3',
    category: 'analytics',
    icon: '👥',
    defaultEnabled: false,
  },
  {
    id: 'inbox-progress',
    name: 'Inbox Zero Progress',
    description: 'Track your progress toward inbox zero',
    size: '1/3',
    category: 'productivity',
    icon: '✅',
    defaultEnabled: false,
  },
  {
    id: 'response-time',
    name: 'Response Time',
    description: 'Average time to reply to emails',
    size: '1/3',
    category: 'analytics',
    icon: '⏱',
    defaultEnabled: false,
  },
]

export const DEFAULT_WIDGET_ORDER = WIDGET_REGISTRY
  .filter((w) => w.defaultEnabled)
  .map((w) => w.id)

export function getWidgetDef(id: string): WidgetDef | undefined {
  return WIDGET_REGISTRY.find((w) => w.id === id)
}
