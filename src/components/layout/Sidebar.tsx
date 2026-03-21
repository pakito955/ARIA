'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Inbox, CheckSquare, Clock, BarChart3, Calendar,
  Mail, Zap, ChevronLeft, Settings
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/lib/store'
import { useQuery } from '@tanstack/react-query'

const NAV_ITEMS = [
  { label: 'Daily Briefing', href: '/dashboard', icon: Zap, exact: true },
  { label: 'Inbox', href: '/dashboard/inbox', icon: Inbox, badgeKey: 'unread' },
  { label: 'Tasks', href: '/dashboard/tasks', icon: CheckSquare, badgeKey: 'tasks' },
  { label: 'Čekam odgovor', href: '/dashboard/waiting', icon: Clock, badgeKey: 'waiting' },
  { label: 'Analitika', href: '/dashboard/analytics', icon: BarChart3 },
]

export function Sidebar() {
  const pathname = usePathname()
  const { sidebarCollapsed, setSidebarCollapsed } = useAppStore()

  const { data: stats } = useQuery({
    queryKey: ['sidebar-stats'],
    queryFn: async () => {
      const res = await fetch('/api/stats')
      if (!res.ok) return null
      return res.json()
    },
    refetchInterval: 60_000,
  })

  return (
    <motion.nav
      animate={{ width: sidebarCollapsed ? 56 : 200 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="flex flex-col bg-[#0d0d1a] border-r border-white/[0.055] overflow-hidden"
    >
      {/* Integrations status */}
      {!sidebarCollapsed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="m-3 p-3 rounded bg-[#1a1a2e] border border-white/[0.055]"
        >
          <p className="text-[9px] tracking-[2px] uppercase text-[#e8c97a] mb-2">Connections</p>
          <div className="space-y-1.5">
            <StatusRow label="Gmail" connected={stats?.gmail ?? false} />
            <StatusRow label="Outlook" connected={stats?.outlook ?? false} />
            <StatusRow label="Calendar" connected={stats?.calendar ?? false} />
          </div>
        </motion.div>
      )}

      {/* Nav */}
      <div className="flex-1 pt-1">
        <p className={cn(
          'text-[8px] tracking-[2.5px] uppercase text-[#5a5a78] px-4 py-2',
          sidebarCollapsed && 'opacity-0'
        )}>
          Workspace
        </p>

        {NAV_ITEMS.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          const badge = item.badgeKey && stats?.[item.badgeKey]

          return (
            <Link key={item.href} href={item.href}>
              <div className={cn(
                'flex items-center gap-2.5 px-4 py-2 text-xs cursor-pointer',
                'border-l-2 transition-all duration-150',
                active
                  ? 'text-white border-l-[#e8c97a] bg-[#e8c97a]/[0.04]'
                  : 'text-[#8888aa] border-l-transparent hover:text-white hover:bg-white/[0.02]'
              )}>
                <item.icon size={14} className="shrink-0" />
                {!sidebarCollapsed && (
                  <span className="flex-1 truncate">{item.label}</span>
                )}
                {!sidebarCollapsed && badge > 0 && (
                  <span className={cn(
                    'text-[9px] px-1.5 py-0.5 rounded',
                    item.badgeKey === 'unread' || item.badgeKey === 'waiting'
                      ? 'bg-[#f4a0b5]/15 text-[#f4a0b5]'
                      : 'bg-[#4fd1c5]/12 text-[#4fd1c5]'
                  )}>
                    {badge}
                  </span>
                )}
              </div>
            </Link>
          )
        })}
      </div>

      {/* Bottom actions */}
      <div className="pb-3 border-t border-white/[0.055] pt-2">
        <Link href="/dashboard/settings">
          <div className="flex items-center gap-2.5 px-4 py-2 text-xs text-[#8888aa] hover:text-white transition-colors cursor-pointer">
            <Settings size={14} />
            {!sidebarCollapsed && <span>Settings</span>}
          </div>
        </Link>
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="flex items-center gap-2.5 px-4 py-2 text-xs text-[#5a5a78] hover:text-[#8888aa] transition-colors w-full"
        >
          <ChevronLeft size={14} className={cn('transition-transform', sidebarCollapsed && 'rotate-180')} />
          {!sidebarCollapsed && <span>Collapse</span>}
        </button>
      </div>
    </motion.nav>
  )
}

function StatusRow({ label, connected }: { label: string; connected: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn(
        'w-1.5 h-1.5 rounded-full shrink-0',
        connected ? 'bg-[#86efac]' : 'bg-[#5a5a78]'
      )} />
      <span className="text-[10px] text-[#8888aa]">{label}</span>
    </div>
  )
}
