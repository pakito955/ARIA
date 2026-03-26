'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Inbox, CheckSquare, BarChart3, Zap,
  ChevronLeft, Settings, LogOut, Command, CalendarDays,
  FileText, MailX, Layout, Filter,
  Send, AlarmClock, LayoutDashboard, BookOpen, Sparkles,
  Newspaper, ClipboardList, Sun, Moon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/lib/store'
import { useQuery } from '@tanstack/react-query'
import { useSession, signOut } from 'next-auth/react'
import { useEffect } from 'react'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { useTheme } from '@/lib/theme'

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard',  href: '/dashboard',             icon: LayoutDashboard, badge: null,      exact: true },
    ],
  },
  {
    label: 'Mail',
    items: [
      { label: 'Inbox',      href: '/dashboard/inbox',       icon: Inbox,         badge: 'unread',  exact: false },
      { label: 'Snoozed',    href: '/dashboard/waiting',     icon: AlarmClock,    badge: 'waiting', exact: false },
      { label: 'Queue',      href: '/dashboard/queue',       icon: ClipboardList, badge: null,      exact: false },
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
  const focusMode = useAppStore((s) => s.focusMode)
  const { data: session } = useSession()
  const { theme, toggle: toggleTheme } = useTheme()

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
      animate={{
        width: sidebarCollapsed ? 64 : 240,
        opacity: focusMode ? 0.3 : 1,
        filter: focusMode ? 'grayscale(100%)' : 'none',
      }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn('flex flex-col h-full shrink-0 z-40 overflow-hidden relative', focusMode && 'pointer-events-none')}
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
          <div
            className="w-8 h-8 rounded shrink-0 flex items-center justify-center"
            style={{ background: 'var(--logo-bg)', color: 'var(--logo-bg-text)' }}
          >
            <Zap size={14} strokeWidth={2.5} />
          </div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.15 }}
                className="font-inter text-lg font-bold tracking-tight whitespace-nowrap"
                style={{ color: 'var(--text-1)' }}
              >
                Aria<span style={{ color: 'var(--accent)' }}>.</span>
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {!sidebarCollapsed && (
          <div className="shrink-0" style={{ color: 'var(--text-3)' }}>
            <NotificationBell />
          </div>
        )}
      </div>

      {/* ── Nav sections ────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-3 pb-2 text-[10px] font-bold tracking-widest uppercase"
                  style={{ color: 'var(--text-3)' }}
                >
                  {section.label}
                </motion.p>
              )}
            </AnimatePresence>

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
                        'relative flex items-center rounded-md cursor-pointer',
                        'transition-all duration-150',
                        sidebarCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-1.5 min-h-[32px]',
                        active && 'nav-item-active-glow font-medium'
                      )}
                      style={
                        active
                          ? { background: 'var(--accent-subtle)', color: 'var(--accent-text)' }
                          : { color: 'var(--text-3)' }
                      }
                      onMouseEnter={(e) => {
                        if (!active) {
                          const el = e.currentTarget as HTMLDivElement
                          el.style.background = 'var(--bg-hover)'
                          el.style.color = 'var(--text-1)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!active) {
                          const el = e.currentTarget as HTMLDivElement
                          el.style.background = ''
                          el.style.color = 'var(--text-3)'
                        }
                      }}
                    >
                      <div className="relative shrink-0 flex items-center justify-center">
                        <item.icon
                          size={15}
                          strokeWidth={active ? 2.5 : 2}
                          style={{ color: active ? 'var(--accent)' : 'currentColor' }}
                        />
                        {badgeCount > 0 && sidebarCollapsed && (
                          <span
                            className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
                            style={{
                              background: isCritical ? 'var(--accent)' : 'var(--text-3)',
                              border: '1.5px solid var(--bg-base)',
                            }}
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
                            <span className="text-[13px] truncate">{item.label}</span>
                            {badgeCount > 0 && (
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded font-bold ml-2 shrink-0"
                                style={
                                  isCritical
                                    ? { background: 'var(--accent-subtle)', color: 'var(--accent-text)', border: '1px solid rgba(242,78,30,0.20)' }
                                    : { background: 'var(--bg-surface)', color: 'var(--text-3)', border: '1px solid var(--border)' }
                                }
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
      <div
        className="px-3 py-3 space-y-1 shrink-0"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        {/* Command palette hint */}
        <button
          onClick={() => setCommandOpen(true)}
          title={sidebarCollapsed ? 'Search (⌘K)' : undefined}
          className={cn(
            'flex items-center w-full rounded-md transition-colors duration-150',
            sidebarCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2'
          )}
          style={{ color: 'var(--text-3)' }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.background = 'var(--bg-hover)'
            el.style.color = 'var(--text-1)'
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.background = ''
            el.style.color = 'var(--text-3)'
          }}
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
                <kbd
                  className="text-[10px] px-1.5 rounded font-mono font-medium"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-3)' }}
                >
                  ⌘K
                </kbd>
              </motion.div>
            )}
          </AnimatePresence>
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={sidebarCollapsed ? `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode` : undefined}
          className={cn(
            'flex items-center w-full rounded-md transition-colors duration-150',
            sidebarCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2'
          )}
          style={{ color: 'var(--text-3)' }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.background = 'var(--bg-hover)'
            el.style.color = 'var(--text-1)'
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.background = ''
            el.style.color = 'var(--text-3)'
          }}
        >
          {theme === 'dark'
            ? <Sun size={15} strokeWidth={2} className="shrink-0" />
            : <Moon size={15} strokeWidth={2} className="shrink-0" />
          }
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-[13px] font-medium"
              >
                {theme === 'dark' ? 'Light mode' : 'Dark mode'}
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* User row + online status dot */}
        <div
          className={cn(
            'flex items-center rounded-md transition-colors group cursor-default',
            sidebarCollapsed ? 'justify-center p-2' : 'gap-3 px-2 py-2'
          )}
        >
          <div className="relative shrink-0">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
              style={{ background: 'var(--logo-bg)', color: 'var(--logo-bg-text)' }}
            >
              {initials}
            </div>
            <span
              className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border"
              style={{ background: 'var(--green)', borderColor: 'var(--bg-base)', boxShadow: '0 0 4px var(--green)' }}
            />
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
                  <p className="text-[13px] font-medium truncate" style={{ color: 'var(--text-1)' }}>
                    {session?.user?.name || 'User'}
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--green)' }}>Online</p>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-3)' }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLButtonElement
                    el.style.color = 'var(--red)'
                    el.style.borderColor = 'var(--red)'
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLButtonElement
                    el.style.color = 'var(--text-3)'
                    el.style.borderColor = 'var(--border)'
                  }}
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
          className="absolute -right-3 top-20 w-6 h-6 rounded-full flex items-center justify-center z-50 transition-colors duration-150"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            color: 'var(--text-3)',
            boxShadow: 'var(--shadow-sm)',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-1)' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-3)' }}
        >
          <ChevronLeft
            size={12}
            strokeWidth={2.5}
            style={{
              transition: 'transform 200ms ease',
              transform: sidebarCollapsed ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        </button>
      </div>
    </motion.nav>
  )
}
