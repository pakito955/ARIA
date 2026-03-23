'use client'

import { cn } from '@/lib/utils'
import { useAppStore } from '@/lib/store'
import { Paperclip, Zap, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Email {
  id: string
  subject: string
  fromEmail: string
  fromName?: string
  bodyText: string
  isRead: boolean
  isStarred: boolean
  hasAttachments: boolean
  receivedAt: string
  analysis?: {
    priority: string
    category: string
    summary?: string
    urgencyScore: number
    confidenceScore: number
    sentiment?: string
  }
}

interface Props {
  email: Email
  index?: number
  onAnalyze: (id: string) => void
  analyzing?: boolean
  selected?: boolean
  onToggleSelect?: (id: string) => void
}

function avatarColor(email: string): string {
  const colors = [
    '#7C5CFF', '#0ea5e9', '#34D399', '#FBBF24',
    '#ec4899', '#6366f1', '#14b8a6', '#F87171',
  ]
  let hash = 0
  for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

const PRIORITY_COLOR: Record<string, string> = {
  CRITICAL: 'var(--red)',
  HIGH:     'var(--amber)',
  MEDIUM:   'var(--accent-text)',
}

const PRIORITY_BG: Record<string, string> = {
  CRITICAL: 'var(--red-subtle)',
  HIGH:     'var(--amber-subtle)',
  MEDIUM:   'var(--accent-subtle)',
}

const CATEGORY_LABEL: Record<string, string> = {
  MEETING:    'Meeting',
  TASK:       'Task',
  INVOICE:    'Invoice',
  NEWSLETTER: 'Newsletter',
  SPAM:       'Spam',
}

export function EmailCard({ email, index = 0, onAnalyze, analyzing, selected = false, onToggleSelect }: Props) {
  const { selectedEmailId, setSelectedEmail } = useAppStore()
  const isSelected = selectedEmailId === email.id

  const name = email.fromName || email.fromEmail.split('@')[0]
  const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
  const color = avatarColor(email.fromEmail)
  const priority = email.analysis?.priority
  const timeAgo = formatDistanceToNow(new Date(email.receivedAt), { addSuffix: false })
  const preview = email.analysis?.summary
    ? email.analysis.summary
    : email.bodyText?.slice(0, 80).replace(/\n/g, ' ')

  const isCritical = priority === 'CRITICAL'

  // Left border color logic
  const leftBorderColor = isSelected
    ? 'var(--accent)'
    : (priority === 'CRITICAL' || priority === 'HIGH') && !email.isRead
    ? PRIORITY_COLOR[priority]
    : 'transparent'

  return (
    <div
      onClick={() => setSelectedEmail(email.id)}
      className={cn(
        'group relative flex gap-3 px-3 py-3 cursor-pointer transition-colors duration-150 mb-px',
        isSelected
          ? 'bg-[rgba(124,92,255,0.08)]'
          : selected
          ? 'bg-[var(--accent-subtle)]'
          : 'hover:bg-[var(--bg-hover)]',
        isCritical && !isSelected && 'bg-[rgba(248,113,113,0.04)]'
      )}
      style={{
        borderLeft: `2px solid ${leftBorderColor}`,
        boxShadow: isSelected
          ? '0 0 0 1px rgba(124,92,255,0.2) inset'
          : selected
          ? '0 0 0 1px rgba(124,92,255,0.15) inset'
          : 'none',
      }}
    >
      {/* Unread dot */}
      {!email.isRead && !isSelected && (
        <div
          className="absolute left-[2px] top-1/2 -translate-y-1/2 w-[6px] h-[6px] rounded-full"
          style={{ background: 'var(--accent)', boxShadow: '0 0 6px rgba(124,92,255,0.5)' }}
        />
      )}

      {/* Avatar / Checkbox */}
      <div className="relative w-8 h-8 shrink-0 mt-0.5">
        {onToggleSelect && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleSelect(email.id) }}
            className={cn(
              'absolute inset-0 rounded-full flex items-center justify-center transition-opacity z-10',
              selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            )}
            style={{
              background: selected ? 'var(--accent)' : 'var(--bg-card)',
              border: selected ? '2px solid var(--accent)' : '2px solid var(--border-medium)',
            }}
            aria-label={selected ? 'Deselect email' : 'Select email'}
          >
            {selected && (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 5L4.2 7.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        )}
        <div
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold text-white transition-opacity',
            onToggleSelect && !selected ? 'group-hover:opacity-0' : selected ? 'opacity-0' : ''
          )}
          style={{ background: color }}
        >
          {initials}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Sender + time row */}
        <div className="flex items-baseline justify-between gap-2 mb-0.5">
          <span
            className={cn(
              'text-[13px] truncate',
              !email.isRead ? 'font-semibold' : 'font-normal'
            )}
            style={{ color: 'var(--text-1)' }}
          >
            {name}
          </span>
          <span className="text-[11px] shrink-0 tabular-nums" style={{ color: 'var(--text-3)' }}>
            {timeAgo}
          </span>
        </div>

        {/* Subject */}
        <p
          className={cn('text-[12.5px] truncate mb-1', !email.isRead ? 'font-medium' : 'font-normal')}
          style={{ color: !email.isRead ? 'var(--text-1)' : 'var(--text-2)' }}
        >
          {email.subject}
        </p>

        {/* Preview */}
        <p className="text-[12px] truncate" style={{ color: 'var(--text-3)' }}>
          {preview}
        </p>

        {/* Meta row */}
        <div className="flex items-center gap-2 mt-2">
          {/* Priority badge */}
          {priority && priority !== 'LOW' && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0"
              style={{
                background: PRIORITY_BG[priority],
                color: PRIORITY_COLOR[priority],
              }}
            >
              {priority === 'CRITICAL' ? 'Critical' : priority === 'HIGH' ? 'High' : 'Medium'}
            </span>
          )}

          {/* Category tag */}
          {email.analysis?.category && CATEGORY_LABEL[email.analysis.category] && (
            <span className="tag shrink-0">
              {CATEGORY_LABEL[email.analysis.category]}
            </span>
          )}

          {/* Sentiment badge */}
          {(email.analysis?.sentiment === 'NEGATIVE' || email.analysis?.sentiment === 'URGENT') && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0"
              style={{
                background: email.analysis.sentiment === 'URGENT'
                  ? 'var(--amber-subtle)'
                  : 'var(--red-subtle)',
                color: email.analysis.sentiment === 'URGENT' ? 'var(--amber)' : 'var(--red)',
              }}
            >
              {email.analysis.sentiment === 'URGENT' ? 'Urgent' : 'Tense'}
            </span>
          )}

          {/* Attachment */}
          {email.hasAttachments && (
            <Paperclip size={10} className="shrink-0" style={{ color: 'var(--text-3)' }} />
          )}

          {/* Analyze button */}
          {!email.analysis && (
            <button
              onClick={(e) => { e.stopPropagation(); onAnalyze(email.id) }}
              disabled={analyzing}
              className="ml-auto flex items-center gap-1 text-[11px] opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-30"
              style={{ color: 'var(--accent-text)' }}
            >
              {analyzing
                ? <Loader2 size={9} className="animate-spin" />
                : <Zap size={9} />
              }
              {!analyzing && 'Analyze'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
