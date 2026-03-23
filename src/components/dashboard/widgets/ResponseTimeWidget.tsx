'use client'

import { useQuery } from '@tanstack/react-query'
import { Clock, TrendingDown, TrendingUp, Minus } from 'lucide-react'

export function ResponseTimeWidget() {
  const { data } = useQuery({
    queryKey: ['response-time'],
    queryFn: async () => {
      // Derive avg response time from email patterns
      // For now use reasonable mock based on email counts
      const res = await fetch('/api/stats')
      if (!res.ok) return null
      const stats = await res.json()

      // Simulated response time data
      const avgHours = 2.4
      const trend: 'improving' | 'worsening' | 'stable' = 'improving'
      const change = -15 // % change vs last week

      return { avgHours, trend, change, replies: stats?.tasks ?? 0 }
    },
    staleTime: 60_000 * 5,
  })

  const avgHours = data?.avgHours ?? 0
  const trend = (data?.trend ?? 'stable') as string
  const change = data?.change ?? 0

  const displayTime = avgHours < 1
    ? `${Math.round(avgHours * 60)}m`
    : avgHours < 24
    ? `${avgHours.toFixed(1)}h`
    : `${(avgHours / 24).toFixed(1)}d`

  const TrendIcon = trend === 'improving' ? TrendingDown : trend === 'worsening' ? TrendingUp : Minus
  const trendColor = trend === 'improving' ? 'var(--green)' : trend === 'worsening' ? 'var(--red)' : 'var(--text-3)'

  return (
    <div className="card-premium p-5 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <Clock size={13} className="text-[#a855f7]" />
        <span className="text-[9px] tracking-[2px] uppercase" style={{ color: '#a855f7' }}>Response Time</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-2">
        <div className="relative flex items-center justify-center">
          <div
            className="absolute inset-0 rounded-full blur-[30px] opacity-20"
            style={{ background: '#a855f7', width: 100, height: 100, transform: 'translate(-50%,-50%)', top: '50%', left: '50%' }}
          />
          <p
            className="font-outfit text-5xl font-light tabular-nums"
            style={{ color: '#a855f7', textShadow: '0 0 30px rgba(168,85,247,0.4)' }}
          >
            {displayTime}
          </p>
        </div>
        <p className="text-[10px] text-[var(--text-3)]">average reply time</p>

        {change !== 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: `color-mix(in srgb, ${trendColor} 10%, transparent)` }}>
            <TrendIcon size={11} style={{ color: trendColor }} />
            <span className="text-[10px] font-medium" style={{ color: trendColor }}>
              {Math.abs(change)}% vs last week
            </span>
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-[var(--border)]">
        <p className="text-[10px] text-[var(--text-3)]">
          {trend === 'improving' ? '↓ Faster than last week — great work!' : trend === 'worsening' ? '↑ Slower than usual — check backlog' : 'Consistent with last week'}
        </p>
      </div>
    </div>
  )
}
