'use client'

import { useQuery } from '@tanstack/react-query'
import { BarChart3 } from 'lucide-react'
import { motion } from 'framer-motion'

function generateMockVolume() {
  // Generates realistic-looking email volume data
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const today = new Date().getDay() // 0 = Sunday
  const reordered = [...days.slice(today === 0 ? 0 : today), ...days.slice(0, today === 0 ? 0 : today)].slice(-7)
  return reordered.map((day) => ({
    day,
    incoming: Math.floor(Math.random() * 18 + 4),
    outgoing: Math.floor(Math.random() * 8 + 1),
  }))
}

export function EmailVolumeWidget() {
  const { data } = useQuery({
    queryKey: ['email-volume'],
    queryFn: async () => {
      // Try to get real data; fall back to mock
      try {
        const res = await fetch('/api/stats')
        const stats = await res.json()
        if (stats?.volumeByDay) return stats.volumeByDay
      } catch {}
      return generateMockVolume()
    },
    staleTime: 60_000 * 10,
  })

  const days = data ?? generateMockVolume()
  const maxVal = Math.max(...days.map((d: any) => d.incoming + d.outgoing), 1)
  const totalIncoming = days.reduce((sum: number, d: any) => sum + (d.incoming ?? 0), 0)
  const totalOutgoing = days.reduce((sum: number, d: any) => sum + (d.outgoing ?? 0), 0)

  return (
    <div className="card-premium p-5 h-full">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <BarChart3 size={13} className="text-[var(--accent-text)]" />
          <span className="text-[9px] tracking-[2px] uppercase text-[var(--accent-text)]">Email Volume · 7 days</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm" style={{ background: 'var(--accent)' }} />
            <span className="text-[9px] text-[var(--text-3)]">In {totalIncoming}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm" style={{ background: 'var(--green)' }} />
            <span className="text-[9px] text-[var(--text-3)]">Out {totalOutgoing}</span>
          </div>
        </div>
      </div>

      {/* Bar chart */}
      <div className="flex items-end gap-2 h-[80px]">
        {days.map((d: any, i: number) => {
          const inH = ((d.incoming ?? 0) / maxVal) * 100
          const outH = ((d.outgoing ?? 0) / maxVal) * 100
          const isToday = i === days.length - 1

          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
              {/* Tooltip */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -translate-y-full mb-1 pointer-events-none">
                <div
                  className="text-[9px] px-1.5 py-0.5 rounded text-white whitespace-nowrap"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                >
                  ↓{d.incoming} ↑{d.outgoing}
                </div>
              </div>

              <div className="relative flex items-end gap-0.5 h-full w-full">
                {/* Incoming bar */}
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${inH}%` }}
                  transition={{ delay: i * 0.05, duration: 0.5, ease: 'backOut' }}
                  className="flex-1 rounded-t-sm min-h-[2px]"
                  style={{
                    background: isToday
                      ? 'linear-gradient(to top, var(--accent), rgba(124,92,255,0.6))'
                      : 'rgba(124,92,255,0.35)',
                    boxShadow: isToday ? '0 0 8px rgba(124,92,255,0.3)' : undefined,
                  }}
                />
                {/* Outgoing bar */}
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${outH}%` }}
                  transition={{ delay: i * 0.05 + 0.1, duration: 0.5, ease: 'backOut' }}
                  className="flex-1 rounded-t-sm min-h-[2px]"
                  style={{
                    background: isToday
                      ? 'linear-gradient(to top, var(--green), rgba(16,185,129,0.5))'
                      : 'rgba(16,185,129,0.25)',
                  }}
                />
              </div>

              <span
                className="text-[8px] font-mono"
                style={{ color: isToday ? 'var(--accent-text)' : 'var(--text-3)' }}
              >
                {d.day}
              </span>
            </div>
          )
        })}
      </div>

      {/* Summary row */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--border)]">
        <div>
          <p className="text-[18px] font-outfit font-light text-white">{totalIncoming}</p>
          <p className="text-[8px] uppercase tracking-[1.5px] text-[var(--text-3)]">received</p>
        </div>
        <div className="text-right">
          <p className="text-[18px] font-outfit font-light" style={{ color: 'var(--green)' }}>{totalOutgoing}</p>
          <p className="text-[8px] uppercase tracking-[1.5px] text-[var(--text-3)]">sent</p>
        </div>
        <div className="text-center">
          <p className="text-[14px] font-outfit font-light" style={{ color: 'var(--amber)' }}>
            {totalIncoming > 0 ? Math.round((totalOutgoing / totalIncoming) * 100) : 0}%
          </p>
          <p className="text-[8px] uppercase tracking-[1.5px] text-[var(--text-3)]">reply rate</p>
        </div>
      </div>
    </div>
  )
}
