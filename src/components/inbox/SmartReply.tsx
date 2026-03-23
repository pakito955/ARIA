'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, MessageSquare, X, ChevronRight } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'

interface ReplyOption {
  style: string
  content: string
}

interface Props {
  emailId: string
  onSelect: (content: string) => void
  onClose: () => void
}

const STYLE_LABELS: Record<string, { label: string; color: string }> = {
  short:  { label: 'Short',  color: '#10b981' },
  medium: { label: 'Medium', color: 'var(--accent-text)' },
  formal: { label: 'Formal', color: '#0ea5e9' },
}

export function SmartReply({ emailId, onSelect, onClose }: Props) {
  const [selected, setSelected] = useState<string | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['smart-reply', emailId],
    queryFn: async () => {
      const res = await fetch('/api/ai/smart-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailId }),
      })
      if (!res.ok) throw new Error('Failed to generate replies')
      return res.json()
    },
    staleTime: 5 * 60 * 1000,
  })

  const replies: ReplyOption[] = data?.replies || []

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="mx-6 mt-3 mb-2 rounded-xl overflow-hidden"
      style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--accent-subtle)' }}
      >
        <div className="flex items-center gap-2">
          <MessageSquare size={11} style={{ color: 'var(--accent-text)' }} />
          <span className="text-[10px] uppercase tracking-[2px] font-medium" style={{ color: 'var(--accent-text)' }}>
            Smart Reply
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-0.5 rounded transition-colors"
          style={{ color: 'var(--text-3)' }}
        >
          <X size={12} />
        </button>
      </div>

      {/* Content */}
      <div className="p-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-6 gap-2">
            <Loader2 size={14} className="animate-spin" style={{ color: 'var(--accent-text)' }} />
            <span className="text-[12px]" style={{ color: 'var(--text-3)' }}>Generating replies…</span>
          </div>
        ) : error ? (
          <p className="text-[12px] text-center py-4" style={{ color: 'var(--text-3)' }}>
            Failed to generate replies
          </p>
        ) : (
          <div className="space-y-2">
            {replies.map((reply) => {
              const meta = STYLE_LABELS[reply.style] || { label: reply.style, color: 'var(--text-2)' }
              const isSelected = selected === reply.style

              return (
                <motion.div
                  key={reply.style}
                  whileHover={{ scale: 1.005 }}
                  whileTap={{ scale: 0.995 }}
                  onClick={() => setSelected(reply.style)}
                  className={cn(
                    'p-3 rounded-xl cursor-pointer transition-all',
                    isSelected
                      ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                      : 'border-[var(--border)] hover:border-[var(--border-medium)]'
                  )}
                  style={{ border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}` }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className="text-[9px] uppercase tracking-[1.5px] font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: `color-mix(in srgb, ${meta.color} 12%, transparent)`,
                        color: meta.color,
                      }}
                    >
                      {meta.label}
                    </span>
                    {isSelected && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onSelect(reply.content) }}
                        className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-lg font-medium transition-colors text-white"
                        style={{ background: 'var(--accent)' }}
                      >
                        Use this
                        <ChevronRight size={10} />
                      </button>
                    )}
                  </div>
                  <p className="text-[11.5px] leading-relaxed" style={{ color: 'var(--text-2)' }}>
                    {reply.content.slice(0, 120)}
                    {reply.content.length > 120 && '…'}
                  </p>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </motion.div>
  )
}
