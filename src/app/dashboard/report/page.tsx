'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Download, TrendingUp, Mail, Zap, CheckCircle } from 'lucide-react'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { ReportSkeleton } from '@/components/ui/Skeletons'

export default function WeeklyReportPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['report-weekly'],
    queryFn: async () => {
      const res = await fetch('/api/report/weekly')
      return res.json()
    },
  })

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-6 py-5 border-b border-[var(--border)] flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-2.5 w-24 skeleton rounded-full" />
            <div className="h-7 w-56 skeleton rounded-lg" />
            <div className="h-2 w-32 skeleton rounded-full" />
          </div>
          <div className="w-28 h-8 skeleton rounded-xl" />
        </div>
        <div className="flex-1 overflow-y-auto">
          <ReportSkeleton />
        </div>
      </div>
    )
  }

  const { period, stats, tasks, topSenders } = data || {}

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-5 border-b border-[var(--border)] flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
            <span className="text-[9px] tracking-[2.5px] uppercase text-[var(--accent-text)]">ARIA · Report</span>
          </div>
          <h1 className="font-outfit text-3xl font-light">Weekly Intelligence Report</h1>
          {period && (
            <p className="text-[11px] text-[var(--text-3)] mt-0.5">{period.start} – {period.end}</p>
          )}
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-medium text-white transition-all"
          style={{ background: 'var(--accent)' }}
        >
          <Download size={13} />
          Export PDF
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 print:overflow-visible print:h-auto">
        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: 'Emails handled', value: stats?.totalEmails ?? 0, icon: Mail, color: '#7C5CFF', suffix: '' },
            { label: 'Critical emails', value: stats?.criticalEmails ?? 0, icon: TrendingUp, color: '#ef4444', suffix: '' },
            { label: 'AI analyses', value: stats?.analyses ?? 0, icon: Zap, color: '#4fd1c5', suffix: '' },
            { label: 'Tasks created', value: stats?.tasksCreated ?? 0, icon: CheckCircle, color: '#f59e0b', suffix: '' },
            { label: 'Tasks completed', value: stats?.tasksCompleted ?? 0, icon: CheckCircle, color: '#10b981', suffix: '' },
            { label: 'Hours saved', value: stats?.timeSaved ?? 0, icon: TrendingUp, color: '#10b981', suffix: 'h' },
          ].map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="p-4 rounded-2xl"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center mb-3"
                style={{ background: `${s.color}14` }}
              >
                <s.icon size={14} style={{ color: s.color }} />
              </div>
              <p className="text-[28px] font-outfit font-light" style={{ color: s.color }}>
                <AnimatedNumber value={s.value} suffix={s.suffix} />
              </p>
              <p className="text-[11px] text-[var(--text-3)] mt-0.5">{s.label}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top senders */}
          {topSenders?.length > 0 && (
            <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <p className="text-[8px] tracking-[2px] uppercase text-[var(--text-3)] mb-4">Top Senders this week</p>
              <div className="space-y-3">
                {topSenders.map((s: any, i: number) => {
                  const max = topSenders[0].count
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between text-[11px] mb-1.5">
                        <span className="text-[var(--text-2)] truncate max-w-[180px]">{s.name || s.email}</span>
                        <span className="text-white font-mono shrink-0">{s.count}</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-hover)' }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(s.count / max) * 100}%` }}
                          transition={{ duration: 0.7, ease: 'easeOut', delay: 0.2 + i * 0.08 }}
                          className="h-full rounded-full"
                          style={{ background: 'var(--accent)' }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Tasks this week */}
          {tasks?.length > 0 && (
            <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <p className="text-[8px] tracking-[2px] uppercase text-[var(--text-3)] mb-4">Tasks this week</p>
              <div className="space-y-2">
                {tasks.slice(0, 8).map((t: any, i: number) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <div
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: t.status === 'DONE' ? 'var(--green)' : 'var(--text-3)' }}
                    />
                    <span
                      className="text-[11.5px] truncate"
                      style={{
                        color: t.status === 'DONE' ? 'var(--text-3)' : 'var(--text-2)',
                        textDecoration: t.status === 'DONE' ? 'line-through' : 'none',
                      }}
                    >
                      {t.title}
                    </span>
                    <span
                      className="ml-auto text-[9px] shrink-0 px-1.5 py-0.5 rounded-full"
                      style={{
                        background: ({'CRITICAL': 'color-mix(in srgb, var(--red) 12%, transparent)', 'HIGH': 'color-mix(in srgb, var(--amber) 12%, transparent)', 'MEDIUM': 'var(--accent-subtle)', 'LOW': 'var(--bg-hover)' } as Record<string,string>)[t.priority] || 'var(--bg-hover)',
                        color: ({'CRITICAL': 'var(--red)', 'HIGH': 'var(--amber)', 'MEDIUM': 'var(--accent-text)', 'LOW': 'var(--text-3)' } as Record<string,string>)[t.priority] || 'var(--text-3)',
                      }}
                    >
                      {t.priority}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ROI */}
        <div
          className="rounded-2xl p-5"
          style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.06), rgba(10,10,22,0.95))', border: '1px solid rgba(16,185,129,0.2)' }}
        >
          <p className="text-[8px] tracking-[2.5px] uppercase text-[var(--green)] mb-3">Weekly ROI Estimate</p>
          <p className="font-outfit text-4xl font-light text-white mb-1">
            €<AnimatedNumber value={Math.round((stats?.timeSaved ?? 0) * 50)} duration={1500} />
          </p>
          <p className="text-[11px] text-[var(--text-3)]">value generated at €50/h · {stats?.timeSaved ?? 0}h saved this week</p>
        </div>
      </div>

      <style>{`
        @media print {
          nav, [class*="sidebar"], button { display: none !important; }
          body { background: white !important; color: black !important; }
        }
      `}</style>
    </div>
  )
}
