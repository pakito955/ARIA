'use client'

import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react'
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
      const tasks = await tasksRes.json()
      return {
        unread: emails.data?.filter((e: any) => !e.isRead).length ?? 0,
        total: emails.total ?? 0,
        critical: emails.data?.filter((e: any) => e.analysis?.priority === 'CRITICAL').length ?? 0,
        tasks: tasks.data?.length ?? 0,
        criticalEmails: emails.data?.filter((e: any) => e.analysis?.priority === 'CRITICAL').slice(0, 3) ?? [],
      }
    },
    staleTime: 30_000,
  })

  const critical = statsData?.critical ?? 0

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="card-premium shimmer-highlight p-5 relative overflow-hidden h-full"
    >
      <div
        className="absolute top-0 right-0 w-48 h-full pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at top right, rgba(239,68,68,0.05), transparent 70%)' }}
      />
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertCircle size={14} className="text-[var(--red)]" />
          <span className="text-[9px] tracking-[2px] uppercase text-[var(--red)]">Critical Now</span>
        </div>
        {critical > 0 && (
          <span className="text-[9px] text-[var(--red)] px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.12)' }}>
            {critical} item{critical > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {critical === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <CheckCircle2 size={28} className="text-[var(--green)] opacity-60" />
          <p className="text-[12px] text-[var(--text-3)]">No critical items · You're on top of things</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {(statsData?.criticalEmails ?? []).map((email: any, i: number) => (
            <motion.div
              key={email.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="flex items-center gap-3 p-3 rounded-lg cursor-pointer"
              style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)' }}
            >
              <div className="w-1 h-8 rounded-full shrink-0" style={{ background: 'var(--red)' }} />
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-medium text-[var(--text-1)] truncate">
                  {email.fromName || email.fromEmail?.split('@')[0]}
                </p>
                <p className="text-[11px] text-[var(--text-2)] truncate">
                  {email.analysis?.summary || email.subject}
                </p>
              </div>
              <Link href="/dashboard/inbox">
                <button className="px-2.5 py-1 rounded bg-[var(--accent)] text-white text-[10px] font-medium opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity">
                  Reply
                </button>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {/* Stats row */}
      <div className="flex items-center gap-5 mt-5 pt-4 border-t border-[var(--border)]">
        {[
          { n: statsData?.unread ?? 0, label: 'Unread', color: '#7C5CFF' },
          { n: statsData?.tasks ?? 0, label: 'Tasks', color: '#10b981' },
          { n: statsData?.critical ?? 0, label: 'Critical', color: '#ef4444' },
        ].map((s, i) => (
          <div key={i} className="text-center">
            <p className="font-outfit text-4xl font-light tabular-nums" style={{ color: s.color, textShadow: `0 0 20px ${s.color}40` }}>
              <AnimatedNumber value={s.n} duration={900} />
            </p>
            <p className="text-[9px] uppercase tracking-[1.5px] mt-0.5" style={{ color: 'var(--text-3)' }}>{s.label}</p>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
