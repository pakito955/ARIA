'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Inbox, CheckSquare, BarChart3, Zap,
  ChevronLeft, Settings, LogOut, Command, CalendarDays,
  FileText, MailX, Layout, Filter,
  Send, AlarmClock, LayoutDashboard, BookOpen, Sparkles,
  Newspaper, ClipboardList,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/lib/store'
import { useQuery } from '@tanstack/react-query'
import { useSession, signOut } from 'next-auth/react'
import { useEffect } from 'react'
import { NotificationBell } from '@/components/notifications/NotificationBell'

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard',  href: '/dashboard',             icon: LayoutDashboard, badge: null, exact: true },
    ],
  },
  {
    label: 'Mail',
    items: [
      { label: 'Inbox',      href: '/dashboard/inbox',       icon: Inbox,         badge: 'unread',  exact: false },
      { label: 'Snoozed',    href: '/dashboard/waiting',     icon: AlarmClock,    badge: 'waiting', exact: false },
      { label: 'Sent',       href: '/dashboard/sent',        icon: Send,          badge: null,      exact: false },
      { label: 'Queue',      href: '/dashboard/queue',       icon: ClipboardList, badge: 'drafts',  exact: false },
    ],
  },
  {
    label: 'Work',
    items: [
      { label: 'Briefing',   href: '/dashboard/briefing',    icon: Newspaper,    badge: null,      exact: false },
      { label: 'Tasks',      href: '/dashboard/tasks',       icon: CheckSquare,  badge: 'tasks',   exact: false },
      { label: 'Calendar',   href: '/dashboard/calendar',    icon: CalendarDays, badge: null,      exact: false },
    ],
  },
  {
    label: 'Insights',
    items: [
      { label: 'AI Insights', href: '/dashboard/insights',   icon: Sparkles,     badge: null,      exact: false },
      { label: 'Analytics',   href: '/dashboard/analytics',  icon: BarChart3,    badge: null,      exact: false },
      { label: 'Reports',     href: '/dashboard/report',     icon: FileText,     badge: null,      exact: false },
    ],
  },
  {
    label: 'Tools',
    items: [
      { label: 'Knowledge',  href: '/dashboard/knowledge',   icon: BookOpen,     badge: null,      exact: false },
      { label: 'Templates',  href: '/dashboard/templates',   icon: Layout,       badge: null,      exact: false },
      { label: 'Rules',      href: '/dashboard/rules',       icon: Filter,       badge: null,      exact: false },
      { label: 'Unsubscribe',href: '/dashboard/unsubscribe', icon: MailX,        badge: null,      exact: false },
    ],
  },
  {
    label: 'Account',
    items: [
      { label: 'Settings',   href: '/dashboard/settings',    icon: Settings,     badge: null,      exact: false },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed)
  const setSidebarCollapsed = useAppStore((s) => s.setSidebarCollapsed)
  const setCommandOpen = useAppStore((s) => s.setCommandOpen)
  const setComposeOpen = useAppStore((s) => s.setComposeOpen)
  const focusMode = useAppStore((s) => s.focusMode)
  const { data: session } = useSession()

  const { data: stats } = useQuery({
    queryKey: ['sidebar-stats'],
    queryFn: async () => {
      const res = await fetch('/api/stats')
      if (!res.ok) return null
      return res.json()
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  })

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

  return (
    <motion.nav
      animate={{ width: sidebarCollapsed ? 64 : 240, opacity: focusMode ? 0.3 : 1, filter: focusMode ? 'grayscale(100%)' : 'none' }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn("flex flex-col h-full shrink-0 z-40 overflow-hidden", focusMode && "pointer-events-none")}
      style={{
        background: 'var(--bg-base)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* ── Logo + Bell ─────────────────────────────────────────── */}
      <div
        className={cn(
          'flex items-center h-16 shrink-0 mt-2',
          sidebarCollapsed ? 'justify-center px-0' : 'px-5 gap-3'
        )}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-8 h-8 rounded shrink-0 flex items-center justify-center" style={{ background: 'var(--logo-bg)', color: 'var(--logo-bg-text)' }}>
            <Zap size={14} strokeWidth={2.5} />
          </div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.15 }}
                className="font-inter text-lg font-bold tracking-tight text-[var(--text-1)] whitespace-nowrap"
              >
                Aria<span className="text-accent">.</span>
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {!sidebarCollapsed && (
          <div className="shrink-0 text-text-3 hover:text-text-1 transition-colors">
            <NotificationBell />
          </div>
        )}
      </div>

      {/* ── Nav sections ────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            {/* Section label */}
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-3 pb-2 text-[10px] font-bold tracking-widest text-text-3 uppercase"
                >
                  {section.label}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Nav items */}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href)
                const badgeCount = item.badge ? (stats?.[item.badge] ?? 0) : 0
                const isCritical = item.badge === 'unread' && (stats?.critical ?? 0) > 0

                return (
                  <Link href={item.href} key={item.href}>
                    <div
                      title={sidebarCollapsed ? item.label : undefined}
                      className={cn(
                        'relative flex items-center rounded-md cursor-pointer transition-all duration-150',
                        sidebarCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-1.5 min-h-[32px]',
                        active
                          ? 'bg-[var(--accent-subtle)] text-[var(--accent-text)] font-medium'
                          : 'text-3 hover:bg-hover hover:text-1'
                      )}
                    >
                      <div className="relative shrink-0 flex items-center justify-center">
                        <item.icon
                          size={15}
                          strokeWidth={active ? 2.5 : 2}
                          className={cn(active ? 'text-accent' : 'text-current transition-colors')}
                        />
                        {badgeCount > 0 && sidebarCollapsed && (
                          <span
                            className={cn(
                              "absolute -top-1 -right-1 w-2 h-2 rounded-full border border-base",
                              isCritical ? "bg-accent" : "bg-text-3"
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
                            <span className="text-[13px] truncate">
                              {item.label}
                            </span>
                            {badgeCount > 0 && (
                              <span
                                className={cn(
                                  "text-[10px] px-1.5 py-0.5 rounded font-bold ml-2 shrink-0 border",
                                  isCritical
                                    ? "bg-accent/10 text-accent border-accent/20"
                                    : "bg-surface text-3 border-border"
                                )}
                              >
                                {badgeCount}
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
          </div>
        ))}
      </div>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <div className="px-3 py-3 space-y-1 shrink-0 border-t border-border">
        {/* Command palette hint */}
        <button
          onClick={() => setCommandOpen(true)}
          title={sidebarCollapsed ? 'Search (⌘K)' : undefined}
          className={cn(
            'flex items-center w-full rounded-md text-text-3 hover:text-text-1 hover:bg-hover transition-colors',
            sidebarCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2'
          )}
        >
          <Command size={15} strokeWidth={2} className="shrink-0" />
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-between flex-1"
              >
                <span className="text-[13px] font-medium">Search</span>
                <kbd className="text-[10px] px-1.5 rounded font-mono bg-surface border border-border text-3 font-medium">
                  ⌘K
                </kbd>
              </motion.div>
            )}
          </AnimatePresence>
        </button>

        {/* User row */}
        <div
          className={cn(
            'flex items-center rounded-md transition-colors group relative cursor-default',
            sidebarCollapsed ? 'justify-center p-2' : 'gap-3 px-2 py-2'
          )}
        >
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: 'var(--logo-bg)', color: 'var(--logo-bg-text)' }}>
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
                  <p className="text-[13px] font-medium text-1 truncate">
                    {session?.user?.name || 'User'}
                  </p>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded bg-surface border border-border text-3 hover:text-accent hover:border-accent/30"
                  title="Sign out"
                >
                  <LogOut size={13} strokeWidth={2} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute -right-3 top-20 w-6 h-6 bg-surface border border-border rounded-full flex items-center justify-center text-text-3 hover:text-text-1 shadow-sm z-50"
        >
          <ChevronLeft
            size={12}
            strokeWidth={2.5}
            className={cn('transition-transform duration-200', sidebarCollapsed && 'rotate-180')}
          />
        </button>
      </div>
    </motion.nav>
  )
}
