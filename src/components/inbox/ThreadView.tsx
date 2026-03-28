'use client'

import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { ChevronDown, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

interface ThreadMessage {
  id: string
  fromEmail: string
  fromName: string
  toEmails: string
  subject: string
  bodyText: string
  bodyHtml: string | null
  receivedAt: string
  isRead: boolean
  folder: string
  summary: string | null
}

interface Props {
  emailId: string
  onSelectMessage?: (id: string) => void
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function hashColor(email: string): string {
  let hash = 0
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash % 360)
  return `hsl(${hue}, 55%, 45%)`
}

export function ThreadView({ emailId, onSelectMessage }: Props) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set([emailId]))

  const { data, isLoading, error } = useQuery({
    queryKey: ['thread', emailId],
    queryFn: async () => {
      const res = await fetch(`/api/emails/${emailId}/thread`)
      if (!res.ok) throw new Error('Failed to load thread')
      return res.json() as Promise<{ messages: ThreadMessage[]; count: number }>
    },
    staleTime: 30_000,
  })

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10 gap-2">
        <Loader2 size={14} className="animate-spin" style={{ color: 'var(--accent-text)' }} />
        <span className="text-[12px]" style={{ color: 'var(--text-3)' }}>Loading thread…</span>
      </div>
    )
  }

  if (error || !data?.messages?.length) {
    return null
  }

  const messages = data.messages
  if (messages.length <= 1) return null // Single email — no thread to show

  return (
    <div className="px-6 pb-4">
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: '1px solid var(--border)', background: 'var(--bg-surface)' }}
      >
        {/* Thread header */}
        <div
          className="flex items-center gap-2 px-4 py-2.5"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-hover)' }}
        >
          <span className="text-[9px] uppercase tracking-[2px] font-medium" style={{ color: 'var(--text-3)' }}>
            Thread · {messages.length} messages
          </span>
        </div>

        {/* Messages */}
        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {messages.map((msg) => {
            const isSent = msg.folder === 'SENT'
            const isExpanded = expandedIds.has(msg.id)
            const isSelected = msg.id === emailId
            const color = hashColor(msg.fromEmail)

            return (
              <div
                key={msg.id}
                className={cn(
                  'transition-colors cursor-pointer',
                  isSelected && 'bg-[var(--accent-subtle)]'
                )}
                onClick={() => {
                  toggleExpand(msg.id)
                  onSelectMessage?.(msg.id)
                }}
              >
                {/* Message header */}
                <div className="flex items-center gap-3 px-4 py-3">
                  {/* Avatar */}
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                    style={{ background: color }}
                  >
                    {getInitials(msg.fromName)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-medium truncate" style={{ color: 'var(--text-1)' }}>
                        {isSent ? 'You' : msg.fromName}
                      </span>
                      {isSent && (
                        <span
                          className="text-[8px] uppercase tracking-[1.5px] px-1.5 py-0.5 rounded-full font-semibold"
                          style={{ background: 'rgba(124,92,255,0.12)', color: 'var(--purple)' }}
                        >
                          Sent
                        </span>
                      )}
                    </div>
                    {!isExpanded && (
                      <p className="text-[11px] truncate mt-0.5" style={{ color: 'var(--text-3)' }}>
                        {msg.bodyText.slice(0, 80)}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>
                      {formatDistanceToNow(new Date(msg.receivedAt), { addSuffix: true })}
                    </span>
                    <ChevronDown
                      size={12}
                      style={{
                        color: 'var(--text-3)',
                        transform: isExpanded ? 'rotate(180deg)' : 'none',
                        transition: 'transform 200ms ease',
                      }}
                    />
                  </div>
                </div>

                {/* Expanded body */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div
                        className="px-4 pb-4 pt-1"
                        style={{ borderTop: '1px solid var(--border)' }}
                      >
                        {msg.summary && (
                          <div
                            className="mb-3 px-3 py-2 rounded-xl text-[11px] leading-relaxed"
                            style={{ background: 'var(--accent-subtle)', color: 'var(--accent-text)' }}
                          >
                            {msg.summary}
                          </div>
                        )}
                        <p className="text-[12px] leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-2)' }}>
                          {msg.bodyText.slice(0, 800)}
                          {msg.bodyText.length > 800 && (
                            <span style={{ color: 'var(--text-3)' }}> …[truncated]</span>
                          )}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
