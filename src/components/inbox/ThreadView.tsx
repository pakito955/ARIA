'use client'

import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { ChevronDown, Loader2, Sparkles, X, Square } from 'lucide-react'
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

interface MeetingInfo {
  date: string | null
  participants: string[]
  agenda: string
  actionItems: string[]
}

interface SummaryData {
  tldr: string
  keyPoints: string[]
  decisions: string[]
  nextSteps: string[]
  meetingInfo: MeetingInfo | null
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
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryVisible, setSummaryVisible] = useState(false)

  const handleSummarize = async () => {
    if (summaryVisible && summary) {
      setSummaryVisible(false)
      return
    }
    if (summary) {
      setSummaryVisible(true)
      return
    }
    setSummaryLoading(true)
    try {
      const res = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailId }),
      })
      if (!res.ok) throw new Error('Failed to summarize')
      const data = await res.json()
      setSummary(data.summary)
      setSummaryVisible(true)
    } catch {
      // silently fail
    } finally {
      setSummaryLoading(false)
    }
  }

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
          className="flex items-center justify-between gap-2 px-4 py-2.5"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-hover)' }}
        >
          <span className="text-[9px] uppercase tracking-[2px] font-medium" style={{ color: 'var(--text-3)' }}>
            Thread · {messages.length} messages
          </span>
          <button
            onClick={handleSummarize}
            disabled={summaryLoading}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors disabled:opacity-50"
            style={{
              background: summaryVisible ? 'rgba(124,58,237,0.18)' : 'rgba(124,58,237,0.10)',
              color: 'var(--accent)',
              border: '1px solid rgba(124,58,237,0.25)',
            }}
          >
            {summaryLoading ? (
              <Loader2 size={11} className="animate-spin" />
            ) : (
              <Sparkles size={11} />
            )}
            {summaryLoading ? 'Summarizing…' : summaryVisible ? 'Hide Summary' : 'Summarize Thread'}
          </button>
        </div>

        {/* Summary panel */}
        <AnimatePresence initial={false}>
          {summaryVisible && summary && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              style={{ overflow: 'hidden' }}
            >
              <div
                className="px-4 py-4 relative"
                style={{
                  borderBottom: '1px solid rgba(124,58,237,0.25)',
                  background: 'rgba(124,58,237,0.06)',
                  border: '1px solid rgba(124,58,237,0.25)',
                }}
              >
                {/* Dismiss */}
                <button
                  onClick={() => setSummaryVisible(false)}
                  className="absolute top-3 right-3 rounded-md p-0.5 transition-colors"
                  style={{ color: 'var(--text-3)' }}
                  aria-label="Dismiss summary"
                >
                  <X size={13} />
                </button>

                {/* TL;DR */}
                <p className="text-[13px] font-medium leading-relaxed pr-5" style={{ color: 'var(--text-1)' }}>
                  {summary.tldr}
                </p>

                {/* Key Points */}
                {summary.keyPoints.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[9px] uppercase tracking-[2px] font-semibold mb-1.5" style={{ color: 'var(--accent)' }}>
                      Key Points
                    </p>
                    <ul className="space-y-1">
                      {summary.keyPoints.map((point, i) => (
                        <li key={i} className="flex items-start gap-2 text-[12px] leading-relaxed" style={{ color: 'var(--text-2)' }}>
                          <span className="mt-1.5 shrink-0 w-1 h-1 rounded-full" style={{ background: 'var(--accent)' }} />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Decisions */}
                {summary.decisions.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[9px] uppercase tracking-[2px] font-semibold mb-1.5" style={{ color: 'var(--amber)' }}>
                      Decisions
                    </p>
                    <ul className="space-y-1">
                      {summary.decisions.map((d, i) => (
                        <li key={i} className="text-[12px] leading-relaxed" style={{ color: 'var(--text-2)' }}>
                          • {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Next Steps */}
                {summary.nextSteps.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[9px] uppercase tracking-[2px] font-semibold mb-1.5" style={{ color: 'var(--green)' }}>
                      Next Steps
                    </p>
                    <ul className="space-y-1">
                      {summary.nextSteps.map((step, i) => (
                        <li key={i} className="flex items-start gap-2 text-[12px] leading-relaxed" style={{ color: 'var(--text-2)' }}>
                          <Square size={12} className="mt-0.5 shrink-0" style={{ color: 'var(--green)' }} />
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Meeting Info */}
                {summary.meetingInfo && (
                  <div
                    className="mt-3 px-3 py-3 rounded-xl"
                    style={{ background: 'rgba(124,58,237,0.10)', border: '1px solid rgba(124,58,237,0.2)' }}
                  >
                    <p className="text-[9px] uppercase tracking-[2px] font-semibold mb-2" style={{ color: 'var(--accent)' }}>
                      Meeting
                    </p>
                    {summary.meetingInfo.date && (
                      <p className="text-[11px] mb-1" style={{ color: 'var(--text-2)' }}>
                        <span style={{ color: 'var(--text-3)' }}>Date: </span>
                        {new Date(summary.meetingInfo.date).toLocaleString(undefined, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </p>
                    )}
                    {summary.meetingInfo.agenda && (
                      <p className="text-[11px] mb-1" style={{ color: 'var(--text-2)' }}>
                        <span style={{ color: 'var(--text-3)' }}>Agenda: </span>
                        {summary.meetingInfo.agenda}
                      </p>
                    )}
                    {summary.meetingInfo.participants.length > 0 && (
                      <p className="text-[11px] mb-1" style={{ color: 'var(--text-2)' }}>
                        <span style={{ color: 'var(--text-3)' }}>Participants: </span>
                        {summary.meetingInfo.participants.join(', ')}
                      </p>
                    )}
                    {summary.meetingInfo.actionItems.length > 0 && (
                      <div className="mt-1.5">
                        <p className="text-[9px] uppercase tracking-[1.5px] font-semibold mb-1" style={{ color: 'var(--text-3)' }}>
                          Action Items
                        </p>
                        {summary.meetingInfo.actionItems.map((item, i) => (
                          <p key={i} className="text-[11px]" style={{ color: 'var(--text-2)' }}>• {item}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
