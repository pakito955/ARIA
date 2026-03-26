'use client'

import { memo, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/lib/store'
import { Paperclip, Zap, Loader2, Reply, Archive } from 'lucide-react'
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
  '#E03131', '#0B7285', '#9B59B6', '#339AF0',
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

// ── Loading skeleton ──────────────────────────────────────────────────────────
export function EmailCardSkeleton() {
  return (
    <div
      className="flex gap-3 px-4 py-3 rounded-xl mb-1 mx-1 border"
      style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
    >
      <div className="skeleton w-9 h-9 rounded-full shrink-0 mt-0.5 ml-1" />
      <div className="flex-1 min-w-0 space-y-2 pt-1">
        <div className="flex justify-between gap-4">
          <div className="skeleton h-3 w-24 rounded" />
          <div className="skeleton h-3 w-10 rounded" />
        </div>
        <div className="skeleton h-3 w-48 rounded" />
        <div className="skeleton h-3 w-36 rounded" />
        <div className="flex gap-2 pt-1">
          <div className="skeleton h-4 w-14 rounded-full" />
        </div>
      </div>
    </div>
  )
}

// ── EmailCard ─────────────────────────────────────────────────────────────────
// No Framer Motion on list items (performance rule)
export const EmailCard = memo(function EmailCard({
  email,
  index = 0,
  onAnalyze,
  analyzing,
  selected = false,
  onToggleSelect,
}: Props) {
  const selectedEmailId = useAppStore((s) => s.selectedEmailId)
  const setSelectedEmail = useAppStore((s) => s.setSelectedEmail)
  const isSelected = selectedEmailId === email.id
  const [hovered, setHovered] = useState(false)

  const name = email.fromName || email.fromEmail.split('@')[0]
  const initials = useMemo(
    () => name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2),
    [name]
  )
  const color = useMemo(() => getAvatarColor(email.fromEmail), [email.fromEmail])
  const priority = email.analysis?.priority
  const confidence = email.analysis?.confidenceScore
  const timeAgo = useMemo(
    () => formatDistanceToNow(new Date(email.receivedAt), { addSuffix: false }),
    [email.receivedAt]
  )
  const preview = email.analysis?.summary
    ? email.analysis.summary
    : email.bodyText?.slice(0, 80).replace(/\n/g, ' ')

  const cardStyle: React.CSSProperties = isSelected
    ? { background: 'var(--bg-surface)', borderColor: 'var(--border-medium)', boxShadow: 'var(--shadow-md)' }
    : selected
    ? { background: 'var(--accent-subtle)', borderColor: 'rgba(242,78,30,0.20)' }
    : hovered
    ? {
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderColor: 'var(--border-medium)',
        boxShadow: 'var(--shadow-sm)',
      }
    : { background: 'transparent', borderColor: 'transparent' }

  return (
    <div
      onClick={() => setSelectedEmail(email.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group relative flex gap-3 px-4 py-3 cursor-pointer border rounded-xl mb-1 mx-1"
      style={{
        transition: 'background var(--transition-base), border-color var(--transition-base), box-shadow var(--transition-base)',
        ...cardStyle,
      }}
    >
      {/* Active left accent bar */}
      {isSelected && (
        <div
          className="absolute left-0 top-[15%] bottom-[15%] w-[3px] rounded-r-full"
          style={{ background: 'var(--accent)', boxShadow: '2px 0 8px var(--accent)' }}
        />
      )}

      {/* Unread glow dot */}
      {!email.isRead && !isSelected && (
        <div
          className="absolute left-[7px] top-1/2 -translate-y-1/2 w-[5px] h-[5px] rounded-full"
          style={{ background: 'var(--accent)', boxShadow: '0 0 6px var(--accent)' }}
        />
      )}

      {/* Avatar / Select checkbox */}
      <div className="relative w-9 h-9 shrink-0 mt-0.5 ml-1">
        {onToggleSelect && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleSelect(email.id) }}
            className={cn(
              'absolute inset-0 rounded-full flex items-center justify-center transition-opacity z-10',
              selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            )}
            style={
              selected
                ? { background: 'var(--accent)', border: '2px solid var(--accent)' }
                : { background: 'var(--bg-surface)', border: '2px solid var(--border-medium)' }
            }
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
            'w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold text-white transition-opacity',
            onToggleSelect && !selected ? 'group-hover:opacity-0' : selected ? 'opacity-0' : ''
          )}
          style={{ background: color, border: '1px solid rgba(0,0,0,0.08)' }}
        >
          {initials}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Row 1: sender + time */}
        <div className="flex items-baseline justify-between gap-2 mb-0.5">
          <span
            className="text-[14px] truncate"
            style={{
              fontWeight: !email.isRead ? 700 : 500,
              color: !email.isRead ? 'var(--text-1)' : 'var(--text-2)',
            }}
          >
            {name}
          </span>
          <span className="text-[11px] font-medium shrink-0 tabular-nums" style={{ color: 'var(--text-3)' }}>
            {timeAgo}
          </span>
        </div>

        {/* Row 2: subject */}
        <p
          className="text-[13px] truncate mb-1"
          style={{
            fontWeight: !email.isRead ? 600 : 400,
            color: !email.isRead ? 'var(--text-1)' : 'var(--text-2)',
          }}
        >
          {email.subject}
        </p>

        {/* Row 3: preview */}
        <p className="text-[12px] truncate leading-relaxed" style={{ color: 'var(--text-3)' }}>
          {preview}
        </p>

        {/* Row 4: badges */}
        <div className="flex items-center gap-2 mt-2">
          {priority && priority !== 'LOW' && (
            <span
              className="badge"
              style={
                priority === 'CRITICAL'
                  ? { background: 'var(--red-subtle)', color: 'var(--red)' }
                  : priority === 'HIGH'
                  ? { background: 'var(--amber-subtle)', color: 'var(--amber)' }
                  : { background: 'var(--accent-subtle)', color: 'var(--accent-text)' }
              }
            >
              {priority === 'CRITICAL' ? 'Critical' : priority === 'HIGH' ? 'High' : 'Medium'}
            </span>
          )}

          {email.analysis?.category && CATEGORY_LABEL[email.analysis.category] && (
            <span
              className="badge font-medium px-2"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-3)' }}
            >
              {CATEGORY_LABEL[email.analysis.category]}
            </span>
          )}

          {(email.analysis?.sentiment === 'NEGATIVE' || email.analysis?.sentiment === 'URGENT') && (
            <span
              className="badge"
              style={
                email.analysis.sentiment === 'URGENT'
                  ? { background: 'var(--amber-subtle)', color: 'var(--amber)' }
                  : { background: 'var(--red-subtle)', color: 'var(--red)' }
              }
            >
              {email.analysis.sentiment === 'URGENT' ? 'Urgent' : 'Tense'}
            </span>
          )}

          {confidence !== undefined && confidence > 0 && (
            <span
              className="badge ml-auto"
              style={{
                background: 'var(--bg-hover)',
                color: 'var(--text-3)',
                border: '1px solid var(--border)',
                fontSize: '9px',
              }}
            >
              AI {Math.round(confidence * 100)}%
            </span>
          )}

          {email.hasAttachments && (
            <Paperclip size={12} className="shrink-0" style={{ color: 'var(--text-3)' }} />
          )}

          {!email.analysis && (
            <button
              onClick={(e) => { e.stopPropagation(); onAnalyze(email.id) }}
              disabled={analyzing}
              className="ml-auto flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-30"
              style={{ background: 'var(--accent-subtle)', color: 'var(--accent-text)' }}
            >
              {analyzing ? <Loader2 size={10} className="animate-spin" /> : <Zap size={10} strokeWidth={2.5} />}
              {!analyzing && 'Analyze'}
            </button>
          )}
        </div>

        {/* Hover action row — CSS transition, no Framer Motion */}
        <div
          className="flex items-center gap-1.5 mt-2 overflow-hidden"
          style={{
            maxHeight: hovered || isSelected ? '28px' : '0px',
            opacity: hovered || isSelected ? 1 : 0,
            transition: 'max-height var(--transition-base), opacity var(--transition-base)',
          }}
        >
          {/* Reply */}
          <button
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md transition-colors duration-100"
            style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-2)' }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.background = 'var(--accent-subtle)'
              el.style.color = 'var(--accent-text)'
              el.style.borderColor = 'rgba(242,78,30,0.20)'
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.background = 'var(--bg-hover)'
              el.style.color = 'var(--text-2)'
              el.style.borderColor = 'var(--border)'
            }}
          >
            <Reply size={10} strokeWidth={2} />
            Reply
          </button>

          {/* AI Reply */}
          <button
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md"
            style={{ background: 'var(--accent)', color: '#ffffff' }}
          >
            <Zap size={10} strokeWidth={2.5} />
            AI Reply
          </button>

          {/* Archive */}
          <button
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md transition-colors duration-100"
            style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-2)' }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.background = 'var(--green-subtle)'
              el.style.color = 'var(--green)'
              el.style.borderColor = 'rgba(47,158,68,0.20)'
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.background = 'var(--bg-hover)'
              el.style.color = 'var(--text-2)'
              el.style.borderColor = 'var(--border)'
            }}
          >
            <Archive size={10} strokeWidth={2} />
            Archive
          </button>
        </div>
      </div>
    </div>
  )
})
