'use client'

import { motion } from 'framer-motion'
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
  }
}

interface Props {
  email: Email
  index?: number
  onAnalyze: (id: string) => void
  analyzing?: boolean
}

function avatarColor(email: string): string {
  const colors = ['#7c3aed', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#6366f1', '#14b8a6']
  let hash = 0
  for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

const PRIORITY_COLOR: Record<string, string> = {
  CRITICAL: 'var(--red)',
  HIGH:     'var(--amber)',
  MEDIUM:   'var(--accent)',
}

const CATEGORY_LABEL: Record<string, string> = {
  MEETING:    'Meeting',
  TASK:       'Task',
  INVOICE:    'Invoice',
  NEWSLETTER: 'Newsletter',
  SPAM:       'Spam',
}

export function EmailCard({ email, index = 0, onAnalyze, analyzing }: Props) {
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.02, duration: 0.2 }}
      onClick={() => setSelectedEmail(email.id)}
      className="group relative flex gap-3 px-3 py-3 cursor-pointer rounded-xl transition-all duration-150 mb-0.5"
      style={{
        background: isSelected ? 'var(--accent-subtle)' : 'transparent',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'
      }}
      onMouseLeave={(e) => {
        if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'
      }}
    >
      {/* Unread stripe */}
      {!email.isRead && (
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full"
          style={{ background: 'var(--accent)' }}
        />
      )}

      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[11px] font-semibold text-white mt-0.5"
        style={{ background: color }}
      >
        {initials}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Sender + time */}
        <div className="flex items-baseline justify-between gap-2 mb-0.5">
          <span
            className="text-[13px] truncate"
            style={{
              color: 'var(--text-1)',
              fontWeight: !email.isRead ? 600 : 400,
            }}
          >
            {name}
          </span>
          <span
            className="text-[11px] shrink-0 tabular-nums"
            style={{ color: 'var(--text-3)' }}
          >
            {timeAgo}
          </span>
        </div>

        {/* Subject */}
        <p
          className="text-[12.5px] truncate mb-1"
          style={{
            color: !email.isRead ? 'var(--text-1)' : 'var(--text-2)',
            fontWeight: !email.isRead ? 500 : 400,
          }}
        >
          {email.subject}
        </p>

        {/* Preview */}
        <p
          className="text-[12px] truncate"
          style={{ color: 'var(--text-3)' }}
        >
          {preview}
        </p>

        {/* Meta row */}
        <div className="flex items-center gap-2 mt-2">
          {/* Priority dot + label */}
          {priority && priority !== 'LOW' && (
            <div className="flex items-center gap-1">
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: PRIORITY_COLOR[priority] }}
              />
              <span className="text-[11px]" style={{ color: PRIORITY_COLOR[priority] }}>
                {priority === 'CRITICAL' ? 'Critical' : priority === 'HIGH' ? 'High' : 'Medium'}
              </span>
            </div>
          )}

          {/* Category */}
          {email.analysis?.category && CATEGORY_LABEL[email.analysis.category] && (
            <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>
              {priority && priority !== 'LOW' ? '·' : ''} {CATEGORY_LABEL[email.analysis.category]}
            </span>
          )}

          {/* Attachment */}
          {email.hasAttachments && (
            <Paperclip size={10} style={{ color: 'var(--text-3)' }} />
          )}

          {/* Analyze */}
          {!email.analysis && (
            <button
              onClick={(e) => { e.stopPropagation(); onAnalyze(email.id) }}
              disabled={analyzing}
              className="ml-auto flex items-center gap-1 text-[11px] opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-30"
              style={{ color: 'var(--accent)' }}
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
    </motion.div>
  )
}
