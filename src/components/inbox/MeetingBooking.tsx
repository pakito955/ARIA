'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, X, Clock, Loader2, Check } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/lib/store'
import { cn } from '@/lib/utils'

interface Props {
  emailId: string
}

const DURATION_OPTIONS = [
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '1 hour', value: 60 },
  { label: '1.5 hours', value: 90 },
  { label: '2 hours', value: 120 },
]

export function MeetingBooking({ emailId }: Props) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [duration, setDuration] = useState(60)
  const [startTime, setStartTime] = useState('')
  const [booked, setBooked] = useState(false)
  const qc = useQueryClient()

  const { data: detection, isLoading } = useQuery({
    queryKey: ['detect-meeting', emailId],
    queryFn: async () => {
      const res = await fetch('/api/ai/detect-meeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailId }),
      })
      if (!res.ok) throw new Error('Detection failed')
      return res.json()
    },
    staleTime: 10 * 60 * 1000,
    enabled: !!emailId,
  })

  const bookMutation = useMutation({
    mutationFn: async () => {
      if (!startTime) throw new Error('Select a start time')
      const start = new Date(startTime)
      const end = new Date(start.getTime() + duration * 60 * 1000)
      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || detection?.suggestedTitle || 'Meeting',
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          emailId,
        }),
      })
      if (!res.ok) throw new Error('Failed to book meeting')
      return res.json()
    },
    onSuccess: () => {
      setBooked(true)
      toast.success('Meeting booked successfully', 'Calendar')
      qc.invalidateQueries({ queryKey: ['calendar'] })
      setTimeout(() => setOpen(false), 1500)
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to book meeting')
    },
  })

  if (isLoading) return null
  if (!detection?.isMeetingRequest) return null

  return (
    <>
      {/* Banner */}
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-6 mt-3 mb-1 px-4 py-2.5 rounded-xl flex items-center justify-between"
        style={{
          background: 'rgba(245,158,11,0.06)',
          border: '1px solid rgba(245,158,11,0.25)',
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">📅</span>
          <div>
            <p className="text-[11.5px] font-medium" style={{ color: 'var(--amber)' }}>
              Meeting Request Detected
            </p>
            {detection.extractedDate && (
              <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>
                Suggested: {detection.extractedDate}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => {
            setTitle(detection.suggestedTitle || '')
            setDuration(detection.suggestedDuration || 60)
            setOpen(true)
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all"
          style={{
            background: 'rgba(245,158,11,0.12)',
            border: '1px solid rgba(245,158,11,0.3)',
            color: 'var(--amber)',
          }}
        >
          <Calendar size={11} />
          Book Meeting
        </button>
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -16 }}
              transition={{ type: 'spring', damping: 28, stiffness: 360 }}
              className="fixed left-1/2 top-[15vh] z-[201] -translate-x-1/2 w-full max-w-sm px-4"
            >
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-medium)',
                  boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
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
                      style={{ background: 'rgba(245,158,11,0.12)' }}
                    >
                      <Calendar size={13} style={{ color: 'var(--amber)' }} />
                    </div>
                    <span className="text-[13px] font-medium" style={{ color: 'var(--text-1)' }}>
                      Book Meeting
                    </span>
                  </div>
                  <button
                    onClick={() => setOpen(false)}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: 'var(--text-3)' }}
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="p-5 space-y-4">
                  {booked ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center justify-center py-6 gap-3"
                    >
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center"
                        style={{ background: 'var(--green-subtle)' }}
                      >
                        <Check size={20} style={{ color: 'var(--green)' }} />
                      </div>
                      <p className="text-[13px] font-medium" style={{ color: 'var(--green)' }}>
                        Meeting booked!
                      </p>
                    </motion.div>
                  ) : (
                    <>
                      {/* Title */}
                      <div>
                        <label className="text-[10px] uppercase tracking-[1.5px] mb-1.5 block" style={{ color: 'var(--text-3)' }}>
                          Meeting Title
                        </label>
                        <input
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="e.g. Project Sync"
                          className="w-full rounded-xl px-3.5 py-2.5 text-[13px] outline-none transition-colors"
                          style={{
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-1)',
                          }}
                          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)' }}
                          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
                        />
                      </div>

                      {/* Duration */}
                      <div>
                        <label className="text-[10px] uppercase tracking-[1.5px] mb-2 block" style={{ color: 'var(--text-3)' }}>
                          Duration
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {DURATION_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => setDuration(opt.value)}
                              className={cn(
                                'px-3 py-1.5 rounded-lg text-[11px] border transition-all',
                                duration === opt.value
                                  ? 'border-[var(--accent)] text-[var(--accent-text)] bg-[var(--accent-subtle)]'
                                  : 'border-[var(--border)] text-[var(--text-2)] hover:border-[var(--border-medium)]'
                              )}
                            >
                              <Clock size={9} className="inline mr-1" />
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Date/time */}
                      <div>
                        <label className="text-[10px] uppercase tracking-[1.5px] mb-1.5 block" style={{ color: 'var(--text-3)' }}>
                          Start Time
                        </label>
                        <input
                          type="datetime-local"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="w-full rounded-xl px-3.5 py-2.5 text-[13px] outline-none"
                          style={{
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-1)',
                          }}
                        />
                      </div>

                      {/* Book button */}
                      <button
                        onClick={() => bookMutation.mutate()}
                        disabled={bookMutation.isPending || !startTime}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-medium text-white transition-all disabled:opacity-60"
                        style={{ background: 'var(--accent)', boxShadow: '0 4px 16px rgba(217,119,87,0.3)' }}
                      >
                        {bookMutation.isPending ? (
                          <><Loader2 size={13} className="animate-spin" /> Booking…</>
                        ) : (
                          <><Calendar size={13} /> Book Meeting</>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
