/**
 * Widget Registry — defines all available dashboard widgets
 * with grid-unit sizing, categories, and layout helpers.
 */

export type WidgetSize = '1/3' | '2/3' | 'full'
export type WidgetCategory = 'productivity' | 'email' | 'calendar' | 'analytics' | 'ai' | 'tools'

export interface GridSize {
  w: number   // columns (1–12)
  h: number   // row-units
}

export interface WidgetPosition {
  widgetId: string
  x: number
  y: number
  w: number
  h: number
}

export interface WidgetDef {
  id: string
  name: string
  description: string
  size: WidgetSize         // legacy — kept for WidgetGallery size label
  category: WidgetCategory
  icon: string             // emoji for gallery preview
  defaultEnabled: boolean
  defaultSize: GridSize    // preferred grid footprint
  minSize: GridSize        // smallest the widget can be
}

export const WIDGET_REGISTRY: WidgetDef[] = [
  {
    id: 'critical-now',
    name: 'Critical Now',
    description: 'AI-flagged emails that need immediate attention',
    size: '2/3',
    category: 'email',
    icon: '🔴',
    defaultEnabled: true,
    defaultSize: { w: 8, h: 4 },
    minSize: { w: 4, h: 3 },
  },
  {
    id: 'next-action',
    name: 'Next Best Action',
    description: 'ARIA recommends your most impactful next step',
    size: '1/3',
    category: 'ai',
    icon: '⚡',
    defaultEnabled: true,
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 3, h: 3 },
  },
  {
    id: 'today-timeline',
    name: 'Today Timeline',
    description: 'Your scheduled events for today',
    size: '1/3',
    category: 'calendar',
    icon: '🗓',
    defaultEnabled: true,
    defaultSize: { w: 4, h: 5 },
    minSize: { w: 3, h: 4 },
  },
  {
    id: 'daily-score',
    name: 'Daily Score',
    description: 'Inbox management performance score',
    size: '1/3',
    category: 'analytics',
    icon: '🎯',
    defaultEnabled: true,
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 3, h: 3 },
  },
  {
    id: 'followups',
    name: 'Follow-ups',
    description: 'Pending follow-up reminders and overdue items',
    size: '1/3',
    category: 'productivity',
    icon: '🔔',
    defaultEnabled: true,
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 3, h: 3 },
  },
  {
    id: 'invoices',
    name: 'Invoice Tracker',
    description: 'Invoice and payment emails with overdue detection',
    size: '1/3',
    category: 'tools',
    icon: '💰',
    defaultEnabled: true,
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 3, h: 3 },
  },
  {
    id: 'ai-briefing',
    name: 'AI Briefing',
    description: 'AI-generated morning summary of your inbox',
    size: '2/3',
    category: 'ai',
    icon: '🧠',
    defaultEnabled: true,
    defaultSize: { w: 8, h: 5 },
    minSize: { w: 6, h: 4 },
  },
  {
    id: 'email-volume',
    name: 'Email Volume',
    description: 'Visual chart of email activity over the last 7 days',
    size: '2/3',
    category: 'analytics',
    icon: '📊',
    defaultEnabled: true,
    defaultSize: { w: 8, h: 4 },
    minSize: { w: 6, h: 3 },
  },
  {
    id: 'quick-actions',
    name: 'Quick Actions',
    description: 'One-click shortcuts for your most common tasks',
    size: '1/3',
    category: 'tools',
    icon: '🚀',
    defaultEnabled: true,
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 3, h: 3 },
  },
  {
    id: 'top-senders',
    name: 'Top Senders',
    description: 'Most active contacts in your inbox this week',
    size: '1/3',
    category: 'analytics',
    icon: '👥',
    defaultEnabled: false,
    defaultSize: { w: 4, h: 5 },
    minSize: { w: 3, h: 4 },
  },
  {
    id: 'inbox-progress',
    name: 'Inbox Zero Progress',
    description: 'Track your progress toward inbox zero',
    size: '1/3',
    category: 'productivity',
    icon: '✅',
    defaultEnabled: false,
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 3 },
  },
  {
    id: 'response-time',
    name: 'Response Time',
    description: 'Average time to reply to emails',
    size: '1/3',
    category: 'analytics',
    icon: '⏱',
    defaultEnabled: false,
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 3 },
  },
]

export const DEFAULT_WIDGET_ORDER = WIDGET_REGISTRY
  .filter((w) => w.defaultEnabled)
  .map((w) => w.id)

/**
 * Default 12-column grid layout for the enabled widgets.
 */
export const DEFAULT_LAYOUT: WidgetPosition[] = [
  { widgetId: 'critical-now',    x: 0, y: 0,  w: 8, h: 4 },
  { widgetId: 'next-action',     x: 8, y: 0,  w: 4, h: 4 },
  { widgetId: 'ai-briefing',     x: 0, y: 4,  w: 8, h: 5 },
  { widgetId: 'today-timeline',  x: 8, y: 4,  w: 4, h: 5 },
  { widgetId: 'email-volume',    x: 0, y: 9,  w: 8, h: 4 },
  { widgetId: 'daily-score',     x: 8, y: 9,  w: 4, h: 4 },
  { widgetId: 'followups',       x: 0, y: 13, w: 4, h: 4 },
  { widgetId: 'invoices',        x: 4, y: 13, w: 4, h: 4 },
  { widgetId: 'quick-actions',   x: 8, y: 13, w: 4, h: 4 },
]

export function getWidgetDef(id: string): WidgetDef | undefined {
  return WIDGET_REGISTRY.find((w) => w.id === id)
}

export function getWidgetsByCategory(category: WidgetCategory): WidgetDef[] {
  return WIDGET_REGISTRY.filter((w) => w.category === category)
}
