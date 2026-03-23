'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, ChevronRight, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  onSnooze: (until: Date) => void
  onClose: () => void
  trigger?: React.ReactNode
}

function getSnoozeOptions() {
  const now = new Date()

  const in1h = new Date(now.getTime() + 60 * 60 * 1000)
  const in3h = new Date(now.getTime() + 3 * 60 * 60 * 1000)

  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(9, 0, 0, 0)

  const nextWeek = new Date(now)
  nextWeek.setDate(nextWeek.getDate() + 7)
  nextWeek.setHours(9, 0, 0, 0)

  return [
    { label: 'For 1 hour', sublabel: in1h.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), date: in1h },
    { label: 'For 3 hours', sublabel: in3h.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), date: in3h },
    { label: 'Tomorrow at 9am', sublabel: tomorrow.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }), date: tomorrow },
    { label: 'Next week', sublabel: nextWeek.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }), date: nextWeek },
  ]
}

export function SnoozeMenu({ onSnooze, onClose, trigger }: Props) {
  const [showCustom, setShowCustom] = useState(false)
  const [customDate, setCustomDate] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const options = getSnoozeOptions()

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const handleCustom = () => {
    if (!customDate) return
    onSnooze(new Date(customDate))
    onClose()
  }

  return (
    <div ref={containerRef} className="relative">
      {trigger}

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -4 }}
        transition={{ duration: 0.12, ease: 'easeOut' }}
        className="absolute right-0 top-8 w-56 rounded-2xl shadow-2xl z-50 overflow-hidden"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2 px-3 py-2.5"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <Clock size={11} style={{ color: 'var(--accent-text)' }} />
          <span className="text-[10px] uppercase tracking-[2px] font-medium" style={{ color: 'var(--accent-text)' }}>
            Snooze until
          </span>
        </div>

        {/* Options */}
        <div className="py-1">
          {options.map((opt) => (
            <button
              key={opt.label}
              onClick={() => { onSnooze(opt.date); onClose() }}
              className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[var(--bg-hover)] transition-colors"
            >
              <span className="text-[12.5px]" style={{ color: 'var(--text-1)' }}>{opt.label}</span>
              <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>{opt.sublabel}</span>
            </button>
          ))}

          {/* Custom divider */}
          <div className="mx-3 my-1" style={{ borderTop: '1px solid var(--border)' }} />

          {/* Custom option */}
          <button
            onClick={() => setShowCustom(!showCustom)}
            className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[var(--bg-hover)] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Calendar size={11} style={{ color: 'var(--text-3)' }} />
              <span className="text-[12.5px]" style={{ color: 'var(--text-1)' }}>Custom…</span>
            </div>
            <ChevronRight
              size={11}
              className="transition-transform"
              style={{
                color: 'var(--text-3)',
                transform: showCustom ? 'rotate(90deg)' : 'rotate(0deg)',
              }}
            />
          </button>

          {/* Custom date input */}
          <AnimatePresence>
            {showCustom && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden px-3 pb-3"
              >
                <input
                  type="datetime-local"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-[11px] outline-none mb-2"
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-1)',
                  }}
                />
                <button
                  onClick={handleCustom}
                  disabled={!customDate}
                  className="w-full py-2 rounded-lg text-[11px] font-medium text-white transition-all disabled:opacity-40"
                  style={{ background: 'var(--accent)' }}
                >
                  Set snooze
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
