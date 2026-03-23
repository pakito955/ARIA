'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Sparkles, TrendingUp, TrendingDown, Minus, Award, AlertTriangle, Lightbulb, BarChart3, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type InsightType = 'warning' | 'tip' | 'achievement' | 'pattern'

interface Insight {
  type: InsightType
  title: string
  body: string
  metric?: string
  action?: string
}

interface InsightsData {
  summary: string
  score: number
  insights: Insight[]
  topWin: string
  topOpportunity: string
  weekOverWeekTrend: 'improving' | 'stable' | 'declining'
  meta: {
    emailsThisWeek: number
    emailsLastWeek: number
    criticalEmails: number
    unreadEmails: number
    tasksDone: number
    tasksPending: number
    timeSavedHours: number
    aiActions: number
    categories: { label: string; value: number }[]
    topSenders: { email: string; name?: string; count: number }[]
  }
}

const INSIGHT_CONFIG: Record<InsightType, { icon: typeof TrendingUp; color: string; bg: string }> = {
  achievement: { icon: Award,         color: 'var(--green)',  bg: 'var(--green-subtle)'  },
  warning:     { icon: AlertTriangle,  color: 'var(--red)',    bg: 'var(--red-subtle)'    },
  tip:         { icon: Lightbulb,      color: 'var(--amber)',  bg: 'var(--amber-subtle)'  },
  pattern:     { icon: BarChart3,      color: 'var(--blue)',   bg: 'var(--blue-subtle)'   },
}

function ScoreRing({ score }: { score: number }) {
  const r = 40
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = score >= 70 ? 'var(--green)' : score >= 40 ? 'var(--amber)' : 'var(--red)'
  return (
    <svg width="104" height="104" className="rotate-[-90deg]">
      <circle cx="52" cy="52" r={r} fill="none" stroke="var(--bg-hover)" strokeWidth="8" />
      <circle
        cx="52" cy="52" r={r} fill="none"
        stroke={color} strokeWidth="8"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1.2s ease' }}
      />
    </svg>
  )
}

export default function InsightsPage() {
  const { data, isLoading, error } = useQuery<InsightsData>({
    queryKey: ['ai-insights'],
    queryFn: async () => {
      const res = await fetch('/api/insights')
      if (!res.ok) throw new Error('Failed to load insights')
      return res.json()
    },
    staleTime: 10 * 60_000,
  })

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-5 border-b border-[var(--border)]">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] pulse-violet" />
          <span className="text-[9px] tracking-[2.5px] uppercase text-[var(--accent-text)]">ARIA · Intelligence</span>
        </div>
        <h1 className="font-outfit text-3xl font-light tracking-tight" style={{ color: 'var(--text-1)' }}>AI Insights</h1>
        <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-3)' }}>Personalized productivity analysis · Updated in real-time</p>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="relative">
              <Loader2 size={32} className="animate-spin" style={{ color: 'var(--accent-text)' }} />
              <div className="absolute inset-0 rounded-full blur-lg" style={{ background: 'var(--accent-subtle)' }} />
            </div>
            <div className="text-center">
              <p className="text-[13px] font-medium" style={{ color: 'var(--text-1)' }}>ARIA is analyzing your productivity…</p>
              <p className="text-[11px] mt-1" style={{ color: 'var(--text-3)' }}>Examining email patterns, tasks, and behavior</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center py-12">
            <p className="text-[13px]" style={{ color: 'var(--text-3)' }}>Could not load insights. Connect Gmail to get started.</p>
          </div>
        )}

        {data && (
          <>
            {/* Hero: Score + Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Score ring */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center p-6 rounded-2xl"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
              >
                <p className="text-[9px] tracking-[2px] uppercase mb-3" style={{ color: 'var(--text-3)' }}>Productivity Score</p>
                <div className="relative flex items-center justify-center">
                  <ScoreRing score={data.score} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-outfit text-4xl font-light" style={{ color: 'var(--text-1)' }}>{data.score}</span>
                    <span className="text-[9px]" style={{ color: 'var(--text-3)' }}>/ 100</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-3">
                  {data.weekOverWeekTrend === 'improving' && <TrendingUp size={12} style={{ color: 'var(--green)' }} />}
                  {data.weekOverWeekTrend === 'declining' && <TrendingDown size={12} style={{ color: 'var(--red)' }} />}
                  {data.weekOverWeekTrend === 'stable' && <Minus size={12} style={{ color: 'var(--amber)' }} />}
                  <span className="text-[11px] capitalize" style={{
                    color: data.weekOverWeekTrend === 'improving' ? 'var(--green)'
                      : data.weekOverWeekTrend === 'declining' ? 'var(--red)'
                      : 'var(--amber)'
                  }}>
                    {data.weekOverWeekTrend} vs last week
                  </span>
                </div>
              </motion.div>

              {/* Summary + wins */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="md:col-span-2 p-6 rounded-2xl space-y-4"
                style={{ background: 'linear-gradient(135deg, rgba(124,92,255,0.08), var(--bg-card))', border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)' }}
              >
                <div className="flex items-start gap-2">
                  <Sparkles size={14} style={{ color: 'var(--accent-text)', marginTop: 2, flexShrink: 0 }} />
                  <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-2)' }}>{data.summary}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl" style={{ background: 'var(--green-subtle)', border: '1px solid color-mix(in srgb, var(--green) 20%, transparent)' }}>
                    <p className="text-[9px] uppercase tracking-[1.5px] mb-1" style={{ color: 'var(--green)' }}>Top Win</p>
                    <p className="text-[11.5px]" style={{ color: 'var(--text-1)' }}>{data.topWin}</p>
                  </div>
                  <div className="p-3 rounded-xl" style={{ background: 'var(--amber-subtle)', border: '1px solid color-mix(in srgb, var(--amber) 20%, transparent)' }}>
                    <p className="text-[9px] uppercase tracking-[1.5px] mb-1" style={{ color: 'var(--amber)' }}>Top Opportunity</p>
                    <p className="text-[11.5px]" style={{ color: 'var(--text-1)' }}>{data.topOpportunity}</p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Quick stats */}
            {data.meta && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Emails this week', value: data.meta.emailsThisWeek, change: data.meta.emailsThisWeek - data.meta.emailsLastWeek },
                  { label: 'Hours saved', value: `${data.meta.timeSavedHours}h`, change: null },
                  { label: 'Tasks done', value: data.meta.tasksDone, change: null },
                  { label: 'AI actions', value: data.meta.aiActions, change: null },
                ].map((stat, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + i * 0.05 }}
                    className="p-4 rounded-xl text-center"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                  >
                    <p className="font-outfit text-3xl font-light" style={{ color: 'var(--text-1)' }}>{stat.value}</p>
                    <p className="text-[10px] mt-1" style={{ color: 'var(--text-3)' }}>{stat.label}</p>
                    {stat.change !== null && stat.change !== 0 && (
                      <p className="text-[9px] mt-0.5" style={{ color: stat.change > 0 ? 'var(--red)' : 'var(--green)' }}>
                        {stat.change > 0 ? '+' : ''}{stat.change} vs last week
                      </p>
                    )}
                  </motion.div>
                ))}
              </div>
            )}

            {/* AI Insights grid */}
            {data.insights.length > 0 && (
              <div>
                <p className="text-[9px] uppercase tracking-[2px] mb-3" style={{ color: 'var(--text-3)' }}>
                  Personalized Insights · {data.insights.length} findings
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {data.insights.map((insight, i) => {
                    const config = INSIGHT_CONFIG[insight.type] || INSIGHT_CONFIG.tip
                    const Icon = config.icon
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + i * 0.06 }}
                        className="p-4 rounded-xl space-y-2"
                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: config.bg }}>
                            <Icon size={13} style={{ color: config.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-semibold" style={{ color: 'var(--text-1)' }}>{insight.title}</p>
                            {insight.metric && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded mt-0.5 inline-block" style={{ background: config.bg, color: config.color }}>
                                {insight.metric}
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-[11.5px] pl-10 leading-relaxed" style={{ color: 'var(--text-2)' }}>{insight.body}</p>
                        {insight.action && (
                          <p className="text-[10px] pl-10 font-medium" style={{ color: config.color }}>
                            → {insight.action}
                          </p>
                        )}
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Category breakdown */}
            {data.meta?.categories?.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <p className="text-[9px] uppercase tracking-[2px] mb-4" style={{ color: 'var(--text-3)' }}>Email Categories This Week</p>
                <div className="space-y-3">
                  {data.meta.categories.map((c) => (
                    <div key={c.label}>
                      <div className="flex justify-between text-[11px] mb-1.5">
                        <span style={{ color: 'var(--text-2)' }}>{c.label}</span>
                        <span className="font-mono" style={{ color: 'var(--text-1)' }}>{c.value}%</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-hover)' }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${c.value}%` }}
                          transition={{ duration: 0.7, ease: 'easeOut', delay: 0.4 }}
                          className="h-full rounded-full bg-[var(--accent)]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
