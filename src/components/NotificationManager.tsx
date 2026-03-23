'use client'

import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'

export function NotificationManager() {
  const permissionRequested = useRef(false)
  const notifiedIds = useRef(new Set<string>())

  // Request notification permission on mount
  useEffect(() => {
    if (permissionRequested.current) return
    permissionRequested.current = true

    if ('Notification' in window && Notification.permission === 'default') {
      // Small delay so it doesn't feel intrusive
      setTimeout(() => {
        Notification.requestPermission()
      }, 5000)
    }
  }, [])

  // Register service worker for PWA
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // SW registration failed — silent fail
      })
    }
  }, [])

  // Watch for critical emails
  const { data } = useQuery({
    queryKey: ['critical-emails-notify'],
    queryFn: async () => {
      const res = await fetch('/api/emails?filter=critical&limit=10')
      return res.json()
    },
    refetchInterval: 60_000,
    staleTime: 60_000,
  })

  useEffect(() => {
    if (!data?.data || Notification.permission !== 'granted') return

    const criticalEmails = data.data.filter((e: any) =>
      e.analysis?.priority === 'CRITICAL' && !e.isRead
    )

    for (const email of criticalEmails) {
      if (notifiedIds.current.has(email.id)) continue
      notifiedIds.current.add(email.id)

      const hoursAgo = Math.floor(
        (Date.now() - new Date(email.receivedAt).getTime()) / (1000 * 60 * 60)
      )

      if (hoursAgo >= 24) {
        new Notification('ARIA · Urgent', {
          body: `${email.fromName || email.fromEmail} is waiting ${hoursAgo}h for your response.\n"${email.subject}"`,
          icon: '/icon-192.png',
          tag: `aria-critical-${email.id}`,
          requireInteraction: true,
        })
      }
    }
  }, [data])

  return null // invisible component
}
