'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, CheckCheck, X, Loader2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '@/lib/store'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

interface Notification {
  id: string
  type: string
  title: string
  body: string
  emailId?: string
  read: boolean
  createdAt: string
}

const TYPE_COLOR: Record<string, string> = {
  followup: 'var(--amber)',
  snooze:   'var(--accent)',
  rule:     '#10b981',
  system:   'var(--text-2)',
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const { setSelectedEmail } = useAppStore()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications')
      if (!res.ok) throw new Error('Failed to fetch notifications')
      return res.json()
    },
    refetchInterval: 30_000,
    staleTime: 20_000,
  })

  const markAllMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/notifications', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to mark as read')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const markOneMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notifications/${id}/read`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to mark as read')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const notifications: Notification[] = data?.data || []
  const unreadCount = data?.unreadCount || 0

  const handleNotificationClick = (notif: Notification) => {
    if (!notif.read) {
      markOneMutation.mutate(notif.id)
    }
    if (notif.emailId) {
      setSelectedEmail(notif.emailId)
      setOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'relative p-2 rounded-lg transition-all',
          open
            ? 'bg-[var(--accent-subtle)] text-[var(--accent-text)]'
            : 'text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--bg-hover)]'
        )}
      >
        <Bell size={16} strokeWidth={1.75} />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center px-1 rounded-full text-[9px] font-bold text-white"
            style={{ background: 'var(--accent)' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 top-10 w-80 rounded-2xl shadow-2xl z-50 overflow-hidden"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-2">
                <Bell size={13} style={{ color: 'var(--accent-text)' }} />
                <span className="text-[12px] font-medium" style={{ color: 'var(--text-1)' }}>
                  Notifications
                </span>
                {unreadCount > 0 && (
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                    style={{ background: 'var(--accent-subtle)', color: 'var(--accent-text)' }}
                  >
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllMutation.mutate()}
                    disabled={markAllMutation.isPending}
                    className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg transition-colors hover:text-[var(--text-1)]"
                    style={{ color: 'var(--text-3)' }}
                    title="Mark all as read"
                  >
                    <CheckCheck size={11} />
                    All read
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 rounded-lg transition-colors"
                  style={{ color: 'var(--text-3)' }}
                >
                  <X size={12} />
                </button>
              </div>
            </div>

            {/* Notifications list */}
            <div className="max-h-[360px] overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={16} className="animate-spin" style={{ color: 'var(--accent-text)' }} />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <Bell size={24} style={{ color: 'var(--border-medium)' }} />
                  <p className="text-[12px]" style={{ color: 'var(--text-3)' }}>No notifications</p>
                </div>
              ) : (
                <div className="py-1">
                  {notifications.map((notif) => (
                    <button
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={cn(
                        'w-full text-left px-4 py-3 transition-colors hover:bg-[var(--bg-hover)]',
                        !notif.read && 'bg-[var(--accent-subtle)]/20'
                      )}
                    >
                      <div className="flex items-start gap-2.5">
                        {/* Type dot */}
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5"
                          style={{ background: notif.read ? 'var(--border-medium)' : (TYPE_COLOR[notif.type] || 'var(--accent)') }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-medium truncate" style={{ color: notif.read ? 'var(--text-2)' : 'var(--text-1)' }}>
                            {notif.title}
                          </p>
                          <p className="text-[11px] mt-0.5 leading-snug" style={{ color: 'var(--text-3)' }}>
                            {notif.body}
                          </p>
                          <p className="text-[10px] mt-1" style={{ color: 'var(--text-3)' }}>
                            {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                        {!notif.read && (
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5"
                            style={{ background: 'var(--accent)' }}
                          />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
