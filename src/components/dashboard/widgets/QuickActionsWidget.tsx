'use client'

import { Sparkles, Inbox, FileText, Bell, MailX, BarChart3 } from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useAppStore } from '@/lib/store'

const ACTIONS = [
  { label: 'AI Compose', icon: Sparkles, color: '#7C5CFF', action: 'compose', href: null },
  { label: 'Triage', icon: Inbox, color: '#f59e0b', action: null, href: '/dashboard/inbox' },
  { label: 'Templates', icon: FileText, color: '#10b981', action: null, href: '/dashboard/templates' },
  { label: 'Follow-ups', icon: Bell, color: '#ef4444', action: null, href: '/dashboard/followups' },
  { label: 'Unsubscribe', icon: MailX, color: '#6b7280', action: null, href: '/dashboard/unsubscribe' },
  { label: 'Insights', icon: BarChart3, color: '#3b82f6', action: null, href: '/dashboard/analytics' },
]

export function QuickActionsWidget() {
  const { setComposeOpen } = useAppStore()

  return (
    <div className="card-premium p-5 h-full">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={13} className="text-[var(--accent-text)]" />
        <span className="text-[9px] tracking-[2px] uppercase text-[var(--accent-text)]">Quick Actions</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {ACTIONS.map((action, i) => {
          const Icon = action.icon
          const inner = (
            <motion.div
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97 }}
              className="flex flex-col items-center gap-2 p-3 rounded-xl cursor-pointer transition-all"
              style={{
                background: `color-mix(in srgb, ${action.color} 8%, var(--bg-surface))`,
                border: `1px solid color-mix(in srgb, ${action.color} 20%, var(--border))`,
              }}
              onClick={action.action === 'compose' ? () => setComposeOpen(true) : undefined}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{
                  background: `color-mix(in srgb, ${action.color} 15%, transparent)`,
                }}
              >
                <Icon size={13} style={{ color: action.color }} />
              </div>
              <span className="text-[10px] text-[var(--text-2)] text-center leading-tight">{action.label}</span>
            </motion.div>
          )

          if (action.href) {
            return (
              <Link key={i} href={action.href}>
                {inner}
              </Link>
            )
          }
          return <div key={i}>{inner}</div>
        })}
      </div>
    </div>
  )
}
