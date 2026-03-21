'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Zap, Inbox, CheckSquare, CalendarDays, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'

const MOBILE_NAV = [
  { label: 'Home', href: '/dashboard', icon: Zap, exact: true },
  { label: 'Inbox', href: '/dashboard/inbox', icon: Inbox },
  { label: 'Tasks', href: '/dashboard/tasks', icon: CheckSquare },
  { label: 'Calendar', href: '/dashboard/calendar', icon: CalendarDays },
  { label: 'Insights', href: '/dashboard/analytics', icon: BarChart3 },
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
    refetchInterval: 30_000,
  })

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a18]/95 backdrop-blur-2xl border-t border-white/[0.08]">
      <div className="flex items-center px-1 pb-safe">
        {MOBILE_NAV.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          const badge = item.href === '/dashboard/inbox' ? (stats?.unread ?? 0) : 0
          const isCritical = badge > 0 && (stats?.critical ?? 0) > 0

          return (
            <Link key={item.href} href={item.href} className="flex-1">
              <div
                className={cn(
                  'flex flex-col items-center gap-1 py-2.5 px-1 relative transition-all',
                  active ? 'text-[#a78bfa]' : 'text-[#5a5a7a]'
                )}
              >
                {/* Active indicator */}
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#8b5cf6] rounded-full" />
                )}

                <div className="relative">
                  <item.icon
                    size={22}
                    strokeWidth={active ? 2 : 1.5}
                    className="transition-all"
                  />
                  {badge > 0 && (
                    <span
                      className={cn(
                        'absolute -top-1.5 -right-2 min-w-[16px] h-4 rounded-full text-[8px] font-bold flex items-center justify-center px-1',
                        isCritical ? 'bg-[#ef4444] text-white' : 'bg-[#f59e0b] text-white'
                      )}
                    >
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </div>

                <span
                  className={cn(
                    'text-[9px] font-medium tracking-tight transition-all',
                    active ? 'text-[#a78bfa]' : 'text-[#5a5a7a]'
                  )}
                >
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
