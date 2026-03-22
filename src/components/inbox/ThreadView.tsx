'use client'

import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { useState } from 'react'
import { ChevronDown, Loader2, MessageSquare } from 'lucide-react'

function ThreadMessage({ msg, isSelected, index }: { msg: any; isSelected: boolean; index: number }) {
  const [expanded, setExpanded] = useState(isSelected)
  const initials = (msg.fromName || msg.fromEmail).slice(0, 2).toUpperCase()
  const hue = msg.fromEmail.split('').reduce((a: number, c: string) => a + c.charCodeAt(0), 0) % 360

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="rounded-xl overflow-hidden"
      style={{
        border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
        background: isSelected ? 'color-mix(in srgb, var(--accent) 4%, var(--bg-card))' : 'var(--bg-card)',
      }}
    >
      {/* Header row — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--bg-hover)] transition-colors"
      >
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
          style={{ background: `hsl(${hue},55%,40%)` }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-medium text-white truncate">
            {msg.fromName || msg.fromEmail}
          </p>
          {!expanded && (
            <p className="text-[10px] text-[var(--text-3)] truncate">
              {msg.bodyText?.slice(0, 80)}…
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-[var(--text-3)] font-mono">
            {format(new Date(msg.receivedAt), 'MMM d, HH:mm')}
          </span>
          <ChevronDown
            size={13}
            className="transition-transform"
            style={{
              color: 'var(--text-3)',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        </div>
      </button>

      {/* Body — collapsed by default unless selected */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1">
              {msg.analysis?.summary && (
                <div
                  className="px-3 py-2 rounded-lg mb-3 text-[11px]"
                  style={{ background: 'var(--accent-subtle)', color: 'var(--accent-text)' }}
                >
                  ⚡ {msg.analysis.summary}
                </div>
              )}
              <pre className="text-[11.5px] text-[var(--text-2)] leading-relaxed whitespace-pre-wrap font-space">
                {msg.bodyText?.slice(0, 1500)}
                {(msg.bodyText?.length || 0) > 1500 && '\n\n[Message truncated…]'}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function ThreadView({ emailId }: { emailId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['thread', emailId],
    queryFn: async () => {
      const res = await fetch(`/api/emails/${emailId}/thread`)
      return res.json()
    },
    enabled: !!emailId,
  })

  const messages = data?.data || []
  if (messages.length <= 1) return null

  return (
    <div className="mx-6 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare size={11} style={{ color: 'var(--text-3)' }} />
        <p className="text-[9px] uppercase tracking-[2px] text-[var(--text-3)]">
          Thread · {messages.length} messages
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={16} className="animate-spin" style={{ color: 'var(--accent-text)' }} />
        </div>
      ) : (
        <div className="space-y-2">
          {messages.map((msg: any, i: number) => (
            <ThreadMessage
              key={msg.id}
              msg={msg}
              isSelected={msg.id === emailId}
              index={i}
            />
          ))}
        </div>
      )}
    </div>
  )
}
