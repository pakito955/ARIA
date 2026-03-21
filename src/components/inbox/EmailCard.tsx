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
  const colors = ['#8b5cf6', '#4fd1c5', '#7eb8f7', '#f59e0b', '#10b981', '#ec4899']
  let hash = 0
  for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

const PRIORITY: Record<string, { color: string; bg: string; label: string; pulse: boolean }> = {
  CRITICAL: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)', label: 'Critical', pulse: true },
  HIGH:     { color: '#f59e0b', bg: 'rgba(245,158,11,0.06)', label: 'High', pulse: false },
  MEDIUM:   { color: '#8b5cf6', bg: 'rgba(139,92,246,0.05)', label: 'Medium', pulse: false },
  LOW:      { color: '#4a4a6a', bg: 'transparent', label: 'Low', pulse: false },
}

export function EmailCard({ email, index = 0, onAnalyze, analyzing }: Props) {
  const { selectedEmailId, setSelectedEmail } = useAppStore()
  const isSelected = selectedEmailId === email.id

  const name = email.fromName || email.fromEmail.split('@')[0]
  const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
  const color = avatarColor(email.fromEmail)
  const priority = email.analysis?.priority
  const p = priority ? PRIORITY[priority] : null

  const timeAgo = formatDistanceToNow(new Date(email.receivedAt), { addSuffix: true })

  // Preview text: AI summary if available, else body snippet
  const preview = email.analysis?.summary
    ? email.analysis.summary
    : email.bodyText?.slice(0, 80).replace(/\n/g, ' ')

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.035, duration: 0.2 }}
      onClick={() => setSelectedEmail(email.id)}
      className={cn(
        'relative group cursor-pointer rounded-xl border transition-all duration-200 mb-2 overflow-hidden',
        isSelected
          ? 'bg-[#8b5cf6]/[0.07] border-[#8b5cf6]/30 shadow-[0_0_20px_rgba(139,92,246,0.08)]'
          : 'bg-[#0c0c1a] border-white/[0.06] hover:border-white/[0.1] hover:bg-[#0e0e1f] hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:-translate-y-[1px]'
      )}
    >
      {/* Priority bar */}
      {p && (
        <div
          className="absolute left-0 top-3 bottom-3 w-[2px] rounded-r"
          style={{ background: p.color, opacity: priority === 'LOW' ? 0 : 0.9 }}
        />
      )}

      <div className="flex gap-3 px-4 py-3.5">
        {/* Avatar */}
        <div
          className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-white mt-0.5"
          style={{ background: `linear-gradient(135deg, ${color}cc, ${color}66)` }}
        >
          {initials}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <span className={cn(
              'text-[12.5px] font-medium truncate',
              !email.isRead ? 'text-white' : 'text-[#eeeef5]/70'
            )}>
              {name}
            </span>
            <span className="text-[10px] text-[#4a4a6a] shrink-0 font-mono tabular-nums">{timeAgo}</span>
          </div>

          <p className={cn(
            'text-[11.5px] truncate mb-1',
            !email.isRead ? 'text-[#eeeef5]/80' : 'text-[#8888aa]'
          )}>
            {email.subject}
          </p>

          {/* Preview (AI summary or body) */}
          <p className="text-[10.5px] text-[#4a4a6a] truncate mb-2">
            {email.analysis?.summary ? (
              <span className="text-[#8888aa] italic">{preview}</span>
            ) : preview}
          </p>

          {/* Bottom row */}
          <div className="flex items-center gap-2">
            {priority && priority !== 'LOW' && (
              <span
                className="text-[8px] px-1.5 py-0.5 rounded-full uppercase tracking-[0.5px] font-medium"
                style={{ background: p?.bg, color: p?.color }}
              >
                {p?.label}
              </span>
            )}

            {email.analysis?.category && email.analysis.category !== 'INFO' && (
              <CategoryChip category={email.analysis.category} />
            )}

            {email.hasAttachments && (
              <Paperclip size={10} className="text-[#4a4a6a]" />
            )}

            {/* Unread dot */}
            {!email.isRead && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6] ml-auto shrink-0" />
            )}

            {/* Analyze button */}
            <button
              onClick={(e) => { e.stopPropagation(); onAnalyze(email.id) }}
              disabled={analyzing}
              className={cn(
                'ml-auto flex items-center gap-1 px-2 py-0.5 rounded-md text-[9.5px] transition-all',
                'border border-[#8b5cf6]/20 text-[#8b5cf6] bg-[#8b5cf6]/[0.06]',
                'hover:bg-[#8b5cf6]/12 hover:border-[#8b5cf6]/40',
                'disabled:opacity-30 disabled:cursor-not-allowed',
                'opacity-0 group-hover:opacity-100',
                email.analysis && 'opacity-0'
              )}
            >
              {analyzing
                ? <Loader2 size={9} className="animate-spin" />
                : <Zap size={9} />
              }
              {!analyzing && 'Analyze'}
            </button>
          </div>
        </div>
      </div>

      {/* CRITICAL pulse ring */}
      {priority === 'CRITICAL' && !isSelected && (
        <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-[#ef4444] pulse-critical" />
      )}
    </motion.div>
  )
}

function CategoryChip({ category }: { category: string }) {
  const styles: Record<string, { bg: string; color: string; label: string }> = {
    CRITICAL: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444', label: 'Critical' },
    MEETING:  { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', label: 'Meeting' },
    TASK:     { bg: 'rgba(16,185,129,0.1)', color: '#10b981', label: 'Task' },
    INFO:     { bg: 'rgba(139,92,246,0.08)', color: '#8b5cf6', label: 'Info' },
    SPAM:     { bg: 'rgba(74,74,106,0.15)', color: '#4a4a6a', label: 'Spam' },
    INVOICE:  { bg: 'rgba(232,201,122,0.08)', color: '#e8c97a', label: '€ Invoice' },
    NEWSLETTER: { bg: 'rgba(74,74,106,0.1)', color: '#4a4a6a', label: 'Newsletter' },
  }
  const s = styles[category]
  if (!s) return null

  return (
    <span
      className="text-[8px] px-1.5 py-0.5 rounded-full uppercase tracking-[0.5px]"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  )
}
