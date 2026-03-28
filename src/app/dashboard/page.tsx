'use client'

import { useState, useEffect, useRef, startTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Zap, Loader2, LayoutDashboard, GripVertical, Sparkles, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useWidgetConfig } from '@/hooks/useWidgetConfig'
import { getWidgetDef } from '@/lib/widgets'
import { WidgetGallery } from '@/components/dashboard/WidgetGallery'
import { AnimatedCard } from '@/components/ui/AnimatedCard'

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
        opacity: isDragOver ? 0.5 : 1,
        transition: 'opacity 150ms ease',
        outline: isDragOver ? '2px solid rgba(124,58,237,0.50)' : 'none',
        outlineOffset: isDragOver ? '3px' : '0',
        borderRadius: 24,
      }}
    >
      {/* Drag handle */}
      <div
        className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity duration-150 p-1.5 rounded-xl"
        style={{
          background: 'rgba(124,58,237,0.12)',
          border: '1px solid rgba(124,58,237,0.22)',
        }}
      >
        <GripVertical size={11} style={{ color: 'var(--text-3)' }} />
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

  const dragIdRef   = useRef<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)

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

  const handleDragStart = (id: string) => { dragIdRef.current = id }
  const handleDragOver = (_e: React.DragEvent, id: string) => {
    if (dragIdRef.current && dragIdRef.current !== id) setDragOver(id)
  }
  const handleDrop = (targetId: string) => {
    const sourceId = dragIdRef.current
    if (!sourceId || sourceId === targetId) {
      dragIdRef.current = null
      setDragOver(null)
      return
    }
    startTransition(() => {
      const order   = [...config.order]
      const fromIdx = order.indexOf(sourceId)
      const toIdx   = order.indexOf(targetId)
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
      {/* ── WOW Moment Overlay ─────────────────────────────────── */}
      <AnimatePresence>
        {!wowDone && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
            className="fixed inset-0 z-[200] flex flex-col items-center justify-center"
            style={{ background: 'var(--bg-base)' }}
          >
            {/* Ambient orbs in overlay */}
            <div
              className="absolute pointer-events-none"
              style={{
                top: '-20%', left: '-10%',
                width: '60vw', height: '60vh',
                background: 'radial-gradient(circle, rgba(255,106,61,0.14) 0%, transparent 65%)',
                filter: 'blur(80px)',
                borderRadius: '50%',
              }}
            />
            <div
              className="absolute pointer-events-none"
              style={{
                bottom: '-20%', right: '-10%',
                width: '60vw', height: '60vh',
                background: 'radial-gradient(circle, rgba(124,58,237,0.14) 0%, transparent 65%)',
                filter: 'blur(80px)',
                borderRadius: '50%',
              }}
            />
            <div className="relative z-10 flex flex-col items-center">
              {/* Logo */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-center gap-3 mb-8"
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #ff6a3d 0%, #7c3aed 100%)',
                    boxShadow: '0 0 32px rgba(124,58,237,0.50), 0 4px 16px rgba(0,0,0,0.4)',
                  }}
                >
                  <Zap size={22} className="text-white" strokeWidth={2.5} />
                </div>
                <span className="font-inter text-4xl font-bold tracking-tight text-gradient-vivid">
                  ARIA
                </span>
              </motion.div>
              <WowTypewriter text={wowText} />
              <div className="mt-8 flex gap-2 justify-center">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full typing-dot"
                    style={{ background: 'var(--accent-orange, var(--accent))' }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Dashboard ─────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: wowDone ? 1 : 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex flex-col h-full"
      >
        {/* ── AI Command Strip ─────────────────────────────────── */}
        <div className="relative px-6 py-5 overflow-hidden shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          {/* Gradient ambient behind header */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(135deg, rgba(255,106,61,0.06) 0%, rgba(124,58,237,0.04) 40%, transparent 70%)',
            }}
          />
          {/* Bottom gradient line */}
          <div
            className="absolute bottom-0 left-0 right-0 h-px pointer-events-none"
            style={{
              background: 'linear-gradient(90deg, rgba(255,106,61,0.40), rgba(124,58,237,0.30), transparent 70%)',
            }}
          />

          <div className="flex items-center justify-between relative">
            {/* Left: ARIA command message */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                {/* Pulsing gradient dot */}
                <span
                  className="w-1.5 h-1.5 rounded-full pulse-violet shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, #ff6a3d, #7c3aed)',
                    boxShadow: '0 0 8px rgba(124,58,237,0.60)',
                  }}
                />
                <span
                  className="text-[9px] tracking-[2.5px] uppercase font-semibold"
                  style={{
                    background: 'linear-gradient(135deg, var(--accent-orange, #ff6a3d), var(--accent-purple, #7c3aed))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  ARIA · Command
                </span>
              </div>
              <div className="flex items-start gap-1">
                <p className="text-[15px] font-medium max-w-lg leading-snug" style={{ color: 'var(--text-1)' }}>
                  {commandDisplayed}
                  {!commandDone && (
                    <span
                      className="inline-block w-0.5 h-4 ml-0.5 animate-pulse align-middle rounded-full"
                      style={{ background: 'var(--accent-orange, var(--accent))' }}
                    />
                  )}
                </p>
              </div>
              <p className="text-[11px] mt-1.5 font-medium" style={{ color: 'var(--text-3)' }}>{today}</p>
            </div>

            {/* Right: Action buttons */}
            <div className="flex items-center gap-2">
              {/* Customize button */}
              <button
                onClick={() => setGalleryOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 text-[11px] font-medium transition-all duration-150"
                style={{
                  borderRadius: 9999,
                  border: '1px solid var(--border)',
                  color: 'var(--text-2)',
                  background: 'transparent',
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement
                  el.style.borderColor = 'rgba(124,58,237,0.40)'
                  el.style.color = 'var(--text-1)'
                  el.style.background = 'rgba(124,58,237,0.07)'
                  el.style.boxShadow = '0 0 12px rgba(124,58,237,0.15)'
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement
                  el.style.borderColor = 'var(--border)'
                  el.style.color = 'var(--text-2)'
                  el.style.background = 'transparent'
                  el.style.boxShadow = ''
                }}
              >
                <LayoutDashboard size={12} />
                Customize
              </button>

              {/* Focus Now CTA — only when critical */}
              {critical > 0 && (
                <Link href="/dashboard/inbox?filter=critical">
                  <button
                    className="flex items-center gap-2 px-4 py-2 text-[12px] font-semibold text-white transition-all duration-150"
                    style={{
                      borderRadius: 9999,
                      background: 'linear-gradient(135deg, #ff6a3d 0%, #7c3aed 100%)',
                      boxShadow: '0 0 20px rgba(124,58,237,0.35), 0 4px 12px rgba(255,106,61,0.25)',
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLElement
                      el.style.boxShadow = '0 0 28px rgba(124,58,237,0.50), 0 4px 16px rgba(255,106,61,0.35)'
                      el.style.transform = 'translateY(-1px) scale(1.02)'
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLElement
                      el.style.boxShadow = '0 0 20px rgba(124,58,237,0.35), 0 4px 12px rgba(255,106,61,0.25)'
                      el.style.transform = ''
                    }}
                  >
                    <Sparkles size={12} />
                    Focus now
                    <ArrowRight size={11} />
                  </button>
                </Link>
              )}

              {/* AI Briefing button */}
              <button
                onClick={() => briefingMutation.mutate()}
                disabled={briefingMutation.isPending}
                className="flex items-center gap-2 px-3.5 py-2 text-[11px] font-medium transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  borderRadius: 9999,
                  border: '1px solid rgba(124,58,237,0.28)',
                  color: 'var(--text-2)',
                  background: 'rgba(124,58,237,0.07)',
                }}
                onMouseEnter={(e) => {
                  if (briefingMutation.isPending) return
                  const el = e.currentTarget as HTMLElement
                  el.style.borderColor = 'rgba(124,58,237,0.50)'
                  el.style.color = 'var(--text-1)'
                  el.style.background = 'rgba(124,58,237,0.12)'
                  el.style.boxShadow = '0 0 14px rgba(124,58,237,0.20)'
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement
                  el.style.borderColor = 'rgba(124,58,237,0.28)'
                  el.style.color = 'var(--text-2)'
                  el.style.background = 'rgba(124,58,237,0.07)'
                  el.style.boxShadow = ''
                }}
              >
                {briefingMutation.isPending ? (
                  <Loader2 size={12} className="animate-spin" style={{ color: 'var(--accent-purple, #7c3aed)' }} />
                ) : (
                  <Zap size={12} style={{ color: 'var(--accent-purple, #7c3aed)' }} />
                )}
                AI Briefing
              </button>
            </div>
          </div>
        </div>

        {/* ── 12-column Widget Grid ─────────────────────────────── */}
        <div
          className="flex-1 overflow-y-auto p-4 md:p-6"
          onDragEnd={() => { dragIdRef.current = null; setDragOver(null) }}
        >
          {config.order.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-24 gap-5">
              <div
                className="w-20 h-20 rounded-3xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,106,61,0.10), rgba(124,58,237,0.12))',
                  border: '1px solid rgba(124,58,237,0.20)',
                  boxShadow: '0 0 32px rgba(124,58,237,0.12)',
                }}
              >
                <LayoutDashboard size={28} style={{ color: 'var(--accent-purple, #7c3aed)' }} />
              </div>
              <div className="text-center">
                <p className="text-[15px] font-semibold mb-1.5" style={{ color: 'var(--text-1)' }}>
                  Your dashboard is empty
                </p>
                <p className="text-[12px]" style={{ color: 'var(--text-3)' }}>
                  Add widgets to build your perfect AI command center
                </p>
              </div>
              <button
                onClick={() => setGalleryOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-[13px] font-semibold transition-all"
                style={{
                  background: 'linear-gradient(135deg, #ff6a3d, #7c3aed)',
                  boxShadow: '0 0 20px rgba(124,58,237,0.35)',
                }}
              >
                <Sparkles size={14} />
                Add Widgets
              </button>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(12, 1fr)',
                gap: '18px',
              }}
            >
              {config.order.map((id, widgetIndex) => {
                const def       = getWidgetDef(id)
                const Component = WIDGET_MAP[id]
                if (!def || !Component) return null
                const colSpan = SIZE_COLS[def.size] ?? 4

                return (
                  <AnimatedCard
                    key={id}
                    index={widgetIndex}
                    style={{ gridColumn: `span ${colSpan}` }}
                  >
                    <DraggableWidget
                      id={id}
                      colSpan={colSpan}
                      isDragOver={dragOver === id}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                    >
                      <Component />
                    </DraggableWidget>
                  </AnimatedCard>
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
    <p className="text-[15px] text-center max-w-sm leading-relaxed" style={{ color: 'var(--text-1)' }}>
      {displayed}
      {displayed.length < text.length && (
        <span
          className="inline-block w-0.5 h-4 ml-0.5 animate-pulse align-middle rounded-full"
          style={{ background: 'var(--accent-orange, var(--accent))' }}
        />
      )}
    </p>
  )
}
