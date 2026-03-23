'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Inbox, CheckSquare, Clock, BarChart3, Zap,
  ChevronLeft, Settings, LogOut, Command, CalendarDays,
  Sun, Moon, FileText, Bell, MailX, Layout, Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/lib/store'
import { useQuery } from '@tanstack/react-query'
import { useSession, signOut } from 'next-auth/react'
import { useEffect } from 'react'
import { useTheme } from '@/lib/theme'

const NAV_ITEMS = [
  { label: 'Home',       href: '/dashboard',              icon: Zap,          exact: true,  badge: null,       group: 'main' },
  { label: 'Inbox',      href: '/dashboard/inbox',        icon: Inbox,        exact: false, badge: 'unread',   group: 'main' },
  { label: 'Tasks',      href: '/dashboard/tasks',        icon: CheckSquare,  exact: false, badge: 'tasks',    group: 'main' },
  { label: 'Calendar',   href: '/dashboard/calendar',     icon: CalendarDays, exact: false, badge: null,       group: 'main' },
  { label: 'Waiting',    href: '/dashboard/waiting',      icon: Clock,        exact: false, badge: 'waiting',  group: 'main' },
  { label: 'Follow-ups', href: '/dashboard/followups',    icon: Bell,         exact: false, badge: null,       group: 'tools' },
  { label: 'Templates',  href: '/dashboard/templates',    icon: Layout,       exact: false, badge: null,       group: 'tools' },
  { label: 'Unsubscribe',href: '/dashboard/unsubscribe',  icon: MailX,        exact: false, badge: null,       group: 'tools' },
  { label: 'Insights',   href: '/dashboard/analytics',    icon: BarChart3,    exact: false, badge: null,       group: 'reports' },
  { label: 'Report',     href: '/dashboard/report',       icon: FileText,     exact: false, badge: null,       group: 'reports' },
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
      animate={{ width: sidebarCollapsed ? 60 : 220 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="flex flex-col h-full shrink-0 z-40 overflow-hidden"
      style={{ background: 'var(--bg-card)', borderRight: '1px solid var(--border)' }}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex items-center h-14 shrink-0',
          sidebarCollapsed ? 'justify-center' : 'gap-3 px-4'
        )}
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 relative"
          style={{
            background: 'linear-gradient(135deg, #7c3aed, #5b21b6)',
            boxShadow: '0 0 12px rgba(124,58,237,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
          }}
        >
          <Zap size={14} className="text-white" strokeWidth={2.5} />
        </div>
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.span
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.15 }}
              className="font-outfit text-[15px] font-semibold tracking-[0.12em] whitespace-nowrap overflow-hidden gradient-text"
            >
              ARIA
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Compose button */}
      <div className="px-2 pt-2 pb-1 shrink-0">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setComposeOpen(true)}
          title={sidebarCollapsed ? 'AI Compose' : undefined}
          className={cn(
            'flex items-center rounded-xl text-white text-[12px] font-medium transition-all w-full',
            sidebarCollapsed ? 'justify-center p-2.5' : 'gap-2 px-3 py-2.5'
          )}
          style={{ background: 'var(--accent)', boxShadow: '0 0 14px rgba(124,58,237,0.3)' }}
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
                AI Compose
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {NAV_ITEMS.map((item, idx) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          const badgeCount = item.badge ? (stats?.[item.badge] ?? 0) : 0
          const isCritical = item.badge === 'unread' && (stats?.critical ?? 0) > 0
          const prevGroup = idx > 0 ? NAV_ITEMS[idx - 1].group : item.group
          const showDivider = idx > 0 && item.group !== prevGroup

          return (
            <div key={item.href}>
              {showDivider && !sidebarCollapsed && (
                <div className="mx-3 my-1.5 border-t border-[var(--border)]" />
              )}
              {showDivider && sidebarCollapsed && (
                <div className="mx-auto my-1.5 border-t border-[var(--border)] w-6" />
              )}
              <Link href={item.href}>
                <div
                  title={sidebarCollapsed ? item.label : undefined}
                  className={cn(
                    'relative flex items-center rounded-lg cursor-pointer transition-all duration-150',
                    sidebarCollapsed ? 'justify-center p-2.5' : 'gap-2.5 px-3 py-2.5',
                    active ? 'nav-active' : 'btn-ghost'
                  )}
                >
                  {active && !sidebarCollapsed && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                      style={{ background: 'var(--accent)' }}
                    />
                  )}

                  <div className="relative shrink-0">
                    <item.icon
                      size={17}
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
                              background: isCritical ? 'var(--red-subtle)' : item.badge === 'tasks' ? 'var(--green-subtle)' : 'var(--amber-subtle)',
                              color: isCritical ? 'var(--red)' : item.badge === 'tasks' ? 'var(--green)' : 'var(--amber)',
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
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="px-2 py-3 space-y-0.5 shrink-0" style={{ borderTop: '1px solid var(--border)' }}>

        {/* ⌘K */}
        <button
          onClick={() => setCommandOpen(true)}
          title={sidebarCollapsed ? '⌘K' : undefined}
          className={cn(
            'btn-ghost flex items-center w-full rounded-lg transition-all',
            sidebarCollapsed ? 'justify-center p-2.5' : 'gap-2.5 px-3 py-2.5'
          )}
        >
          <Command size={16} strokeWidth={1.75} className="shrink-0" style={{ color: 'var(--text-3)' }} />
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
                  style={{ background: 'var(--bg-hover)', color: 'var(--text-3)' }}
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
            sidebarCollapsed ? 'justify-center p-2.5' : 'gap-2.5 px-3 py-2.5'
          )}
        >
          {theme === 'dark'
            ? <Sun size={16} strokeWidth={1.75} className="shrink-0" style={{ color: 'var(--text-3)' }} />
            : <Moon size={16} strokeWidth={1.75} className="shrink-0" style={{ color: 'var(--text-3)' }} />
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

        {/* Settings */}
        <Link href="/dashboard/settings">
          <div
            title={sidebarCollapsed ? 'Settings' : undefined}
            className={cn(
              'btn-ghost flex items-center rounded-lg cursor-pointer transition-all',
              sidebarCollapsed ? 'justify-center p-2.5' : 'gap-2.5 px-3 py-2.5'
            )}
          >
            <Settings size={16} strokeWidth={1.75} className="shrink-0" style={{ color: 'var(--text-3)' }} />
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-[13px]"
                  style={{ color: 'var(--text-2)' }}
                >
                  Settings
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </Link>

        {/* User row */}
        <div
          className={cn(
            'btn-ghost flex items-center rounded-lg cursor-pointer group transition-all',
            sidebarCollapsed ? 'justify-center p-2.5' : 'gap-2.5 px-3 py-2.5'
          )}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold text-white shrink-0"
            style={{ background: `linear-gradient(135deg, var(--accent), var(--amber))` }}
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
                      <span className="status-live" style={{ width: '6px', height: '6px' }} />
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--green)' }}>Monitoring</span>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); signOut({ callbackUrl: '/login' }) }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 ml-1 rounded hover:text-red-500"
                  style={{ color: 'var(--text-3)' }}
                  title="Sign out"
                >
                  <LogOut size={13} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Collapse */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className={cn(
            'btn-ghost flex items-center w-full rounded-lg transition-all',
            sidebarCollapsed ? 'justify-center p-2.5' : 'gap-2.5 px-3 py-2'
          )}
        >
          <ChevronLeft
            size={15}
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
