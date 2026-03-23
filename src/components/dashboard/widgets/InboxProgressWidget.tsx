'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { CheckCircle2, Inbox } from 'lucide-react'
import Link from 'next/link'

export function InboxProgressWidget() {
  const { data } = useQuery({
    queryKey: ['inbox-progress'],
    queryFn: async () => {
      const res = await fetch('/api/emails?limit=1&filter=unread')
      if (!res.ok) return { unread: 0, total: 0 }
      const json = await res.json()
      const unread = json.total ?? 0

      const allRes = await fetch('/api/emails?limit=1&filter=all')
      const allJson = await allRes.json()
      const total = allJson.total ?? 0

      return { unread, total }
    },
    staleTime: 30_000,
  })

  const unread = data?.unread ?? 0
  const total = data?.total ?? 0
  const read = Math.max(0, total - unread)
  const pct = total > 0 ? Math.round((read / total) * 100) : 100
  const atZero = unread === 0

  return (
    <div className="card-premium p-5 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <Inbox size={13} style={{ color: atZero ? 'var(--green)' : 'var(--accent-text)' }} />
        <span
          className="text-[9px] tracking-[2px] uppercase"
          style={{ color: atZero ? 'var(--green)' : 'var(--accent-text)' }}
        >
          Inbox Zero
        </span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        {atZero ? (
          <>
            <div className="relative">
              <div
                className="absolute inset-0 rounded-full blur-[20px] opacity-40"
                style={{ background: 'var(--green)' }}
              />
              <CheckCircle2 size={40} className="relative text-[var(--green)]" />
            </div>
            <div className="text-center">
              <p className="text-[13px] font-medium text-white">Inbox Zero!</p>
              <p className="text-[10px] text-[var(--text-3)] mt-0.5">You did it 🎉</p>
            </div>
          </>
        ) : (
          <>
            <div className="relative w-24 h-24">
              <svg width="96" height="96" className="rotate-[-90deg]">
                <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                <motion.circle
                  cx="48" cy="48" r="40" fill="none"
                  stroke="var(--accent)" strokeWidth="8"
                  strokeLinecap="round"
                  initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
                  animate={{
                    strokeDasharray: `${2 * Math.PI * 40}`,
                    strokeDashoffset: 2 * Math.PI * 40 * (1 - pct / 100),
                  }}
                  transition={{ duration: 1, ease: 'backOut' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-outfit text-2xl font-light text-white">{pct}%</span>
              </div>
            </div>

            <div className="text-center">
              <p className="text-[13px] font-medium text-white">{unread} unread</p>
              <p className="text-[10px] text-[var(--text-3)] mt-0.5">{total} total emails</p>
            </div>
          </>
        )}
      </div>

      <Link href="/dashboard/inbox?filter=unread" className="mt-3 pt-3 border-t border-[var(--border)] block">
        <span className="text-[10px] text-[var(--text-3)] hover:text-[var(--accent-text)] transition-colors">
          {atZero ? 'View all emails →' : `Clear ${unread} unread →`}
        </span>
      </Link>
    </div>
  )
}
