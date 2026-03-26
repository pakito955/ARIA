'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Mail, Clock, Settings, Zap, X } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────────────────────────

interface AppNotification {
  id: string
  type: 'followup' | 'snooze' | 'rule' | 'system' | 'email'
  title: string
  body: string
  emailId?: string
  read: boolean
  createdAt: string
}

interface NotifResponse {
  notifications: AppNotification[]
  unreadCount: number
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function typeIcon(type: AppNotification['type']) {
  switch (type) {
    case 'email':    return <Mail size={12} />
    case 'followup': return <Clock size={12} />
    case 'rule':     return <Zap size={12} />
    case 'system':   return <Settings size={12} />
    case 'snooze':   return <Clock size={12} />
    default:         return <Bell size={12} />
  }
}

function typeColor(type: AppNotification['type']): string {
  switch (type) {
    case 'email':    return 'var(--accent)'
    case 'followup': return 'var(--amber)'
    case 'rule':     return 'var(--blue)'
    case 'snooze':   return 'var(--green)'
    default:         return 'var(--text-3)'
  }
}

function groupByDate(notifs: AppNotification[]): { label: string; items: AppNotification[] }[] {
  const today     = new Date(); today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)

  const groups: Record<string, AppNotification[]> = { Today: [], Yesterday: [], Older: [] }
  for (const n of notifs) {
    const d = new Date(n.createdAt); d.setHours(0, 0, 0, 0)
    if (d >= today)          groups['Today'].push(n)
    else if (d >= yesterday) groups['Yesterday'].push(n)
    else                     groups['Older'].push(n)
  }
  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }))
}

// ── Component ──────────────────────────────────────────────────────────────────

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const panelRef        = useRef<HTMLDivElement>(null)
  const router          = useRouter()
  const queryClient     = useQueryClient()

  const { data } = useQuery<NotifResponse>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications?limit=30')
      if (!res.ok) return { notifications: [], unreadCount: 0 }
      return res.json()
    },
    staleTime: 30_000,
  })

  const notifications = data?.notifications ?? []
  const unreadCount   = data?.unreadCount ?? 0
  const groups        = groupByDate(notifications)

  // SSE — listen for new notifications via the existing email stream
  useEffect(() => {
    let es: EventSource | null = null
    let retryTimeout: ReturnType<typeof setTimeout>

    const connect = () => {
      es = new EventSource('/api/emails/stream')
      es.addEventListener('notification', () => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] })
      })
      es.onerror = () => {
        es?.close()
        retryTimeout = setTimeout(connect, 5000)
      }
    }
    connect()
    return () => {
      es?.close()
      clearTimeout(retryTimeout)
    }
  }, [queryClient])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const markAllRead = async () => {
    await fetch('/api/notifications/read-all', { method: 'POST' })
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
  }

  const handleNotifClick = async (n: AppNotification) => {
    if (!n.read) {
      await fetch(`/api/notifications/${n.id}/read`, { method: 'POST' })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }
    if (n.emailId) {
      router.push(`/dashboard/inbox?email=${n.emailId}`)
    }
    setOpen(false)
  }

  return (
    <div ref={panelRef} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-1.5 rounded-lg transition-colors duration-150"
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
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell size={16} strokeWidth={2} />
        {unreadCount > 0 && (
          <span
            className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full"
            style={{
              background: 'var(--accent)',
              boxShadow: '0 0 4px var(--accent)',
              border: '1.5px solid var(--bg-base)',
            }}
          />
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-80 rounded-2xl overflow-hidden z-50"
          style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid var(--glass-border)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid var(--glass-border)' }}
          >
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold" style={{ color: 'var(--text-1)' }}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: 'var(--accent)', color: '#fff' }}
                >
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[11px] px-2 py-1 rounded-lg transition-colors duration-100"
                  style={{ color: 'var(--accent)' }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLElement).style.background = 'var(--accent-subtle)'
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLElement).style.background = ''
                  }}
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg transition-colors duration-100"
                style={{ color: 'var(--text-3)' }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLElement).style.background = ''
                }}
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="overflow-y-auto" style={{ maxHeight: 360 }}>
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <Bell size={24} style={{ color: 'var(--text-3)', opacity: 0.4 }} />
                <p className="text-[13px]" style={{ color: 'var(--text-3)' }}>
                  No notifications yet
                </p>
              </div>
            ) : (
              groups.map(({ label, items }) => (
                <div key={label}>
                  <div
                    className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: 'var(--text-3)', background: 'var(--bg-hover)' }}
                  >
                    {label}
                  </div>
                  {items.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => handleNotifClick(n)}
                      className={cn('w-full flex items-start gap-3 px-4 py-3 text-left transition-colors duration-100')}
                      style={{
                        background: !n.read ? 'var(--accent-subtle)' : 'transparent',
                        borderBottom: '1px solid var(--glass-border)',
                      }}
                      onMouseEnter={(e) => {
                        ;(e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'
                      }}
                      onMouseLeave={(e) => {
                        ;(e.currentTarget as HTMLElement).style.background = !n.read
                          ? 'var(--accent-subtle)'
                          : 'transparent'
                      }}
                    >
                      {/* Type icon */}
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: typeColor(n.type) + '20', color: typeColor(n.type) }}
                      >
                        {typeIcon(n.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-[12px] leading-snug"
                          style={{ color: 'var(--text-1)', fontWeight: n.read ? 400 : 600 }}
                        >
                          {n.title}
                        </p>
                        <p
                          className="text-[11px] mt-0.5 truncate"
                          style={{ color: 'var(--text-3)' }}
                        >
                          {n.body}
                        </p>
                        <p
                          className="text-[10px] mt-1"
                          style={{ color: 'var(--text-3)', opacity: 0.7 }}
                        >
                          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                        </p>
                      </div>

                      {/* Unread dot */}
                      {!n.read && (
                        <div
                          className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5"
                          style={{ background: 'var(--accent)' }}
                        />
                      )}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div
              className="px-4 py-2.5"
              style={{ borderTop: '1px solid var(--glass-border)' }}
            >
              <button
                onClick={() => {
                  router.push('/dashboard/settings?tab=notifications')
                  setOpen(false)
                }}
                className="text-[11px] w-full text-center transition-colors duration-100"
                style={{ color: 'var(--text-3)' }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLElement).style.color = 'var(--text-1)'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLElement).style.color = 'var(--text-3)'
                }}
              >
                Notification settings
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
