'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Clock } from 'lucide-react'
import { addHours, nextMonday, setHours, setMinutes, startOfDay, addDays } from 'date-fns'

interface Props {
  onConfirm: (snoozeUntil: Date) => void
  onClose: () => void
}

type Preset = {
  label: string
  description: string
  getDate: () => Date
}

const PRESETS: Preset[] = [
  {
    label: 'Later Today',
    description: '+3 hours',
    getDate: () => addHours(new Date(), 3),
  },
  {
    label: 'Tomorrow Morning',
    description: '9:00 AM',
    getDate: () => setMinutes(setHours(addDays(startOfDay(new Date()), 1), 9), 0),
  },
  {
    label: 'Next Monday',
    description: '9:00 AM',
    getDate: () => setMinutes(setHours(nextMonday(new Date()), 9), 0),
  },
  {
    label: 'In a Week',
    description: '7 days',
    getDate: () => setMinutes(setHours(addDays(new Date(), 7), 9), 0),
  },
]

export function SnoozePickerModal({ onConfirm, onClose }: Props) {
  const [customDate, setCustomDate] = useState('')

  const handlePreset = (preset: Preset) => {
    onConfirm(preset.getDate())
  }

  const handleCustom = () => {
    if (!customDate) return
    const date = new Date(customDate)
    if (!isNaN(date.getTime())) {
      onConfirm(date)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--accent-subtle)' }}
            >
              <Clock size={13} style={{ color: 'var(--accent-text)' }} />
            </div>
            <div>
              <p className="text-[13px] font-medium" style={{ color: 'var(--text-1)' }}>Snooze Email</p>
              <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>Remind me later</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-3)' }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-1)')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-3)')}
          >
            <X size={15} />
          </button>
        </div>

        {/* Presets */}
        <div className="p-4 space-y-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => handlePreset(preset)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all text-left"
              style={{ border: '1px solid var(--border)' }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement
                el.style.borderColor = 'var(--accent)'
                el.style.background = 'var(--accent-subtle)'
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement
                el.style.borderColor = 'var(--border)'
                el.style.background = 'transparent'
              }}
            >
              <span className="text-[13px] font-medium" style={{ color: 'var(--text-1)' }}>
                {preset.label}
              </span>
              <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>
                {preset.description}
              </span>
            </button>
          ))}

          {/* Custom datetime */}
          <div
            className="mt-3 pt-3"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            <p className="text-[11px] mb-2" style={{ color: 'var(--text-3)' }}>Custom date &amp; time</p>
            <div className="flex gap-2">
              <input
                type="datetime-local"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="flex-1 rounded-lg px-3 py-2 text-[12px] outline-none transition-colors"
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-1)',
                  colorScheme: 'dark',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--border-focus)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
              />
              <button
                onClick={handleCustom}
                disabled={!customDate}
                className="px-4 py-2 rounded-lg text-[12px] font-medium text-white transition-colors disabled:opacity-40"
                style={{ background: 'var(--accent)' }}
              >
                Set
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
