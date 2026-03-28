'use client'

import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'

export function CriticalNowWidget() {
  const { data: statsData } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [emailsRes, tasksRes] = await Promise.all([
        fetch('/api/emails?limit=10&filter=all'),
        fetch('/api/tasks?status=TODO'),
      ])
      const emails = await emailsRes.json()
      const tasks  = await tasksRes.json()
      return {
        unread:         emails.data?.filter((e: any) => !e.isRead).length ?? 0,
        total:          emails.total ?? 0,
        critical:       emails.data?.filter((e: any) => e.analysis?.priority === 'CRITICAL').length ?? 0,
        tasks:          tasks.data?.length ?? 0,
        criticalEmails: emails.data?.filter((e: any) => e.analysis?.priority === 'CRITICAL').slice(0, 3) ?? [],
      }
    },
    staleTime: 30_000,
  })

  const critical = statsData?.critical ?? 0

  return (
    <div className="card-premium p-5 relative overflow-hidden h-full">
      {/* Gradient ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: critical > 0
            ? 'radial-gradient(ellipse at top right, rgba(255,107,107,0.08) 0%, transparent 60%)'
            : 'radial-gradient(ellipse at top right, rgba(81,207,102,0.06) 0%, transparent 60%)',
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{
              background: critical > 0 ? 'rgba(255,107,107,0.15)' : 'rgba(81,207,102,0.12)',
              border: critical > 0 ? '1px solid rgba(255,107,107,0.28)' : '1px solid rgba(81,207,102,0.22)',
            }}
          >
            {critical > 0
              ? <AlertTriangle size={12} style={{ color: 'var(--red)' }} />
              : <CheckCircle2 size={12} style={{ color: 'var(--green)' }} />
            }
          </div>
          <span
            className="text-[9px] tracking-[2.5px] uppercase font-semibold"
            style={{ color: critical > 0 ? 'var(--red)' : 'var(--green)' }}
          >
            Critical Now
          </span>
        </div>
        {critical > 0 && (
          <span
            className="text-[10px] px-2.5 py-1 rounded-full font-bold"
            style={{
              background: 'rgba(255,107,107,0.12)',
              color: 'var(--red)',
              border: '1px solid rgba(255,107,107,0.25)',
              boxShadow: '0 0 10px rgba(255,107,107,0.15)',
            }}
          >
            {critical} item{critical > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="relative z-10">
        {critical === 0 ? (
          <div
            className="flex items-center gap-3 p-3 rounded-2xl"
            style={{
              background: 'rgba(81,207,102,0.07)',
              border: '1px solid rgba(81,207,102,0.18)',
            }}
          >
            <CheckCircle2 size={16} style={{ color: 'var(--green)' }} />
            <p className="text-[12px] font-medium" style={{ color: 'var(--text-1)' }}>
              All clear — you're on top of things
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {(statsData?.criticalEmails ?? []).map((email: any, i: number) => (
              <Link href="/dashboard/inbox" key={email.id}>
                <div
                  className="flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all duration-150"
                  style={{
                    background: 'rgba(255,107,107,0.05)',
                    border: '1px solid rgba(255,107,107,0.14)',
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLElement
                    el.style.background = 'rgba(255,107,107,0.09)'
                    el.style.borderColor = 'rgba(255,107,107,0.25)'
                    el.style.boxShadow = '0 0 12px rgba(255,107,107,0.12)'
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLElement
                    el.style.background = 'rgba(255,107,107,0.05)'
                    el.style.borderColor = 'rgba(255,107,107,0.14)'
                    el.style.boxShadow = ''
                  }}
                >
                  {/* Priority bar */}
                  <div
                    className="w-1 h-9 rounded-full shrink-0"
                    style={{
                      background: 'linear-gradient(180deg, #ff6b6b, #ff4444)',
                      boxShadow: '0 0 6px rgba(255,107,107,0.50)',
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold truncate" style={{ color: 'var(--text-1)' }}>
                      {email.fromName || email.fromEmail?.split('@')[0]}
                    </p>
                    <p className="text-[11px] truncate" style={{ color: 'var(--text-2)' }}>
                      {email.analysis?.summary || email.subject}
                    </p>
                  </div>
                  <ArrowRight size={13} style={{ color: 'var(--red)', opacity: 0.7 }} className="shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Stats row */}
      <div
        className="flex items-center gap-5 mt-4 pt-4 relative z-10"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        {[
          { n: statsData?.unread   ?? 0, label: 'Unread',   color: 'var(--accent-purple, #7c3aed)', glow: 'rgba(124,58,237,0.35)' },
          { n: statsData?.tasks    ?? 0, label: 'Tasks',    color: '#10b981',                         glow: 'rgba(16,185,129,0.30)' },
          { n: statsData?.critical ?? 0, label: 'Critical', color: 'var(--red)',                      glow: 'rgba(255,107,107,0.35)' },
        ].map((s, i) => (
          <div key={i} className="text-center">
            <p
              className="font-inter text-3xl font-bold tabular-nums leading-none"
              style={{ color: s.color, textShadow: `0 0 20px ${s.glow}` }}
            >
              <AnimatedNumber value={s.n} duration={900} />
            </p>
            <p className="text-[9px] uppercase tracking-[1.5px] mt-1 font-medium" style={{ color: 'var(--text-3)' }}>
              {s.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
