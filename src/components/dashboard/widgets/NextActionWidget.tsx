'use client'

import { useQuery } from '@tanstack/react-query'
import { Zap, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'

export function NextActionWidget() {
  const { data: statsData } = useQuery({
    queryKey: ['dashboard-stats'],
    staleTime: 30_000,
    queryFn: async () => {
      const [emailsRes, tasksRes] = await Promise.all([
        fetch('/api/emails?limit=10&filter=all'),
        fetch('/api/tasks?status=TODO'),
      ])
      const emails = await emailsRes.json()
      const tasks  = await tasksRes.json()
      return {
        critical:       emails.data?.filter((e: any) => e.analysis?.priority === 'CRITICAL').length ?? 0,
        criticalEmails: emails.data?.filter((e: any) => e.analysis?.priority === 'CRITICAL').slice(0, 1) ?? [],
        tasks:          tasks.data?.length ?? 0,
      }
    },
  })

  const { data: briefingData } = useQuery({
    queryKey: ['briefing', 'today'],
    queryFn: async () => {
      const res = await fetch('/api/ai/briefing')
      return res.json()
    },
    staleTime: 60_000 * 5,
  })

  const critical = statsData?.critical ?? 0

  return (
    <div className="card-premium p-5 relative overflow-hidden flex flex-col h-full">
      {/* Gradient ambient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at bottom right, rgba(124,58,237,0.10) 0%, transparent 65%)',
        }}
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-4 relative z-10">
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center"
          style={{
            background: 'rgba(255,106,61,0.14)',
            border: '1px solid rgba(255,106,61,0.26)',
            boxShadow: '0 0 8px rgba(255,106,61,0.18)',
          }}
        >
          <Zap size={12} style={{ color: 'var(--accent-orange, var(--accent))' }} strokeWidth={2.5} />
        </div>
        <span
          className="text-[9px] tracking-[2.5px] uppercase font-semibold"
          style={{ color: 'var(--accent-orange, var(--accent-text))' }}
        >
          Next Best Action
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 relative z-10">
        {briefingData?.data?.content ? (
          <p className="text-[12.5px] leading-[1.8] line-clamp-6" style={{ color: 'var(--text-1)' }}>
            {briefingData.data.content.replace(/<[^>]*>/g, '').slice(0, 200)}
          </p>
        ) : (
          <p className="text-[12.5px] leading-[1.8]" style={{ color: 'var(--text-2)' }}>
            {critical > 0
              ? `Reply to ${statsData?.criticalEmails?.[0]?.fromName || 'critical sender'} — marked high priority.`
              : 'Your inbox is under control. Review pending tasks or schedule tomorrow.'}
          </p>
        )}
      </div>

      {/* CTA */}
      <Link href={critical > 0 ? '/dashboard/inbox?filter=critical' : '/dashboard/tasks'}>
        <motion.div
          whileHover={{ x: 3 }}
          className="flex items-center gap-1.5 mt-4 relative z-10"
          style={{ cursor: 'pointer' }}
        >
          <span
            className="text-[11px] font-semibold"
            style={{
              background: 'linear-gradient(135deg, var(--accent-orange, #ff6a3d), var(--accent-purple, #7c3aed))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {critical > 0 ? 'View critical' : 'View tasks'}
          </span>
          <ArrowUpRight size={11} style={{ color: 'var(--accent-purple, #7c3aed)' }} />
        </motion.div>
      </Link>
    </div>
  )
}
