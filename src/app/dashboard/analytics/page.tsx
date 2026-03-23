'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'
import { TrendingUp, Clock, Mail, Zap, Flame, Star } from 'lucide-react'

function AnimatedNumber({ target, suffix = '', prefix = '' }: { target: number; suffix?: string; prefix?: string }) {
  const [current, setCurrent] = useState(0)
  useEffect(() => {
    let start = 0
    const duration = 1200
    const step = 16
    const increment = target / (duration / step)
    const timer = setInterval(() => {
      start += increment
      if (start >= target) { setCurrent(target); clearInterval(timer) }
      else setCurrent(Math.floor(start))
    }, step)
    return () => clearInterval(timer)
  }, [target])
  return <span>{prefix}{current}{suffix}</span>
}

function Sparkline({ data, color = '#7C5CFF' }: { data: number[]; color?: string }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const w = 120, h = 40
  const points = data.map((v, i) => ({ x: (i / (data.length - 1)) * w, y: h - ((v - min) / range) * (h - 6) - 3 }))
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const fill = `${path} L ${w} ${h} L 0 ${h} Z`
  return (
    <svg width={w} height={h} className="overflow-visible">
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fill} fill={`url(#grad-${color.replace('#', '')})`} />
      <path d={path} stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ScoreRing({ score }: { score: number }) {
  const r = 36
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444'
  return (
    <svg width="96" height="96" className="rotate-[-90deg]">
      <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
      <circle
        cx="48" cy="48" r={r} fill="none"
        stroke={color} strokeWidth="8"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1s ease' }}
      />
    </svg>
  )
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOURS = Array.from({ length: 24 }, (_, i) => i)

export default function AnalyticsPage() {
  const { data } = useQuery({
    queryKey: ['analytics'],
    queryFn: async () => {
      const res = await fetch('/api/analytics')
      if (!res.ok) return {
        emailsThisWeek: 247, timeSaved: 4.2, responseRate: 94, aiActions: 128,
        weeklyVolume: [12, 8, 15, 7, 18, 9, 14],
        categories: [
          { label: 'Task', value: 38, color: '#10b981' },
          { label: 'Meeting', value: 22, color: '#f59e0b' },
          { label: 'Info', value: 28, color: '#7C5CFF' },
          { label: 'Spam', value: 12, color: 'var(--text-3)' },
        ],
        topSenders: [],
        heatmap: null,
        avgResponseHours: 0,
      }
      return res.json()
    },
  })

  const { data: scoreData } = useQuery({
    queryKey: ['score'],
    queryFn: async () => {
      const res = await fetch('/api/score')
      if (!res.ok) return { score: 72, streak: 3, breakdown: {} }
      return res.json()
    },
  })

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  const METRICS = [
    { label: 'Emails handled', value: data?.emailsThisWeek ?? 0, suffix: '', unit: 'this month', color: '#7C5CFF', icon: Mail, sparkData: [20, 35, 28, 42, 38, 51, 47] },
    { label: 'Time saved', value: data?.timeSaved ?? 0, suffix: 'h', unit: 'this month', color: '#10b981', icon: Clock, sparkData: [0.8, 1.2, 2.1, 1.8, 3.2, 3.8, 4.2] },
    { label: 'Response rate', value: data?.responseRate ?? 0, suffix: '%', unit: 'average', color: '#f59e0b', icon: TrendingUp, sparkData: [78, 82, 85, 88, 90, 92, 94] },
    { label: 'AI actions taken', value: data?.aiActions ?? 0, suffix: '', unit: 'total', color: '#4fd1c5', icon: Zap, sparkData: [8, 14, 22, 31, 45, 67, 128] },
  ]

  const heatmapMax = data?.heatmap
    ? Math.max(...data.heatmap.flat(), 1)
    : 1

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-5 border-b border-[var(--border)]">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] pulse-violet" />
          <span className="text-[9px] tracking-[2.5px] uppercase text-[var(--accent-text)]">ARIA · Insights</span>
        </div>
        <h1 className="font-outfit text-3xl font-light tracking-tight">Intelligence Report</h1>
        <p className="text-[11px] text-[var(--text-3)] mt-0.5">Your productivity amplified by AI</p>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Hero: Time Saved + AI Score side by side */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:col-span-2 relative overflow-hidden rounded-2xl border border-[var(--accent)] p-6"
            style={{ background: 'linear-gradient(135deg, rgba(124,92,255,0.08) 0%, rgba(11,11,15,0.95) 60%)' }}
          >
            <div className="absolute top-0 right-0 w-48 h-48 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(124,92,255,0.12), transparent 70%)' }} />
            <p className="text-[9px] tracking-[2.5px] uppercase text-[var(--accent-text)] mb-2">This month, ARIA saved you</p>
            <p className="font-outfit text-6xl font-light text-white mb-1">
              <AnimatedNumber target={data?.timeSaved ? Math.round(data.timeSaved * 10) / 10 : 42} suffix="h" />
            </p>
            <p className="text-[12px] text-[var(--text-2)]">of email processing time</p>
            <p className="text-[10.5px] text-[var(--text-3)] mt-3">
              At €50/h → <span className="text-[var(--green)] font-medium">€{Math.round((data?.timeSaved ?? 4.2) * 50)} saved this month</span>
            </p>
          </motion.div>

          {/* AI Score */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card-premium p-5 flex flex-col items-center justify-center gap-2"
          >
            <p className="text-[9px] tracking-[2px] uppercase text-[var(--text-3)]">Daily Score</p>
            <div className="relative flex items-center justify-center">
              <ScoreRing score={scoreData?.score ?? 0} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-outfit text-3xl font-light text-white">{scoreData?.score ?? 0}</span>
                <span className="text-[9px] text-[var(--text-3)]">/ 100</span>
              </div>
            </div>
            {scoreData?.streak > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: 'color-mix(in srgb, var(--amber) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--amber) 25%, transparent)' }}>
                <Flame size={10} style={{ color: 'var(--amber)' }} />
                <span className="text-[10px] font-medium" style={{ color: 'var(--amber)' }}>{scoreData.streak} day streak</span>
              </div>
            )}
          </motion.div>
        </div>

        {/* 4 Metric cards */}
        <div className="grid grid-cols-2 gap-3">
          {METRICS.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + i * 0.07 }}
              className="card-premium p-4 relative overflow-hidden"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${m.color}14` }}>
                  <m.icon size={14} style={{ color: m.color }} />
                </div>
                <Sparkline data={m.sparkData} color={m.color} />
              </div>
              <p className="font-outfit text-4xl font-light mb-0.5" style={{ color: m.color }}>
                <AnimatedNumber target={m.value} suffix={m.suffix} />
              </p>
              <p className="text-[11px] text-white">{m.label}</p>
              <p className="text-[9px] text-[var(--text-3)] mt-0.5">{m.unit}</p>
            </motion.div>
          ))}
        </div>

        {/* Weekly volume */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="card p-5">
          <p className="text-[8px] tracking-[2px] uppercase text-[var(--text-3)] mb-5">Email Volume · This Week</p>
          <div className="flex items-end gap-2">
            {(data?.weeklyVolume || [12, 8, 15, 7, 18, 9, 14]).map((v: number, i: number) => {
              const max = Math.max(...(data?.weeklyVolume || [18]))
              const isToday = i === new Date().getDay() - 1
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-[9px] text-[var(--text-3)] font-mono">{v}</span>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max((v / max) * 80, 4)}px` }}
                    transition={{ delay: 0.3 + i * 0.06, ease: 'easeOut', duration: 0.5 }}
                    className="w-full rounded-md"
                    style={{
                      background: isToday ? 'linear-gradient(180deg, #7C5CFF, #6D4EF0)' : 'rgba(255,255,255,0.06)',
                      boxShadow: isToday ? '0 0 12px rgba(124,92,255,0.35)' : 'none',
                    }}
                  />
                  <span className={cn('text-[9px]', isToday ? 'text-[var(--accent-text)]' : 'text-[var(--text-3)]')}>{days[i]}</span>
                </div>
              )
            })}
          </div>
        </motion.div>

        {/* Email Heatmap */}
        {data?.heatmap && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="card p-5">
            <p className="text-[8px] tracking-[2px] uppercase text-[var(--text-3)] mb-4">Email Activity Heatmap · Last 90 days</p>
            <div className="overflow-x-auto">
              <div className="min-w-[400px]">
                {/* Hour labels */}
                <div className="flex ml-8 mb-1 gap-px">
                  {HOURS.filter((h) => h % 4 === 0).map((h) => (
                    <div key={h} className="text-[8px] text-[var(--text-3)]" style={{ width: `${(4 / 24) * 100}%` }}>{h}:00</div>
                  ))}
                </div>
                {DAYS.map((day, d) => (
                  <div key={day} className="flex items-center gap-px mb-px">
                    <div className="text-[9px] text-[var(--text-3)] w-8 shrink-0">{day}</div>
                    {HOURS.map((h) => {
                      const val = data.heatmap[d]?.[h] || 0
                      const intensity = val / heatmapMax
                      return (
                        <div
                          key={h}
                          title={`${day} ${h}:00 — ${val} emails`}
                          className="flex-1 h-4 rounded-sm transition-all cursor-default"
                          style={{
                            background: intensity < 0.05
                              ? 'rgba(255,255,255,0.04)'
                              : `rgba(124,92,255,${0.08 + intensity * 0.82})`,
                          }}
                        />
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Top Senders */}
        {data?.topSenders?.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="card p-5">
            <p className="text-[8px] tracking-[2px] uppercase text-[var(--text-3)] mb-4">Top Senders · Last 30 days</p>
            <div className="space-y-3">
              {data.topSenders.map((s: any, i: number) => {
                const max = data.topSenders[0].count
                const hue = s.email.split('').reduce((a: number, c: string) => a + c.charCodeAt(0), 0) % 360
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                      style={{ background: `hsl(${hue},50%,40%)` }}
                    >
                      {(s.name || s.email).slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-[11px] mb-1.5">
                        <span className="text-[var(--text-2)] truncate">{s.name || s.email}</span>
                        <span className="text-white font-mono shrink-0 ml-2">{s.count}</span>
                      </div>
                      <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(s.count / max) * 100}%` }}
                          transition={{ duration: 0.7, ease: 'easeOut', delay: 0.4 + i * 0.05 }}
                          className="h-full rounded-full bg-[var(--accent)]"
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* Avg response time */}
        {data?.avgResponseHours > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.42 }} className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[8px] tracking-[2px] uppercase text-[var(--text-3)] mb-1">Avg. Response Time</p>
                <p className="font-outfit text-3xl font-light text-white">{data.avgResponseHours}h</p>
                <p className="text-[11px] text-[var(--text-3)] mt-1">From receipt to ARIA analysis</p>
              </div>
              <Clock size={32} style={{ color: 'var(--text-3)', opacity: 0.3 }} />
            </div>
          </motion.div>
        )}

        {/* Category breakdown */}
        {data?.categories && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }} className="card p-5">
            <p className="text-[8px] tracking-[2px] uppercase text-[var(--text-3)] mb-4">Email Categories</p>
            <div className="space-y-3">
              {data.categories.map((c: any) => (
                <div key={c.label}>
                  <div className="flex justify-between text-[11px] mb-1.5">
                    <span className="text-[var(--text-2)]">{c.label}</span>
                    <span className="text-white font-mono">{c.value}%</span>
                  </div>
                  <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${c.value}%` }}
                      transition={{ duration: 0.7, ease: 'easeOut', delay: 0.45 }}
                      className="h-full rounded-full"
                      style={{ background: c.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ROI card */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="rounded-2xl p-5 border border-[#10b981]/20 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.06), rgba(10,10,22,0.95))' }}
        >
          <div className="absolute right-0 bottom-0 w-32 h-32 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.08), transparent 70%)' }} />
          <p className="text-[8px] tracking-[2.5px] uppercase text-[var(--green)] mb-4">ROI Calculator</p>
          <div className="space-y-2.5">
            {[
              { label: 'ARIA Pro subscription', value: '€29/mo' },
              { label: 'Time saved', value: `${data?.timeSaved ?? 4.2}h/week` },
              { label: 'Value at €50/h', value: `€${Math.round((data?.timeSaved ?? 4.2) * 4 * 50)}/mo`, highlight: true },
            ].map((row, i) => (
              <div key={i} className="flex justify-between">
                <span className="text-[11.5px] text-[var(--text-2)]">{row.label}</span>
                <span className={cn('text-[11.5px] font-mono', row.highlight ? 'text-[var(--green)] font-medium' : 'text-white')}>{row.value}</span>
              </div>
            ))}
            <div className="border-t border-[#10b981]/12 pt-2.5 flex justify-between">
              <span className="text-[12px] text-white font-medium">Net gain</span>
              <span className="text-[14px] font-mono text-[var(--green)] font-semibold">€{Math.round((data?.timeSaved ?? 4.2) * 4 * 50 - 29)}/mo</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
