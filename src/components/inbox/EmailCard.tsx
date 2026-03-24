'use client'

import { memo, useMemo } from 'react'
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

const AVATAR_COLORS = [
  '#F24E1E', '#1971C2', '#2F9E44', '#F08C00',
  '#E03131', '#0B7285', '#E599F7', '#339AF0',
]

function getAvatarColor(email: string): string {
  let hash = 0
  for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

const CATEGORY_LABEL: Record<string, string> = {
  MEETING:    'Meeting',
  TASK:       'Task',
  INVOICE:    'Invoice',
  NEWSLETTER: 'Newsletter',
  SPAM:       'Spam',
}

export const EmailCard = memo(function EmailCard({ email, index = 0, onAnalyze, analyzing, selected = false, onToggleSelect }: Props) {
  const selectedEmailId = useAppStore((s) => s.selectedEmailId)
  const setSelectedEmail = useAppStore((s) => s.setSelectedEmail)
  const isSelected = selectedEmailId === email.id

  const name = email.fromName || email.fromEmail.split('@')[0]
  const initials = useMemo(() => name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2), [name])
  const color = useMemo(() => getAvatarColor(email.fromEmail), [email.fromEmail])
  const priority = email.analysis?.priority
  const timeAgo = useMemo(() => formatDistanceToNow(new Date(email.receivedAt), { addSuffix: false }), [email.receivedAt])
  const preview = email.analysis?.summary
    ? email.analysis.summary
    : email.bodyText?.slice(0, 80).replace(/\n/g, ' ')

  const selectedClass = isSelected
    ? 'bg-surface border-border-medium shadow-[0_2px_12px_rgba(0,0,0,0.06)]'
    : 'border-transparent bg-transparent hover:bg-hover'

  const massSelectedClass = selected ? 'bg-accent-subtle border-accent/20' : ''

  return (
    <div
      onClick={() => setSelectedEmail(email.id)}
      className={cn(
        'group relative flex gap-3 px-4 py-3 cursor-pointer transition-colors duration-150 border rounded-xl mb-1 mx-1',
        isSelected ? selectedClass : massSelectedClass || selectedClass
      )}
    >
      {/* Selection Left Bar Indicator */}
      {isSelected && (
        <div className="absolute left-[-5px] top-[15%] bottom-[15%] w-[4px] bg-accent rounded-r-full" />
      )}

      {/* Unread indicator dot */}
      {!email.isRead && !isSelected && (
        <div className="absolute left-[6px] top-1/2 -translate-y-1/2 w-[5px] h-[5px] rounded-full" style={{ background: 'var(--accent)', boxShadow: '0 0 5px rgba(242,78,30,0.45)' }} />
      )}

      {/* Avatar / Checkbox */}
      <div className="relative w-9 h-9 shrink-0 mt-0.5 ml-1">
        {onToggleSelect && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleSelect(email.id) }}
            className={cn(
              'absolute inset-0 rounded-full flex items-center justify-center transition-opacity z-10',
              selected ? 'opacity-100 bg-accent border-[2px] border-accent' : 'opacity-0 group-hover:opacity-100 bg-surface border-[2px] border-border-medium'
            )}
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
            'w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold text-white transition-opacity border border-black/5',
            onToggleSelect && !selected ? 'group-hover:opacity-0' : selected ? 'opacity-0' : ''
          )}
          style={{ background: color }}
        >
          {initials}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2 mb-0.5">
          <span className={cn('text-[14px] truncate', !email.isRead ? 'font-bold text-1' : 'font-medium text-2')}>
            {name}
          </span>
          <span className="text-[11px] font-medium shrink-0 tabular-nums text-3">
            {timeAgo}
          </span>
        </div>

        <p className={cn('text-[13px] truncate mb-1', !email.isRead ? 'font-semibold text-1' : 'font-normal text-2')}>
          {email.subject}
        </p>

        <p className="text-[12px] truncate leading-relaxed text-3">
          {preview}
        </p>

        <div className="flex items-center gap-2 mt-2">
          {priority && priority !== 'LOW' && (
            <span className={cn('badge', priority === 'CRITICAL' ? 'badge-red' : priority === 'HIGH' ? 'badge-amber' : 'badge-accent')}>
              {priority === 'CRITICAL' ? 'Critical' : priority === 'HIGH' ? 'High' : 'Medium'}
            </span>
          )}

          {email.analysis?.category && CATEGORY_LABEL[email.analysis.category] && (
            <span className="badge bg-surface border border-border text-3 font-medium px-2">
              {CATEGORY_LABEL[email.analysis.category]}
            </span>
          )}

          {(email.analysis?.sentiment === 'NEGATIVE' || email.analysis?.sentiment === 'URGENT') && (
            <span className={cn('badge', email.analysis.sentiment === 'URGENT' ? 'badge-amber' : 'badge-red')}>
              {email.analysis.sentiment === 'URGENT' ? 'Urgent' : 'Tense'}
            </span>
          )}

          {email.hasAttachments && (
            <Paperclip size={12} className="shrink-0 text-3" />
          )}

          {!email.analysis && (
            <button
              onClick={(e) => { e.stopPropagation(); onAnalyze(email.id) }}
              disabled={analyzing}
              className="ml-auto flex items-center gap-1.5 text-[10px] font-bold bg-accent-subtle text-accent px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-30"
            >
              {analyzing ? <Loader2 size={10} className="animate-spin" /> : <Zap size={10} strokeWidth={2.5} />}
              {!analyzing && 'Analyze'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
})
