'use client'

import { useQuery } from '@tanstack/react-query'
import { Users } from 'lucide-react'

function Avatar({ email, name }: { email: string; name?: string }) {
  const initials = (name || email).slice(0, 2).toUpperCase()
  const hue = email.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold text-white shrink-0"
      style={{ background: `hsl(${hue},55%,40%)` }}
    >
      {initials}
    </div>
  )
}

export function TopSendersWidget() {
  const { data } = useQuery({
    queryKey: ['top-senders'],
    queryFn: async () => {
      const res = await fetch('/api/emails?limit=50&filter=all')
      if (!res.ok) return []
      const json = await res.json()
      const emails = json.data ?? []

      // Count by sender
      const counts: Record<string, { name: string; email: string; count: number }> = {}
      for (const em of emails) {
        const key = em.fromEmail
        if (!counts[key]) counts[key] = { name: em.fromName || em.fromEmail, email: em.fromEmail, count: 0 }
        counts[key].count++
      }

      return Object.values(counts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
    },
    staleTime: 60_000,
  })

  const senders = data ?? []
  const maxCount = Math.max(...senders.map((s) => s.count), 1)

  return (
    <div className="card-premium p-5 h-full">
      <div className="flex items-center gap-2 mb-4">
        <Users size={13} className="text-[#3b82f6]" />
        <span className="text-[9px] tracking-[2px] uppercase" style={{ color: '#3b82f6' }}>Top Senders</span>
      </div>

      {senders.length === 0 ? (
        <div className="flex items-center justify-center h-24">
          <p className="text-[11px] text-[var(--text-3)]">No emails yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {senders.map((s, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <Avatar email={s.email} name={s.name} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[11.5px] font-medium text-white truncate">{s.name}</p>
                  <span className="text-[10px] text-[var(--text-3)] shrink-0 ml-2">{s.count}</span>
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-hover)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(s.count / maxCount) * 100}%`,
                      background: `hsl(${s.email.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360},55%,50%)`,
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
