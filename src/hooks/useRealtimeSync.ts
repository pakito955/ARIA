'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useEmailCache } from '@/lib/store'
import { emailKeys } from '@/lib/queryClient'
import type { UnifiedEmail } from '@/types'

export type ConnectionQuality = 'good' | 'poor' | 'disconnected'

export interface RealtimeSyncResult {
  isConnected: boolean
  lastSync: Date | null
  connectionQuality: ConnectionQuality
}

// Heartbeat thresholds
const HEARTBEAT_GOOD_MS = 35_000  // expect heartbeat every ~30s
const HEARTBEAT_POOR_MS = 70_000  // two missed → poor

// Exponential backoff
const BACKOFF_INITIAL_MS = 1_000
const BACKOFF_MAX_MS = 30_000

function nextBackoff(current: number): number {
  return Math.min(current * 2, BACKOFF_MAX_MS)
}

export function useRealtimeSync(): RealtimeSyncResult {
  const qc = useQueryClient()
  const cacheStore = useEmailCache

  const [isConnected, setIsConnected] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>('disconnected')

  const esRef = useRef<EventSource | null>(null)
  const backoffRef = useRef(BACKOFF_INITIAL_MS)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const heartbeatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  const clearTimers = useCallback(() => {
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
    if (heartbeatTimerRef.current) clearTimeout(heartbeatTimerRef.current)
  }, [])

  const resetHeartbeatTimer = useCallback(() => {
    if (heartbeatTimerRef.current) clearTimeout(heartbeatTimerRef.current)

    heartbeatTimerRef.current = setTimeout(() => {
      if (!mountedRef.current) return
      setConnectionQuality('poor')

      heartbeatTimerRef.current = setTimeout(() => {
        if (!mountedRef.current) return
        setConnectionQuality('disconnected')
      }, HEARTBEAT_POOR_MS - HEARTBEAT_GOOD_MS)
    }, HEARTBEAT_GOOD_MS)
  }, [])

  const handleSseEvent = useCallback(
    (type: string, data: unknown) => {
      const { handleEmailNew, handleEmailUpdated, handleEmailDeleted, handleStatsUpdate } =
        cacheStore.getState()

      switch (type) {
        case 'email:new':
          handleEmailNew(data as UnifiedEmail)
          qc.invalidateQueries({ queryKey: emailKeys.all })
          break
        case 'email:updated':
          handleEmailUpdated(data as UnifiedEmail)
          qc.invalidateQueries({ queryKey: emailKeys.detail((data as UnifiedEmail).id) })
          break
        case 'email:deleted':
          handleEmailDeleted(data as string)
          qc.invalidateQueries({ queryKey: emailKeys.all })
          break
        case 'stats:update':
          handleStatsUpdate(data as { unread: number; critical: number; tasks: number; waiting: number })
          qc.setQueryData(emailKeys.stats, data)
          break
        case 'heartbeat':
          setConnectionQuality('good')
          resetHeartbeatTimer()
          break
      }
      setLastSync(new Date())
    },
    [qc, cacheStore, resetHeartbeatTimer]
  )

  const connect = useCallback(() => {
    if (!mountedRef.current) return
    esRef.current?.close()
    esRef.current = null

    const es = new EventSource('/api/emails/stream')
    esRef.current = es

    es.onopen = () => {
      if (!mountedRef.current) return
      setIsConnected(true)
      setConnectionQuality('good')
      backoffRef.current = BACKOFF_INITIAL_MS
      resetHeartbeatTimer()
    }

    es.onerror = () => {
      if (!mountedRef.current) return
      setIsConnected(false)
      setConnectionQuality('disconnected')
      es.close()
      esRef.current = null
      clearTimers()

      const delay = backoffRef.current
      backoffRef.current = nextBackoff(delay)
      reconnectTimerRef.current = setTimeout(connect, delay)
    }

    // Generic `data: {...}` messages
    es.onmessage = (event) => {
      if (!mountedRef.current) return
      try {
        const payload = JSON.parse(event.data)
        if (payload.type === 'reconnect') {
          // Server requesting client to reconnect
          es.close()
          esRef.current = null
          reconnectTimerRef.current = setTimeout(connect, 1000)
          return
        }
        handleSseEvent(payload.type, payload.data)
      } catch { /* malformed */ }
    }

    // Named event listeners for typed SSE
    const addListener = (name: string) => {
      es.addEventListener(name, (event: MessageEvent) => {
        if (!mountedRef.current) return
        try {
          const data = JSON.parse(event.data)
          handleSseEvent(name, data)
        } catch { /* malformed */ }
      })
    }

    addListener('email:new')
    addListener('email:updated')
    addListener('email:deleted')
    addListener('stats:update')
    addListener('heartbeat')
  }, [handleSseEvent, resetHeartbeatTimer, clearTimers])

  useEffect(() => {
    mountedRef.current = true
    connect()

    return () => {
      mountedRef.current = false
      clearTimers()
      esRef.current?.close()
      esRef.current = null
    }
  }, [connect, clearTimers])

  return { isConnected, lastSync, connectionQuality }
}
