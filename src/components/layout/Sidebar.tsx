'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Inbox, CheckSquare, Clock, BarChart3, Zap,
  ChevronLeft, Settings, LogOut, Command, CalendarDays,
  Sun, Moon, FileText, Bell, MailX, Layout, Sparkles, Filter,
  Send, AlarmClock, LayoutDashboard,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/lib/store'
import { useQuery } from '@tanstack/react-query'
import { useSession, signOut } from 'next-auth/react'
import { useEffect } from 'react'
import { useTheme } from '@/lib/theme'
import { NotificationBell } from '@/components/notifications/NotificationBell'

// Nav structure with section groupings
const NAV_SECTIONS = [
  {
    label: 'OVERVIEW',
    items: [
      { label: 'Dashboard',  href: '/dashboard',             icon: LayoutDashboard, badge: null, exact: true },
    ],
  },
  {
    label: 'MAIL',
    items: [
      { label: 'Inbox',      href: '/dashboard/inbox',       icon: Inbox,        badge: 'unread',  exact: false },
      { label: 'Snoozed',    href: '/dashboard/waiting',     icon: AlarmClock,   badge: 'waiting', exact: false },
      { label: 'Sent',       href: '/dashboard/sent',        icon: Send,         badge: null,      exact: false },
    ],
  },
  {
    label: 'WORK',
    items: [
      { label: 'Tasks',      href: '/dashboard/tasks',       icon: CheckSquare,  badge: 'tasks',   exact: false },
      { label: 'Calendar',   href: '/dashboard/calendar',    icon: CalendarDays, badge: null,      exact: false },
    ],
  },
  {
    label: 'INSIGHTS',
    items: [
      { label: 'Analytics',  href: '/dashboard/analytics',   icon: BarChart3,    badge: null,      exact: false },
      { label: 'Reports',    href: '/dashboard/report',      icon: FileText,     badge: null,      exact: false },
    ],
  },
  {
    label: 'TOOLS',
    items: [
      { label: 'Templates',  href: '/dashboard/templates',   icon: Layout,       badge: null,      exact: false },
      { label: 'Rules',      href: '/dashboard/rules',       icon: Filter,       badge: null,      exact: false },
      { label: 'Unsubscribe',href: '/dashboard/unsubscribe', icon: MailX,        badge: null,      exact: false },
    ],
  },
  {
    label: 'ACCOUNT',
    items: [
      { label: 'Settings',   href: '/dashboard/settings',    icon: Settings,     badge: null,      exact: false },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { sidebarCollapsed, setSidebarCollapsed, setCommandOpen, setComposeOpen } = useAppStore()
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
      animate={{ width: sidebarCollapsed ? 56 : 220 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="flex flex-col h-full shrink-0 z-40 overflow-hidden"
      style={{
        background: 'var(--bg-base)',
        boxShadow: '1px 0 0 var(--border)',
      }}
    >
      {/* ── Logo + Bell ─────────────────────────────────────────── */}
      <div
        className={cn(
          'flex items-center h-14 shrink-0',
          sidebarCollapsed ? 'justify-center px-0' : 'px-4 gap-2'
        )}
      >
        {/* Logo pill */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: 'linear-gradient(135deg, #7C5CFF, #A78BFA)',
              boxShadow: '0 0 14px rgba(124,92,255,0.45), inset 0 1px 0 rgba(255,255,255,0.15)',
            }}
          >
            <Zap size={13} className="text-white" strokeWidth={2.5} />
          </div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.15 }}
                className="gradient-text font-outfit text-[15px] font-bold tracking-[0.14em] whitespace-nowrap"
              >
                ARIA
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {!sidebarCollapsed && (
          <div className="shrink-0">
            <NotificationBell />
          </div>
        )}
      </div>

      {/* ── AI Compose button ───────────────────────────────────── */}
      <div className="px-2 pt-1 pb-2 shrink-0">
        <button
          onClick={() => setComposeOpen(true)}
          title={sidebarCollapsed ? 'AI Compose' : undefined}
          className={cn(
            'flex items-center rounded-xl text-white text-[12px] font-medium w-full transition-all duration-150',
            sidebarCollapsed ? 'justify-center p-2.5' : 'gap-2 px-3 py-2.5'
          )}
          style={{
            background: 'linear-gradient(135deg, #7C5CFF, #6D4EF0)',
            boxShadow: '0 0 16px rgba(124,92,255,0.3)',
          }}
        >
          <Sparkles size={14} strokeWidth={2} className="shrink-0" />
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="whitespace-nowrap"
              >
                Compose
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* ── Nav sections ────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-1">
            {/* Section label */}
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-3 pt-3 pb-1 text-[10px] font-medium tracking-widest uppercase"
                  style={{ color: 'var(--text-3)' }}
                >
                  {section.label}
                </motion.p>
              )}
            </AnimatePresence>
            {sidebarCollapsed && <div className="pt-2" />}

            {/* Nav items */}
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
                      'relative flex items-center rounded-lg cursor-pointer transition-all duration-150 mb-0.5',
                      sidebarCollapsed ? 'justify-center p-2.5' : 'gap-2.5 px-3 py-2',
                      active
                        ? 'nav-active'
                        : 'btn-ghost'
                    )}
                  >
                    {/* Active left border marker */}
                    {active && (
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 rounded-r-full"
                        style={{ background: 'var(--accent)' }}
                      />
                    )}

                    <div className="relative shrink-0">
                      <item.icon
                        size={16}
                        strokeWidth={active ? 2.2 : 1.75}
                        style={{ color: active ? 'var(--accent-text)' : 'var(--text-2)' }}
                      />
                      {badgeCount > 0 && sidebarCollapsed && (
                        <span
                          className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full"
                          style={{ background: isCritical ? 'var(--red)' : 'var(--amber)' }}
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
                          <span
                            className={cn('text-[13px] truncate', active ? 'font-medium' : 'font-normal')}
                            style={{ color: active ? 'var(--accent-text)' : 'var(--text-2)' }}
                          >
                            {item.label}
                          </span>
                          {badgeCount > 0 && (
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium ml-1 shrink-0"
                              style={{
                                background: isCritical
                                  ? 'var(--red-subtle)'
                                  : item.badge === 'tasks'
                                  ? 'var(--green-subtle)'
                                  : 'var(--amber-subtle)',
                                color: isCritical
                                  ? 'var(--red)'
                                  : item.badge === 'tasks'
                                  ? 'var(--green)'
                                  : 'var(--amber)',
                              }}
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
        ))}
      </div>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <div
        className="px-2 py-2 space-y-0.5 shrink-0"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        {/* Command palette shortcut */}
        <button
          onClick={() => setCommandOpen(true)}
          title={sidebarCollapsed ? '⌘K' : undefined}
          className={cn(
            'btn-ghost flex items-center w-full rounded-lg transition-all',
            sidebarCollapsed ? 'justify-center p-2.5' : 'gap-2.5 px-3 py-2'
          )}
        >
          <Command size={15} strokeWidth={1.75} className="shrink-0" style={{ color: 'var(--text-3)' }} />
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-between flex-1"
              >
                <span className="text-[13px]" style={{ color: 'var(--text-2)' }}>Search</span>
                <kbd
                  className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                  style={{ background: 'var(--bg-hover)', color: 'var(--text-3)', border: '1px solid var(--border)' }}
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
          title={sidebarCollapsed ? 'Toggle theme' : undefined}
          className={cn(
            'btn-ghost flex items-center w-full rounded-lg transition-all',
            sidebarCollapsed ? 'justify-center p-2.5' : 'gap-2.5 px-3 py-2'
          )}
        >
          {theme === 'dark'
            ? <Sun size={15} strokeWidth={1.75} className="shrink-0" style={{ color: 'var(--text-3)' }} />
            : <Moon size={15} strokeWidth={1.75} className="shrink-0" style={{ color: 'var(--text-3)' }} />
          }
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-[13px]"
                style={{ color: 'var(--text-2)' }}
              >
                {theme === 'dark' ? 'Light mode' : 'Dark mode'}
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* User row */}
        <div
          className={cn(
            'btn-ghost flex items-center rounded-lg cursor-pointer group transition-all',
            sidebarCollapsed ? 'justify-center p-2.5' : 'gap-2.5 px-3 py-2'
          )}
        >
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold text-white shrink-0"
            style={{
              background: 'linear-gradient(135deg, var(--accent), #A78BFA)',
              boxShadow: '0 0 8px rgba(124,92,255,0.3)',
            }}
          >
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
                  <p className="text-[13px] font-medium truncate" style={{ color: 'var(--text-1)' }}>
                    {session?.user?.name?.split(' ')[0] || 'User'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="pulse-ring shrink-0">
                      <span className="status-live" style={{ width: '5px', height: '5px' }} />
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--green)' }}>Active</span>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); signOut({ callbackUrl: '/login' }) }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 ml-1 rounded-md hover:bg-[var(--red-subtle)] hover:text-[var(--red)]"
                  style={{ color: 'var(--text-3)' }}
                  title="Sign out"
                >
                  <LogOut size={13} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className={cn(
            'btn-ghost flex items-center w-full rounded-lg transition-all',
            sidebarCollapsed ? 'justify-center p-2.5' : 'gap-2.5 px-3 py-1.5'
          )}
        >
          <ChevronLeft
            size={14}
            strokeWidth={1.75}
            className={cn('shrink-0 transition-transform duration-200', sidebarCollapsed && 'rotate-180')}
            style={{ color: 'var(--text-3)' }}
          />
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-[12px]"
                style={{ color: 'var(--text-3)' }}
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
