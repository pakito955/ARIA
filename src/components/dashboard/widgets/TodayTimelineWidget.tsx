'use client'

import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

const CALENDAR_EVENTS = [
  { time: '10:30', title: 'Team Standup', color: '#8b5cf6', note: 'In 45 min' },
  { time: '14:00', title: 'Investor Call', color: '#f59e0b', note: 'Zoom · 45 min' },
  { time: '15:00', title: 'Board Meeting', color: '#ef4444', note: 'Reply needed' },
  { time: '17:00', title: 'Weekly Review', color: '#10b981', note: 'ARIA scheduled' },
]

export function TodayTimelineWidget() {
  const currentHour = new Date().getHours()

  return (
    <div className="card-premium p-5 h-full">
      <div className="flex items-center gap-2 mb-4">
        <Clock size={13} className="text-[var(--amber)]" />
        <span className="text-[9px] tracking-[2px] uppercase text-[var(--amber)]">Today Timeline</span>
      </div>

      <div className="relative pl-4">
        <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-white/[0.06]" />
        <div className="space-y-3.5">
          {CALENDAR_EVENTS.map((ev, i) => {
            const isPast = parseInt(ev.time) < currentHour
            const isCurrent =
              parseInt(ev.time) === currentHour || (parseInt(ev.time) < currentHour && i < CALENDAR_EVENTS.length - 1 && parseInt(CALENDAR_EVENTS[i + 1]?.time) > currentHour)
            return (
              <div key={i} className={cn('relative transition-opacity', isPast && 'opacity-35')}>
                <div
                  className="absolute -left-[17px] top-1.5 rounded-full border-2 border-[var(--bg-card)] transition-all"
                  style={{
                    background: ev.color,
                    width: isCurrent ? 10 : 8,
                    height: isCurrent ? 10 : 8,
                    boxShadow: isCurrent ? `0 0 8px ${ev.color}80` : undefined,
                  }}
                />
                <p className="text-[9px] font-mono text-[var(--text-3)] mb-0.5">{ev.time}</p>
                <p className="text-[12px] text-[var(--text-1)]">{ev.title}</p>
                <p className="text-[10px]" style={{ color: ev.color }}>{ev.note}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
