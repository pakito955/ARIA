'use client'

import { useQuery } from '@tanstack/react-query'
import { Zap } from 'lucide-react'
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
      const tasks = await tasksRes.json()
      return {
        critical: emails.data?.filter((e: any) => e.analysis?.priority === 'CRITICAL').length ?? 0,
        criticalEmails: emails.data?.filter((e: any) => e.analysis?.priority === 'CRITICAL').slice(0, 1) ?? [],
        tasks: tasks.data?.length ?? 0,
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
      <div
        className="absolute bottom-0 right-0 w-32 h-32 pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(124,92,255,0.08), transparent 70%)' }}
      />
      <div className="flex items-center gap-2 mb-4">
        <Zap size={13} className="text-[var(--accent-text)]" />
        <span className="text-[9px] tracking-[2px] uppercase text-[var(--accent-text)]">Next Best Action</span>
      </div>

      <div className="flex-1">
        {briefingData?.data?.content ? (
          <p className="text-[12px] text-[var(--text-1)] leading-relaxed line-clamp-6">
            {briefingData.data.content.replace(/<[^>]*>/g, '').slice(0, 200)}
          </p>
        ) : (
          <p className="text-[12px] text-[var(--text-2)] leading-relaxed">
            {critical > 0
              ? `Reply to ${statsData?.criticalEmails?.[0]?.fromName || 'critical sender'} — marked high priority.`
              : 'Your inbox is under control. Review pending tasks or schedule tomorrow.'}
          </p>
        )}
      </div>

      <Link href={critical > 0 ? '/dashboard/inbox?filter=critical' : '/dashboard/tasks'}>
        <motion.button
          whileHover={{ x: 3 }}
          className="flex items-center gap-1.5 text-[11px] text-[var(--accent-text)] mt-4"
        >
          Open →
        </motion.button>
      </Link>
    </div>
  )
}
