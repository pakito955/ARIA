'use client'

import { useState, useEffect, useRef, startTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Zap, Loader2, LayoutDashboard, GripVertical } from 'lucide-react'
import Link from 'next/link'
import { useWidgetConfig } from '@/hooks/useWidgetConfig'
import { getWidgetDef } from '@/lib/widgets'
import { WidgetGallery } from '@/components/dashboard/WidgetGallery'

// Widget components
import { CriticalNowWidget } from '@/components/dashboard/widgets/CriticalNowWidget'
import { NextActionWidget } from '@/components/dashboard/widgets/NextActionWidget'
import { TodayTimelineWidget } from '@/components/dashboard/widgets/TodayTimelineWidget'
import { DailyScoreWidget } from '@/components/dashboard/widgets/DailyScoreWidget'
import { FollowupsWidget } from '@/components/dashboard/widgets/FollowupsWidget'
import { InvoicesWidget } from '@/components/dashboard/widgets/InvoicesWidget'
import { AiBriefingWidget } from '@/components/dashboard/widgets/AiBriefingWidget'
import { EmailVolumeWidget } from '@/components/dashboard/widgets/EmailVolumeWidget'
import { QuickActionsWidget } from '@/components/dashboard/widgets/QuickActionsWidget'
import { TopSendersWidget } from '@/components/dashboard/widgets/TopSendersWidget'
import { InboxProgressWidget } from '@/components/dashboard/widgets/InboxProgressWidget'
import { ResponseTimeWidget } from '@/components/dashboard/widgets/ResponseTimeWidget'

const WIDGET_MAP: Record<string, React.ComponentType> = {
  'critical-now':   CriticalNowWidget,
  'next-action':    NextActionWidget,
  'today-timeline': TodayTimelineWidget,
  'daily-score':    DailyScoreWidget,
  'followups':      FollowupsWidget,
  'invoices':       InvoicesWidget,
  'ai-briefing':    AiBriefingWidget,
  'email-volume':   EmailVolumeWidget,
  'quick-actions':  QuickActionsWidget,
  'top-senders':    TopSendersWidget,
  'inbox-progress': InboxProgressWidget,
  'response-time':  ResponseTimeWidget,
}

// Map widget size to 12-col span
const SIZE_COLS: Record<string, number> = {
  '1/3': 4,
  '2/3': 8,
  'full': 12,
}

// ── Typewriter hook ───────────────────────────────────────────────────────────

function useTypewriter(text: string, speed = 28) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!text) return
    setDisplayed('')
    setDone(false)
    let i = 0
    const id = setInterval(() => {
      setDisplayed(text.slice(0, i + 1))
      i++
      if (i >= text.length) {
        clearInterval(id)
        setDone(true)
      }
    }, speed)
    return () => clearInterval(id)
  }, [text, speed])

  return { displayed, done }
}

// ── Draggable widget wrapper ──────────────────────────────────────────────────

function DraggableWidget({
  id,
  colSpan,
  isDragOver,
  onDragStart,
  onDragOver,
  onDrop,
  children,
}: {
  id: string
  colSpan: number
  isDragOver: boolean
  onDragStart: (id: string) => void
  onDragOver: (e: React.DragEvent, id: string) => void
  onDrop: (id: string) => void
  children: React.ReactNode
}) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        // Suppress ghost image — use invisible element
        const ghost = document.createElement('div')
        ghost.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px'
        document.body.appendChild(ghost)
        e.dataTransfer.setDragImage(ghost, 0, 0)
        setTimeout(() => document.body.removeChild(ghost), 0)
        onDragStart(id)
      }}
      onDragOver={(e) => {
        e.preventDefault()
        onDragOver(e, id)
      }}
      onDrop={(e) => {
        e.preventDefault()
        onDrop(id)
      }}
      className="group relative"
      style={{
        gridColumn: `span ${colSpan}`,
        opacity: isDragOver ? 0.5 : 1,
        transition: 'opacity 150ms ease',
        outline: isDragOver ? '2px solid var(--accent)' : 'none',
        borderRadius: 16,
      }}
    >
      {/* Drag handle — visible on hover */}
      <div
        className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity duration-150 p-1 rounded-lg"
        style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)' }}
      >
        <GripVertical size={12} style={{ color: 'var(--text-3)' }} />
      </div>

      {children}
    </div>
  )
}

// ── Dashboard page ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [wowDone, setWowDone] = useState(false)
  const [wowText, setWowText] = useState('')
  const [galleryOpen, setGalleryOpen] = useState(false)
  const { config, reorder } = useWidgetConfig()

  // Drag state
  const dragIdRef   = useRef<string | null>(null)
  const [dragOver, setDragOver]   = useState<string | null>(null)

  const { data: statsData } = useQuery({
    queryKey: ['sidebar-stats'],
    queryFn: async () => {
      const res = await fetch('/api/stats')
      if (!res.ok) return null
      return res.json()
    },
    staleTime: 30_000,
  })

  const { refetch: refetchBriefing } = useQuery({
    queryKey: ['briefing', 'today'],
    queryFn: async () => {
      const res = await fetch('/api/ai/briefing')
      return res.json()
    },
    staleTime: 60_000 * 5,
  })

  const briefingMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/ai/briefing', { method: 'POST' })
      return res.json()
    },
    onSuccess: () => refetchBriefing(),
  })

  // WOW splash — only on first visit per session
  useEffect(() => {
    const shown = sessionStorage.getItem('aria-wow-shown')
    if (shown) { setWowDone(true); return }
    const timer = setTimeout(() => {
      setWowDone(true)
      sessionStorage.setItem('aria-wow-shown', '1')
    }, 1800)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (sessionStorage.getItem('aria-wow-shown')) return
    const critical = statsData?.critical ?? 0
    const unread   = statsData?.unread ?? 0
    const tasks    = statsData?.tasks ?? 0
    setWowText(
      critical > 0
        ? `Analyzing your inbox… ${critical} critical item${critical > 1 ? 's' : ''} need${critical === 1 ? 's' : ''} your attention today.`
        : unread > 0
        ? `Analyzing your inbox… ${unread} unread message${unread > 1 ? 's' : ''}. Everything looks manageable.`
        : `Your inbox is clear. ${tasks} task${tasks > 1 ? 's' : ''} pending. Good morning.`
    )
  }, [statsData])

  const critical = statsData?.critical ?? 0
  const unread   = statsData?.unread ?? 0
  const commandMsg =
    critical > 0
      ? `You have ${critical} critical item${critical > 1 ? 's' : ''} requiring action today.`
      : unread > 0
      ? `${unread} unread messages. Your inbox is under control.`
      : 'Inbox clear. ARIA is monitoring everything for you.'

  const { displayed: commandDisplayed, done: commandDone } = useTypewriter(wowDone ? commandMsg : '', 30)
  const today = format(new Date(), "EEEE, d. MMMM")

  // Drag handlers
  const handleDragStart = (id: string) => {
    dragIdRef.current = id
  }

  const handleDragOver = (_e: React.DragEvent, id: string) => {
    if (dragIdRef.current && dragIdRef.current !== id) {
      setDragOver(id)
    }
  }

  const handleDrop = (targetId: string) => {
    const sourceId = dragIdRef.current
    if (!sourceId || sourceId === targetId) {
      dragIdRef.current = null
      setDragOver(null)
      return
    }
    startTransition(() => {
      const order    = [...config.order]
      const fromIdx  = order.indexOf(sourceId)
      const toIdx    = order.indexOf(targetId)
      if (fromIdx === -1 || toIdx === -1) return
      order.splice(fromIdx, 1)
      order.splice(toIdx, 0, sourceId)
      reorder(order)
    })
    dragIdRef.current = null
    setDragOver(null)
  }

  return (
    <>
      {/* WOW Moment Overlay — Framer Motion on layout elements is allowed */}
      <AnimatePresence>
        {!wowDone && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[var(--bg-base)]"
          >
            <div className="relative">
              <div
                className="absolute inset-0 rounded-full blur-[80px] orb-float"
                style={{
                  background: 'radial-gradient(circle, var(--accent-subtle), transparent 70%)',
                  width: 400,
                  height: 400,
                  top: -180,
                  left: -190,
                }}
              />
              <div className="flex items-center gap-3 mb-8">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--accent)' }}
                >
                  <Zap size={18} className="text-white" />
                </div>
                <span className="font-cormorant text-4xl font-light tracking-widest">ARIA</span>
              </div>
              <WowTypewriter text={wowText} />
              <div className="mt-8 flex gap-2 justify-center">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] typing-dot" />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Dashboard */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: wowDone ? 1 : 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex flex-col h-full"
      >
        {/* AI Command Strip */}
        <div className="relative px-6 py-5 border-b border-[var(--border)] overflow-hidden shrink-0">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(135deg, rgba(242,78,30,0.055) 0%, transparent 50%)' }}
          />
          <div
            className="absolute bottom-0 left-0 right-0 h-px pointer-events-none"
            style={{ background: 'linear-gradient(90deg, var(--accent-subtle), transparent 60%)' }}
          />
          <div className="flex items-center justify-between relative">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] pulse-violet" />
                <span className="text-[9px] tracking-[2.5px] uppercase text-[var(--accent-text)]">
                  ARIA · Command
                </span>
              </div>
              <div className="flex items-start gap-1">
                <p className="text-[15px] text-[var(--text-1)] max-w-lg leading-snug">
                  {commandDisplayed}
                  {!commandDone && (
                    <span className="inline-block w-0.5 h-4 bg-[var(--accent)] ml-0.5 animate-pulse align-middle" />
                  )}
                </p>
              </div>
              <p className="text-[11px] text-[var(--text-3)] mt-1">{today}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setGalleryOpen(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border text-[11px] transition-colors duration-150"
                style={{ borderColor: 'var(--border)', color: 'var(--text-2)' }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement
                  el.style.borderColor = 'var(--accent)'
                  el.style.color = 'var(--text-1)'
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement
                  el.style.borderColor = 'var(--border)'
                  el.style.color = 'var(--text-2)'
                }}
              >
                <LayoutDashboard size={12} style={{ color: 'var(--accent-text)' }} />
                Customize
              </button>

              {critical > 0 && (
                <Link href="/dashboard/inbox?filter=critical">
                  <button
                    className="flex items-center gap-2 px-4 py-2 text-[12px] rounded-lg font-semibold text-white transition-opacity duration-150 hover:opacity-90"
                    style={{ background: 'var(--accent)' }}
                  >
                    Focus now
                  </button>
                </Link>
              )}

              <button
                onClick={() => briefingMutation.mutate()}
                disabled={briefingMutation.isPending}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border text-[11px] transition-colors duration-150 disabled:opacity-50"
                style={{ borderColor: 'var(--border)', color: 'var(--text-2)' }}
                onMouseEnter={(e) => {
                  if (briefingMutation.isPending) return
                  const el = e.currentTarget as HTMLElement
                  el.style.borderColor = 'var(--accent)'
                  el.style.color = 'var(--text-1)'
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement
                  el.style.borderColor = 'var(--border)'
                  el.style.color = 'var(--text-2)'
                }}
              >
                {briefingMutation.isPending ? (
                  <Loader2 size={12} className="animate-spin" style={{ color: 'var(--accent-text)' }} />
                ) : (
                  <Zap size={12} style={{ color: 'var(--accent-text)' }} />
                )}
                AI Briefing
              </button>
            </div>
          </div>
        </div>

        {/* 12-column Widget Grid */}
        <div
          className="flex-1 overflow-y-auto p-3 md:p-5"
          onDragEnd={() => { dragIdRef.current = null; setDragOver(null) }}
        >
          {config.order.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
              >
                <LayoutDashboard size={24} style={{ color: 'var(--text-3)' }} />
              </div>
              <div className="text-center">
                <p className="text-[14px] font-medium mb-1" style={{ color: 'var(--text-2)' }}>
                  No widgets active
                </p>
                <p className="text-[12px]" style={{ color: 'var(--text-3)' }}>
                  Click Customize to add widgets to your dashboard
                </p>
              </div>
              <button
                onClick={() => setGalleryOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-[12px] font-medium"
                style={{ background: 'var(--accent)' }}
              >
                <LayoutDashboard size={13} />
                Open Widget Gallery
              </button>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(12, 1fr)',
                gap: '16px',
              }}
            >
              {config.order.map((id) => {
                const def       = getWidgetDef(id)
                const Component = WIDGET_MAP[id]
                if (!def || !Component) return null
                const colSpan = SIZE_COLS[def.size] ?? 4

                return (
                  <DraggableWidget
                    key={id}
                    id={id}
                    colSpan={colSpan}
                    isDragOver={dragOver === id}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    <Component />
                  </DraggableWidget>
                )
              })}
            </div>
          )}
        </div>
      </motion.div>

      {/* Widget Gallery modal */}
      <WidgetGallery open={galleryOpen} onClose={() => setGalleryOpen(false)} />
    </>
  )
}

function WowTypewriter({ text }: { text: string }) {
  const { displayed } = useTypewriter(text, 35)
  return (
    <p className="text-[15px] text-[var(--text-1)] text-center max-w-sm leading-relaxed">
      {displayed}
      {displayed.length < text.length && (
        <span className="inline-block w-0.5 h-4 bg-[var(--accent)] ml-0.5 animate-pulse align-middle" />
      )}
    </p>
  )
}
