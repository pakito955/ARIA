'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Inbox, CheckSquare, Clock, BarChart3, Zap,
  ChevronRight, Settings, LogOut, Command,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/lib/store'
import { useQuery } from '@tanstack/react-query'
import { useSession, signOut } from 'next-auth/react'
import { useEffect } from 'react'

const NAV_ITEMS = [
  { label: 'Command Center', href: '/dashboard', icon: Zap, exact: true, badgeKey: null },
  { label: 'Inbox', href: '/dashboard/inbox', icon: Inbox, badgeKey: 'unread' },
  { label: 'Tasks', href: '/dashboard/tasks', icon: CheckSquare, badgeKey: 'tasks' },
  { label: 'Waiting', href: '/dashboard/waiting', icon: Clock, badgeKey: 'waiting' },
  { label: 'Insights', href: '/dashboard/analytics', icon: BarChart3, badgeKey: null },
]

export function Sidebar() {
  const pathname = usePathname()
  const { sidebarCollapsed, setSidebarCollapsed, setCommandOpen } = useAppStore()
  const { data: session } = useSession()

  const { data: stats } = useQuery({
    queryKey: ['sidebar-stats'],
    queryFn: async () => {
      const res = await fetch('/api/stats')
      if (!res.ok) return null
      return res.json()
    },
    refetchInterval: 30_000,
  })

  // ⌘K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setCommandOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setCommandOpen])

  const initials = session?.user?.name
    ? session.user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  const criticalCount = stats?.critical ?? 0

  return (
    <motion.nav
      animate={{ width: sidebarCollapsed ? 64 : 220 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="flex flex-col bg-[#0a0a18] border-r border-white/[0.055] overflow-hidden shrink-0 z-40"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-white/[0.04]">
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] flex items-center justify-center shrink-0 glow-violet">
          <Zap size={13} className="text-white" />
        </div>
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.span
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="font-outfit text-lg font-semibold tracking-[0.15em] text-white"
            >
              ARIA
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <div className="flex-1 py-3 space-y-0.5 px-2">
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-[8px] tracking-[2.5px] uppercase text-[#4a4a6a] px-2 py-2 mb-1"
            >
              Workspace
            </motion.p>
          )}
        </AnimatePresence>

        {NAV_ITEMS.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          const badge = item.badgeKey ? (stats?.[item.badgeKey] ?? 0) : 0
          const isCritical = item.badgeKey === 'unread' && criticalCount > 0

          return (
            <Link key={item.href} href={item.href}>
              <div
                title={sidebarCollapsed ? item.label : undefined}
                className={cn(
                  'relative flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer',
                  'transition-all duration-150 group',
                  active
                    ? 'nav-active text-white'
                    : 'text-[#8888aa] hover:text-white hover:bg-white/[0.03]'
                )}
              >
                {/* Active left bar */}
                {active && (
                  <motion.div
                    layoutId="nav-active-bar"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-6 bg-[#8b5cf6] rounded-r"
                    style={{ boxShadow: '0 0 8px rgba(139,92,246,0.6)' }}
                  />
                )}

                <div className="relative shrink-0">
                  <item.icon size={16} className={cn('transition-colors', active && 'text-[#a78bfa]')} />
                  {/* Status dot */}
                  {badge > 0 && sidebarCollapsed && (
                    <span
                      className={cn(
                        'absolute -top-1 -right-1 w-2 h-2 rounded-full',
                        isCritical ? 'bg-[#ef4444] pulse-critical' : 'bg-[#f59e0b] pulse-amber'
                      )}
                    />
                  )}
                </div>

                <AnimatePresence>
                  {!sidebarCollapsed && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center justify-between flex-1 min-w-0"
                    >
                      <span className="text-[12.5px] truncate">{item.label}</span>
                      {badge > 0 && (
                        <span className={cn(
                          'text-[9px] px-1.5 py-0.5 rounded-full font-mono font-medium ml-1',
                          isCritical
                            ? 'bg-[#ef4444]/15 text-[#ef4444]'
                            : item.badgeKey === 'tasks'
                            ? 'bg-[#10b981]/12 text-[#10b981]'
                            : 'bg-[#f59e0b]/12 text-[#f59e0b]'
                        )}>
                          {badge}
                        </span>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Bottom: Command + Settings + User */}
      <div className="border-t border-white/[0.04] px-2 py-3 space-y-1">
        {/* ⌘K hint */}
        <button
          onClick={() => setCommandOpen(true)}
          title={sidebarCollapsed ? '⌘K' : undefined}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-[#4a4a6a] hover:text-[#8888aa] hover:bg-white/[0.03] transition-all group"
        >
          <Command size={15} className="shrink-0" />
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-between flex-1"
              >
                <span className="text-[12px]">Quick actions</span>
                <kbd className="text-[8px] bg-white/[0.05] px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
              </motion.div>
            )}
          </AnimatePresence>
        </button>

        {/* Settings */}
        <Link href="/dashboard/settings">
          <div
            title={sidebarCollapsed ? 'Settings' : undefined}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-[#4a4a6a] hover:text-[#8888aa] hover:bg-white/[0.03] transition-all cursor-pointer"
          >
            <Settings size={15} className="shrink-0" />
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-[12px]"
                >
                  Settings
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </Link>

        {/* User */}
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg group cursor-pointer hover:bg-white/[0.03] transition-all">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#8b5cf6] to-[#f59e0b] flex items-center justify-center text-[9px] font-bold text-white shrink-0">
            {initials}
          </div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-between flex-1 min-w-0"
              >
                <div className="min-w-0">
                  <p className="text-[11px] text-white truncate">{session?.user?.name?.split(' ')[0] || 'User'}</p>
                  <p className="text-[9px] text-[#4a4a6a] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                    AI active
                  </p>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-[#4a4a6a] hover:text-[#ef4444] p-1"
                  title="Sign out"
                >
                  <LogOut size={12} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="flex items-center gap-3 w-full px-3 py-1.5 rounded-lg text-[#4a4a6a] hover:text-[#8888aa] transition-all"
        >
          <ChevronRight
            size={14}
            className={cn('shrink-0 transition-transform duration-200', !sidebarCollapsed && 'rotate-180')}
          />
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-[11px]"
              >
                Collapse
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.nav>
  )
}
