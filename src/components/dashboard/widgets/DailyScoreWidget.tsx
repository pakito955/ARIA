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

  const score  = scoreData?.score ?? 0
  const size   = 120
  const stroke = 8
  const r      = (size - stroke) / 2
  const cx     = size / 2
  const cy     = size / 2
  const circ   = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ

  const label  = score >= 70 ? 'Excellent' : score >= 50 ? 'Good' : score >= 30 ? 'Fair' : 'Getting started'

  // Gradient ID unique to this component
  const gradId = 'score-ring-gradient'

  return (
    <div
      className="card-premium p-5 flex flex-col items-center justify-center gap-4 h-full relative overflow-hidden"
    >
      {/* Ambient glow behind the ring */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 45%, rgba(124,58,237,0.10) 0%, transparent 65%)',
        }}
      />

      {/* Header row */}
      <div className="w-full flex items-center justify-between relative z-10">
        <p
          className="text-[9px] tracking-[2.5px] uppercase font-semibold"
          style={{ color: 'var(--text-3)' }}
        >
          Daily Score
        </p>
        {(scoreData?.streak ?? 0) > 0 && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold"
            style={{
              background: 'rgba(255,179,71,0.12)',
              border: '1px solid rgba(255,179,71,0.25)',
              color: 'var(--amber)',
            }}
          >
            <Flame size={10} />
            {scoreData!.streak}d
          </div>
        )}
      </div>

      {/* Score ring */}
      <div className="relative flex items-center justify-center z-10">
        {/* Soft ambient glow */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            inset: '-12px',
            background: 'radial-gradient(circle, rgba(124,58,237,0.22) 0%, transparent 70%)',
            filter: 'blur(12px)',
          }}
        />

        <svg
          width={size}
          height={size}
          className="rotate-[-90deg]"
          style={{ filter: 'drop-shadow(0 0 10px rgba(124,58,237,0.35))' }}
        >
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#ff6a3d" />
              <stop offset="45%"  stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>

          {/* Track */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={stroke}
          />

          {/* Progress */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth={stroke}
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 1.4s cubic-bezier(0.34,1.56,0.64,1)',
            }}
          />
        </svg>

        {/* Center score text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0">
          <span
            className="font-inter text-3xl font-bold tabular-nums leading-none"
            style={{ color: 'var(--text-1)' }}
          >
            {score}
          </span>
          <span className="text-[9px] font-medium" style={{ color: 'var(--text-3)' }}>/100</span>
        </div>
      </div>

      {/* Label row */}
      <div className="text-center relative z-10">
        <p
          className="text-[12px] font-semibold"
          style={{
            background: 'linear-gradient(135deg, #ff6a3d, #7c3aed)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {label}
        </p>
        <div className="mt-1 flex items-center gap-1 justify-center">
          <TrendingUp size={9} style={{ color: 'var(--text-3)' }} />
          <span className="text-[9px]" style={{ color: 'var(--text-3)' }}>vs yesterday</span>
        </div>
      </div>

      <Link href="/dashboard/report" className="relative z-10">
        <span
          className="flex items-center gap-1 text-[10px] transition-colors hover:text-[var(--text-1)]"
          style={{ color: 'var(--text-3)' }}
        >
          <FileText size={9} /> Weekly report
        </span>
      </Link>
    </div>
  )
}
