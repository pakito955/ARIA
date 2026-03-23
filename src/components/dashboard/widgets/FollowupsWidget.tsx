'use client'

import { useQuery } from '@tanstack/react-query'
import { Bell, CheckCircle2, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export function FollowupsWidget() {
  const { data: followupData } = useQuery({
    queryKey: ['dashboard-followups'],
    queryFn: async () => {
      const res = await fetch('/api/followup')
      if (!res.ok) return null
      return res.json()
    },
    staleTime: 30_000,
  })

  return (
    <div className="card-premium p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell size={13} className="text-[var(--amber)]" />
          <span className="text-[9px] tracking-[2px] uppercase text-[var(--amber)]">Follow-ups</span>
        </div>
        {(followupData?.total ?? 0) > 0 && (
          <span
            className="text-[9px] px-2 py-0.5 rounded-full font-medium"
            style={{ background: 'rgba(245,158,11,0.12)', color: 'var(--amber)' }}
          >
            {followupData.total} pending
          </span>
        )}
      </div>

      <div className="flex-1">
        {!followupData || followupData.total === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 py-4">
            <CheckCircle2 size={22} className="text-[var(--green)] opacity-60" />
            <p className="text-[11px] text-[var(--text-3)] text-center">All followed up!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {(followupData.overdue ?? []).slice(0, 2).map((r: any) => (
              <div
                key={r.id}
                className="flex items-start gap-2 p-2.5 rounded-lg"
                style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}
              >
                <div className="w-1 min-h-[28px] rounded-full shrink-0" style={{ background: 'var(--red)' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[11.5px] font-medium text-white truncate">{r.email?.subject || 'Email'}</p>
                  <p className="text-[10px] text-[var(--red)]">Overdue</p>
                </div>
              </div>
            ))}
            {(followupData.upcoming ?? []).slice(0, Math.max(0, 2 - (followupData.overdue?.length ?? 0))).map((r: any) => (
              <div
                key={r.id}
                className="flex items-start gap-2 p-2.5 rounded-lg"
                style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)' }}
              >
                <div className="w-1 min-h-[28px] rounded-full shrink-0" style={{ background: 'var(--amber)' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[11.5px] font-medium text-white truncate">{r.email?.subject || 'Email'}</p>
                  <p className="text-[10px] text-[var(--amber)]">Upcoming</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Link href="/dashboard/followups" className="block mt-3 pt-3 border-t border-[var(--border)]">
        <span className="text-[10px] text-[var(--text-3)] hover:text-[var(--amber)] transition-colors flex items-center gap-1">
          View all <ArrowRight size={9} />
        </span>
      </Link>
    </div>
  )
}
