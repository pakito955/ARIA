'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Archive, Reply, CheckSquare, Clock, X, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/lib/store'

interface TriageModeProps {
  emails: any[]
  onArchive: (id: string) => void
  onReply: (id: string) => void
  onTask: (id: string) => void
  onSnooze: (id: string) => void
  onClose: () => void
}

export function TriageMode({ emails, onArchive, onReply, onTask, onSnooze, onClose }: TriageModeProps) {
  const [index, setIndex] = useState(0)
  const [processed, setProcessed] = useState(0)
  const { setSelectedEmail } = useAppStore()

  const current = emails[index]

  const next = useCallback(() => {
    if (index < emails.length - 1) {
      setIndex((i) => i + 1)
      setSelectedEmail(emails[index + 1]?.id || null)
    } else {
      onClose()
    }
  }, [index, emails, setSelectedEmail, onClose])

  const prev = useCallback(() => {
    if (index > 0) setIndex((i) => i - 1)
  }, [index])

  const handleAction = useCallback((action: 'archive' | 'reply' | 'task' | 'snooze') => {
    if (!current) return
    setProcessed((p) => p + 1)

    if (action === 'archive') onArchive(current.id)
    if (action === 'reply') onReply(current.id)
    if (action === 'task') onTask(current.id)
    if (action === 'snooze') onSnooze(current.id)

    next()
  }, [current, onArchive, onReply, onTask, onSnooze, next])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      switch (e.key.toLowerCase()) {
        case 'e': handleAction('archive'); break
        case 'r': handleAction('reply'); break
        case 't': handleAction('task'); break
        case 's': handleAction('snooze'); break
        case 'j': next(); break
        case 'k': prev(); break
        case 'escape': onClose(); break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleAction, next, prev, onClose])

  useEffect(() => {
    if (current) setSelectedEmail(current.id)
  }, [current, setSelectedEmail])

  if (!current) return null

  const progressPct = ((index) / emails.length) * 100

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm flex items-center justify-center"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="w-full max-w-xl mx-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[9px] tracking-[2.5px] uppercase text-[#7C5CFF]">ARIA Triage Mode</p>
            <p className="text-[12px] text-[var(--text-2)] mt-0.5">
              {index + 1} of {emails.length} · {processed} processed
            </p>
          </div>
          <button onClick={onClose} className="text-[var(--text-3)] hover:text-white p-1.5">
            <X size={16} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-white/[0.04] rounded-full mb-4 overflow-hidden">
          <motion.div
            animate={{ width: `${progressPct}%` }}
            className="h-full bg-[#7C5CFF] rounded-full"
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Email card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl border border-white/[0.08] bg-[var(--bg-card)] p-6 mb-4"
          >
            {/* Priority indicator */}
            {current.analysis?.priority && (
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="text-[8px] tracking-[1.5px] uppercase px-2 py-0.5 rounded-full"
                  style={{
                    background: current.analysis.priority === 'CRITICAL'
                      ? 'rgba(239,68,68,0.12)' : 'rgba(124,92,255,0.1)',
                    color: current.analysis.priority === 'CRITICAL' ? '#ef4444' : '#7C5CFF',
                  }}
                >
                  {current.analysis.priority}
                </span>
              </div>
            )}

            <p className="text-[11px] text-[var(--text-2)] mb-1.5">
              {current.fromName || current.fromEmail}
            </p>
            <h3 className="text-[15px] font-medium text-white mb-3 leading-snug">
              {current.subject}
            </h3>

            {current.analysis?.summary ? (
              <p className="text-[12px] text-[var(--text-2)] leading-relaxed border-l-2 border-[#7C5CFF]/30 pl-3">
                {current.analysis.summary}
              </p>
            ) : (
              <p className="text-[12px] text-[var(--text-2)] leading-relaxed line-clamp-3">
                {current.bodyText?.slice(0, 200)}
              </p>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Action buttons */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { action: 'archive' as const, icon: Archive, label: 'Archive', key: 'E', color: 'var(--text-3)', bg: 'rgba(74,74,106,0.12)' },
            { action: 'reply' as const, icon: Reply, label: 'Reply', key: 'R', color: '#7C5CFF', bg: 'rgba(124,92,255,0.12)' },
            { action: 'task' as const, icon: CheckSquare, label: 'Task', key: 'T', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
            { action: 'snooze' as const, icon: Clock, label: 'Snooze', key: 'S', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
          ].map(({ action, icon: Icon, label, key, color, bg }) => (
            <button
              key={action}
              onClick={() => handleAction(action)}
              className="flex flex-col items-center gap-2 py-4 rounded-xl border border-white/[0.06] hover:border-white/[0.12] transition-all group"
              style={{ background: bg }}
            >
              <Icon size={18} style={{ color }} />
              <span className="text-[10px] font-medium" style={{ color }}>{label}</span>
              <kbd className="text-[8px] bg-white/[0.05] text-[var(--text-3)] px-1.5 py-0.5 rounded font-mono">{key}</kbd>
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={prev}
            disabled={index === 0}
            className="flex items-center gap-1.5 text-[10px] text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors disabled:opacity-30"
          >
            <ChevronUp size={13} />
            K — Previous
          </button>
          <p className="text-[9px] text-[var(--text-3)]">ESC to exit</p>
          <button
            onClick={next}
            className="flex items-center gap-1.5 text-[10px] text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors"
          >
            J — Next
            <ChevronDown size={13} />
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
