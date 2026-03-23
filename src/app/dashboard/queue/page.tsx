'use client'

import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle, XCircle, Mail, Zap, Globe, Mic,
  ChevronLeft, ChevronRight, Loader2, Inbox,
} from 'lucide-react'
import { toast } from '@/lib/store'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import type { DraftEmail } from '@/types'

const SOURCE_CONFIG: Record<string, { label: string; icon: typeof Mail; color: string }> = {
  RULE:       { label: 'Auto-Reply Rule', icon: Zap,   color: 'var(--accent)'  },
  WEBHOOK:    { label: 'Webhook Trigger', icon: Globe,  color: 'var(--blue)'   },
  BRAIN_DUMP: { label: 'Brain Dump',      icon: Mic,    color: 'var(--amber)'  },
}

function SourceBadge({ source }: { source: string }) {
  const cfg = SOURCE_CONFIG[source] || SOURCE_CONFIG.RULE
  const Icon = cfg.icon
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full"
      style={{ background: `color-mix(in srgb, ${cfg.color} 12%, transparent)`, color: cfg.color, border: `1px solid color-mix(in srgb, ${cfg.color} 25%, transparent)` }}
    >
      <Icon size={9} />
      {cfg.label}
    </span>
  )
}

export default function QueuePage() {
  const qc = useQueryClient()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [direction, setDirection] = useState<'left' | 'right'>('right')

  const { data, isLoading } = useQuery({
    queryKey: ['queue', 'PENDING'],
    queryFn: async () => {
      const res = await fetch('/api/queue?status=PENDING')
      if (!res.ok) throw new Error('Failed to load queue')
      return res.json()
    },
    refetchInterval: 30_000,
    staleTime: 10_000,
  })

  const actionMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'approve' | 'reject' }) => {
      const res = await fetch(`/api/queue/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) throw new Error('Failed to process draft')
      return res.json()
    },
    onSuccess: (data, { action }) => {
      qc.invalidateQueries({ queryKey: ['queue'] })
      qc.invalidateQueries({ queryKey: ['sidebar-stats'] })
      toast.success(
        action === 'approve' ? 'Email sent' : 'Draft rejected',
        action === 'approve' ? 'Approved & Sent' : 'Rejected'
      )
      // Advance to next
      setDirection('right')
      setCurrentIndex((i) => Math.max(0, i))
    },
    onError: () => toast.error('Failed to process draft'),
  })

  const drafts: DraftEmail[] = data?.data || []
  const current = drafts[currentIndex]

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!current || actionMutation.isPending) return
      if (e.key === 'Enter') {
        e.preventDefault()
        setDirection('left')
        actionMutation.mutate({ id: current.id, action: 'approve' })
      }
      if (e.key === 'Backspace' || e.key === 'Escape') {
        e.preventDefault()
        setDirection('right')
        actionMutation.mutate({ id: current.id, action: 'reject' })
      }
      if (e.key === 'ArrowRight') {
        setDirection('right')
        setCurrentIndex((i) => Math.min(drafts.length - 1, i + 1))
      }
      if (e.key === 'ArrowLeft') {
        setDirection('left')
        setCurrentIndex((i) => Math.max(0, i - 1))
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [current, drafts.length, actionMutation])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent-text)' }} />
      </div>
    )
  }

  if (drafts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <Inbox size={24} style={{ color: 'var(--text-3)' }} />
        </div>
        <div className="text-center">
          <p className="text-[15px] font-semibold" style={{ color: 'var(--text-1)' }}>Queue is empty</p>
          <p className="text-[12px] mt-1" style={{ color: 'var(--text-3)' }}>No pending drafts. New auto-replies and webhook drafts will appear here.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-5 border-b border-[var(--border)] flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--amber)] animate-pulse" />
            <span className="text-[9px] tracking-[2.5px] uppercase" style={{ color: 'var(--amber)' }}>
              {drafts.length} Pending
            </span>
          </div>
          <h1 className="font-outfit text-2xl font-semibold tracking-tight" style={{ color: 'var(--text-1)' }}>
            Approval Queue
          </h1>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-3)' }}>
            Press <kbd className="px-1.5 py-0.5 rounded text-[9px] font-mono" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>Enter</kbd> to send ·{' '}
            <kbd className="px-1.5 py-0.5 rounded text-[9px] font-mono" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>Esc</kbd> to reject ·{' '}
            <kbd className="px-1.5 py-0.5 rounded text-[9px] font-mono" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>←→</kbd> to navigate
          </p>
        </div>
        {/* Progress dots */}
        <div className="flex items-center gap-1.5">
          {drafts.map((_, i) => (
            <button
              key={i}
              onClick={() => { setDirection(i > currentIndex ? 'right' : 'left'); setCurrentIndex(i) }}
              className="w-2 h-2 rounded-full transition-all"
              style={{ background: i === currentIndex ? 'var(--accent)' : 'var(--border-medium)' }}
            />
          ))}
        </div>
      </div>

      {/* Card viewer */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-hidden">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait" custom={direction}>
            {current && (
              <motion.div
                key={current.id}
                custom={direction}
                initial={{ opacity: 0, x: direction === 'right' ? 60 : -60 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction === 'right' ? -60 : 60, scale: 0.96 }}
                transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                className="rounded-2xl overflow-hidden shadow-lg"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-medium)' }}
              >
                {/* Card header */}
                <div className="px-6 py-4 border-b border-[var(--border)] flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <SourceBadge source={current.source} />
                      {current.triggerType && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-surface)', color: 'var(--text-3)', border: '1px solid var(--border)' }}>
                          {current.triggerType}
                        </span>
                      )}
                    </div>
                    <p className="text-[15px] font-semibold leading-snug" style={{ color: 'var(--text-1)' }}>
                      {current.subject}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <Mail size={10} style={{ color: 'var(--text-3)' }} />
                      <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>To: {current.toEmail}</span>
                    </div>
                  </div>
                  <span className="text-[10px] shrink-0 mt-1" style={{ color: 'var(--text-3)' }}>
                    {format(new Date(current.createdAt), 'HH:mm')}
                  </span>
                </div>

                {/* Email body */}
                <div className="px-6 py-5">
                  <pre
                    className="text-[12.5px] leading-relaxed whitespace-pre-wrap font-sans"
                    style={{ color: 'var(--text-2)', maxHeight: '320px', overflowY: 'auto' }}
                  >
                    {current.body}
                  </pre>
                </div>

                {/* Actions */}
                <div className="px-6 py-4 border-t border-[var(--border)] flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px]" style={{ color: 'var(--text-3)' }}>
                    <span>{currentIndex + 1} of {drafts.length}</span>
                    {drafts.length > 1 && (
                      <>
                        <button onClick={() => { setDirection('left'); setCurrentIndex(i => Math.max(0, i - 1)) }} disabled={currentIndex === 0} className="p-1 rounded hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-30">
                          <ChevronLeft size={12} />
                        </button>
                        <button onClick={() => { setDirection('right'); setCurrentIndex(i => Math.min(drafts.length - 1, i + 1)) }} disabled={currentIndex === drafts.length - 1} className="p-1 rounded hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-30">
                          <ChevronRight size={12} />
                        </button>
                      </>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => { setDirection('right'); actionMutation.mutate({ id: current.id, action: 'reject' }) }}
                      disabled={actionMutation.isPending}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-medium transition-all disabled:opacity-60 hover:scale-105"
                      style={{ background: 'color-mix(in srgb, var(--red) 10%, transparent)', color: 'var(--red)', border: '1px solid color-mix(in srgb, var(--red) 25%, transparent)' }}
                    >
                      <XCircle size={14} />
                      Reject
                      <kbd className="text-[9px] opacity-60 font-mono">Esc</kbd>
                    </button>
                    <button
                      onClick={() => { setDirection('left'); actionMutation.mutate({ id: current.id, action: 'approve' }) }}
                      disabled={actionMutation.isPending}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-medium text-white transition-all disabled:opacity-60 hover:scale-105"
                      style={{ background: 'var(--accent)', boxShadow: '0 4px 14px rgba(124,92,255,0.3)' }}
                    >
                      {actionMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={14} />}
                      Send
                      <kbd className="text-[9px] opacity-70 font-mono">↵</kbd>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
