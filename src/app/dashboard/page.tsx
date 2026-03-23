'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Zap, Loader2, LayoutDashboard } from 'lucide-react'
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
  'critical-now': CriticalNowWidget,
  'next-action': NextActionWidget,
  'today-timeline': TodayTimelineWidget,
  'daily-score': DailyScoreWidget,
  'followups': FollowupsWidget,
  'invoices': InvoicesWidget,
  'ai-briefing': AiBriefingWidget,
  'email-volume': EmailVolumeWidget,
  'quick-actions': QuickActionsWidget,
  'top-senders': TopSendersWidget,
  'inbox-progress': InboxProgressWidget,
  'response-time': ResponseTimeWidget,
}

const COL_SPAN: Record<string, string> = {
  '1/3': 'md:col-span-1',
  '2/3': 'md:col-span-2',
  'full': 'md:col-span-3',
}

// Typewriter hook
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

export default function DashboardPage() {
  const [wowDone, setWowDone] = useState(false)
  const [wowText, setWowText] = useState('')
  const [galleryOpen, setGalleryOpen] = useState(false)
  const { config } = useWidgetConfig()

  const { data: statsData } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [emailsRes, tasksRes] = await Promise.all([
        fetch('/api/emails?limit=10&filter=all'),
        fetch('/api/tasks?status=TODO'),
      ])
      const emails = await emailsRes.json()
      const tasks = await tasksRes.json()
      return {
        unread: emails.data?.filter((e: any) => !e.isRead).length ?? 0,
        critical: emails.data?.filter((e: any) => e.analysis?.priority === 'CRITICAL').length ?? 0,
        tasks: tasks.data?.length ?? 0,
      }
    },
    staleTime: 30_000,
  })

  const { data: briefingData, refetch: refetchBriefing } = useQuery({
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

  // WOW splash screen
  useEffect(() => {
    const shown = sessionStorage.getItem('aria-wow-shown')
    if (shown) { setWowDone(true); return }
    const timer = setTimeout(() => {
      setWowDone(true)
      sessionStorage.setItem('aria-wow-shown', '1')
    }, 3200)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (sessionStorage.getItem('aria-wow-shown')) return
    const critical = statsData?.critical ?? 0
    const unread = statsData?.unread ?? 0
    const tasks = statsData?.tasks ?? 0
    const msg = critical > 0
      ? `Analyzing your inbox… ${critical} critical item${critical > 1 ? 's' : ''} need${critical === 1 ? 's' : ''} your attention today.`
      : unread > 0
      ? `Analyzing your inbox… ${unread} unread message${unread > 1 ? 's' : ''}. Everything looks manageable.`
      : `Your inbox is clear. ${tasks} task${tasks > 1 ? 's' : ''} pending. Good morning.`
    setWowText(msg)
  }, [statsData])

  const critical = statsData?.critical ?? 0
  const unread = statsData?.unread ?? 0
  const commandMsg = critical > 0
    ? `You have ${critical} critical item${critical > 1 ? 's' : ''} requiring action today.`
    : unread > 0
    ? `${unread} unread messages. Your inbox is under control.`
    : `Inbox clear. ARIA is monitoring everything for you.`

  const { displayed: commandDisplayed, done: commandDone } = useTypewriter(wowDone ? commandMsg : '', 30)
  const today = format(new Date(), "EEEE, d. MMMM")

  return (
    <>
      {/* WOW Moment Overlay */}
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
                style={{ background: 'radial-gradient(circle, var(--accent-subtle), transparent 70%)', width: 400, height: 400, top: -180, left: -190 }}
              />
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent)' }}>
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
            style={{ background: 'linear-gradient(135deg, var(--accent-subtle) 0%, transparent 60%)' }}
          />
          <div className="flex items-center justify-between relative">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] pulse-violet" />
                <span className="text-[9px] tracking-[2.5px] uppercase text-[var(--accent-text)]">ARIA · Command</span>
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
              {/* Customize button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setGalleryOpen(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] text-[var(--text-2)] text-[11px] hover:border-[var(--accent)] hover:text-[var(--text-1)] transition-all"
              >
                <LayoutDashboard size={12} className="text-[var(--accent-text)]" />
                Customize
              </motion.button>

              {critical > 0 && (
                <Link href="/dashboard/inbox?filter=critical">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-[12px] font-medium"
                  >
                    Focus now
                  </motion.button>
                </Link>
              )}

              <button
                onClick={() => briefingMutation.mutate()}
                disabled={briefingMutation.isPending}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] text-[var(--text-2)] text-[11px] hover:border-[var(--accent)] hover:text-[var(--text-1)] transition-all disabled:opacity-50"
              >
                {briefingMutation.isPending
                  ? <Loader2 size={12} className="animate-spin text-[var(--accent-text)]" />
                  : <Zap size={12} className="text-[var(--accent-text)]" />
                }
                AI Briefing
              </button>
            </div>
          </div>
        </div>

        {/* Widget Grid */}
        <div className="flex-1 overflow-y-auto p-3 md:p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 auto-rows-auto">
            <AnimatePresence mode="popLayout">
              {config.order.map((id, i) => {
                const def = getWidgetDef(id)
                const Component = WIDGET_MAP[id]
                if (!def || !Component) return null

                return (
                  <motion.div
                    key={id}
                    layout
                    initial={{ opacity: 0, scale: 0.96, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.94, y: -8 }}
                    transition={{ delay: i * 0.04, duration: 0.3, layout: { duration: 0.3 } }}
                    className={COL_SPAN[def.size]}
                  >
                    <Component />
                  </motion.div>
                )
              })}
            </AnimatePresence>

            {/* Empty state */}
            {config.order.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="md:col-span-3 flex flex-col items-center justify-center py-24 gap-4"
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                >
                  <LayoutDashboard size={24} className="text-[var(--text-3)]" />
                </div>
                <div className="text-center">
                  <p className="text-[14px] font-medium text-[var(--text-2)] mb-1">No widgets active</p>
                  <p className="text-[12px] text-[var(--text-3)]">Click Customize to add widgets to your dashboard</p>
                </div>
                <button
                  onClick={() => setGalleryOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-[12px] font-medium"
                >
                  <LayoutDashboard size={13} />
                  Open Widget Gallery
                </button>
              </motion.div>
            )}
          </div>
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
