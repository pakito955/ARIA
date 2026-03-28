'use client'

import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

const CALENDAR_EVENTS = [
  { time: '10:30', title: 'Team Standup',  color: '#7c3aed', note: 'In 45 min' },
  { time: '14:00', title: 'Investor Call', color: '#f59e0b', note: 'Zoom · 45 min' },
  { time: '15:00', title: 'Board Meeting', color: '#ff6b6b', note: 'Reply needed' },
  { time: '17:00', title: 'Weekly Review', color: '#10b981', note: 'ARIA scheduled' },
]

export function TodayTimelineWidget() {
  const currentHour = new Date().getHours()

  return (
    <div className="card-premium p-5 h-full relative overflow-hidden">
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at bottom left, rgba(245,158,11,0.06) 0%, transparent 55%)',
        }}
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-5 relative z-10">
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center"
          style={{
            background: 'rgba(245,158,11,0.14)',
            border: '1px solid rgba(245,158,11,0.26)',
          }}
        >
          <Clock size={12} style={{ color: 'var(--amber)' }} />
        </div>
        <span
          className="text-[9px] tracking-[2.5px] uppercase font-semibold"
          style={{ color: 'var(--amber)' }}
        >
          Today Timeline
        </span>
      </div>

      {/* Timeline */}
      <div className="relative pl-5 space-y-4 relative z-10">
        {/* Vertical track line */}
        <div
          className="absolute left-1.5 top-0 bottom-0 w-px"
          style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.08), transparent)' }}
        />

        {CALENDAR_EVENTS.map((ev, i) => {
          const isPast    = parseInt(ev.time) < currentHour
          const isCurrent = parseInt(ev.time) === currentHour ||
            (parseInt(ev.time) < currentHour &&
              i < CALENDAR_EVENTS.length - 1 &&
              parseInt(CALENDAR_EVENTS[i + 1]?.time) > currentHour)

          return (
            <div
              key={i}
              className={cn('relative transition-opacity duration-200', isPast && 'opacity-35')}
            >
              {/* Timeline dot */}
              <div
                className="absolute -left-[17px] top-1.5 rounded-full border-2 transition-all duration-200"
                style={{
                  background: ev.color,
                  borderColor: 'var(--bg-card)',
                  width:  isCurrent ? 12 : 8,
                  height: isCurrent ? 12 : 8,
                  marginLeft: isCurrent ? '-2px' : '0',
                  boxShadow: isCurrent ? `0 0 12px ${ev.color}80, 0 0 4px ${ev.color}` : 'none',
                }}
              />

              <p className="text-[9px] font-mono mb-0.5 font-medium" style={{ color: 'var(--text-3)' }}>
                {ev.time}
              </p>
              <p className="text-[12.5px] font-medium leading-tight" style={{ color: 'var(--text-1)' }}>
                {ev.title}
              </p>
              <p
                className="text-[10px] mt-0.5 font-medium"
                style={{ color: ev.color, opacity: 0.85 }}
              >
                {ev.note}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
