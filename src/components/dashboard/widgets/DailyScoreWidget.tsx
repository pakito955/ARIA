'use client'

import { useQuery } from '@tanstack/react-query'
import { Flame, FileText, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export function DailyScoreWidget() {
  const { data: scoreData } = useQuery({
    queryKey: ['score'],
    queryFn: async () => {
      const res = await fetch('/api/score')
      if (!res.ok) return { score: 0, streak: 0 }
      return res.json()
    },
    staleTime: 60_000,
  })

  const score = scoreData?.score ?? 0
  const r = 32
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444'
  const label = score >= 70 ? 'Excellent' : score >= 50 ? 'Good' : score >= 30 ? 'Fair' : 'Getting started'

  return (
    <div className="card-premium p-5 flex flex-col items-center justify-center gap-3 h-full">
      <div className="w-full flex items-center justify-between">
        <p className="text-[9px] tracking-[2px] uppercase text-[var(--text-3)]">Daily Score</p>
        {scoreData?.streak > 0 && (
          <div className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--amber)' }}>
            <Flame size={10} />
            {scoreData.streak}d streak
          </div>
        )}
      </div>

      <div className="relative flex items-center justify-center">
        {/* Outer glow */}
        <div
          className="absolute inset-0 rounded-full blur-[18px] opacity-30"
          style={{ background: color }}
        />
        <svg width="80" height="80" className="rotate-[-90deg]">
          <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
          <circle
            cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="6"
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1)' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-outfit text-2xl font-light text-white">{score}</span>
          <span className="text-[8px] text-[var(--text-3)]">/100</span>
        </div>
      </div>

      <div className="text-center">
        <p className="text-[11px] font-medium" style={{ color }}>{label}</p>
        <div className="mt-1 flex items-center gap-1 justify-center">
          <TrendingUp size={9} style={{ color: 'var(--text-3)' }} />
          <span className="text-[9px] text-[var(--text-3)]">vs yesterday</span>
        </div>
      </div>

      <Link href="/dashboard/report" className="text-[10px]" style={{ color: 'var(--text-3)' }}>
        <span className="flex items-center gap-1 hover:text-[var(--accent-text)] transition-colors">
          <FileText size={9} /> Weekly report
        </span>
      </Link>
    </div>
  )
}
