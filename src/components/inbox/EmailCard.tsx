'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/lib/store'
import { Paperclip, Star, Zap } from 'lucide-react'
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

// Deterministic avatar color from email string
function avatarColor(email: string): string {
  const colors = ['#e8c97a', '#4fd1c5', '#7eb8f7', '#f4a0b5', '#86efac', '#c4b5fd']
  let hash = 0
  for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: '#f4a0b5',
  HIGH: '#e8c97a',
  MEDIUM: '#7eb8f7',
  LOW: '#5a5a78',
}

export function EmailCard({ email, index = 0, onAnalyze, analyzing }: Props) {
  const { selectedEmailId, setSelectedEmail } = useAppStore()
  const isSelected = selectedEmailId === email.id

  const name = email.fromName || email.fromEmail.split('@')[0]
  const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
  const color = avatarColor(email.fromEmail)
  const priority = email.analysis?.priority
  const dotColor = priority ? PRIORITY_COLORS[priority] : '#5a5a78'

  const timeAgo = formatDistanceToNow(new Date(email.receivedAt), { addSuffix: true })

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.2 }}
      onClick={() => setSelectedEmail(email.id)}
      className={cn(
        'group relative flex gap-3 px-3 py-3 rounded cursor-pointer',
        'border transition-all duration-150 mb-1.5',
        isSelected
          ? 'bg-[#e8c97a]/[0.04] border-[#e8c97a]/30'
          : !email.isRead
          ? 'bg-[#0d0d1a] border-white/[0.08] border-l-2 border-l-[#e8c97a]'
          : 'bg-[#0d0d1a] border-white/[0.055] hover:border-white/[0.11] hover:bg-white/[0.01]'
      )}
    >
      {/* Priority dot */}
      <div
        className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r"
        style={{ background: dotColor, opacity: priority ? 0.8 : 0 }}
      />

      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[11px] font-semibold text-[#080810]"
        style={{ background: color }}
      >
        {initials}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className={cn('text-[12.5px] font-medium truncate', !email.isRead && 'text-white')}>
            {name}
          </span>
          <span className="text-[10px] text-[#5a5a78] shrink-0 font-mono">{timeAgo}</span>
        </div>

        <p className="text-[11px] text-[#8888aa] truncate mb-1.5">{email.subject}</p>

        <div className="flex items-center gap-2">
          {/* Category chip */}
          {email.analysis && (
            <CategoryChip category={email.analysis.category} />
          )}

          {/* Attachments */}
          {email.hasAttachments && (
            <Paperclip size={10} className="text-[#5a5a78]" />
          )}

          {/* Analyze button */}
          <button
            onClick={(e) => { e.stopPropagation(); onAnalyze(email.id) }}
            disabled={analyzing}
            className={cn(
              'ml-auto flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-all',
              'bg-[#e8c97a]/[0.06] text-[#e8c97a] border border-[#e8c97a]/18',
              'hover:bg-[#e8c97a]/12 disabled:opacity-30 disabled:cursor-not-allowed',
              'opacity-0 group-hover:opacity-100'
            )}
          >
            {analyzing ? (
              <span className="w-2.5 h-2.5 border border-[#e8c97a]/40 border-t-[#e8c97a] rounded-full animate-spin" />
            ) : (
              <Zap size={9} />
            )}
            {!analyzing && 'Analiziraj'}
          </button>
        </div>
      </div>
    </motion.div>
  )
}

function CategoryChip({ category }: { category: string }) {
  const styles: Record<string, string> = {
    CRITICAL: 'bg-[#f4a0b5]/10 text-[#f4a0b5]',
    MEETING: 'bg-[#f4a0b5]/10 text-[#f4a0b5]',
    TASK: 'bg-[#86efac]/10 text-[#86efac]',
    INFO: 'bg-[#7eb8f7]/10 text-[#7eb8f7]',
    SPAM: 'bg-white/[0.05] text-[#5a5a78]',
    INVOICE: 'bg-[#e8c97a]/10 text-[#e8c97a]',
    NEWSLETTER: 'bg-white/[0.05] text-[#5a5a78]',
  }
  const labels: Record<string, string> = {
    CRITICAL: '🔴 Kritično',
    MEETING: '📅 Sastanak',
    TASK: '✓ Zadatak',
    INFO: 'ℹ Info',
    SPAM: 'Spam',
    INVOICE: '€ Faktura',
    NEWSLETTER: 'Newsletter',
  }

  return (
    <span className={cn(
      'text-[8px] px-1.5 py-0.5 rounded uppercase tracking-[0.5px]',
      styles[category] || 'bg-white/[0.05] text-[#5a5a78]'
    )}>
      {labels[category] || category}
    </span>
  )
}
