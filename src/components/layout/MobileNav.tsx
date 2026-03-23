'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Zap, Inbox, CheckSquare, CalendarDays, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'

const MOBILE_NAV = [
  { label: 'Home',     href: '/dashboard',          icon: Zap,          exact: true },
  { label: 'Inbox',    href: '/dashboard/inbox',     icon: Inbox,        exact: false },
  { label: 'Tasks',    href: '/dashboard/tasks',     icon: CheckSquare,  exact: false },
  { label: 'Calendar', href: '/dashboard/calendar',  icon: CalendarDays, exact: false },
  { label: 'Insights', href: '/dashboard/analytics', icon: BarChart3,    exact: false },
]

export function MobileNav() {
  const pathname = usePathname()

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

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 pb-safe bg-card/95 backdrop-blur-md border-t border-border">
      <div className="flex items-center px-2">
        {MOBILE_NAV.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          const badge = item.href === '/dashboard/inbox' ? (stats?.unread ?? 0) : 0
          const isCritical = badge > 0 && (stats?.critical ?? 0) > 0

          return (
            <Link key={item.href} href={item.href} className="flex-1">
              <div className="flex flex-col items-center gap-1 py-3 relative">
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-full" style={{ background: 'var(--accent)' }} />
                )}

                <div className="relative">
                  <item.icon
                    size={22}
                    strokeWidth={active ? 2.5 : 2}
                    className={cn(active ? 'text-1' : 'text-3')}
                  />
                  {badge > 0 && (
                    <span
                      className={cn(
                        "absolute -top-1.5 -right-2 min-w-[16px] h-[16px] rounded-full text-[9px] font-bold flex items-center justify-center px-0.5",
                        isCritical ? "bg-accent text-white" : "bg-surface border border-border text-1"
                      )}
                    >
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </div>

                <span className={cn("text-[10px] font-medium", active ? "text-1 font-bold" : "text-3")}>
                  {item.label}
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
