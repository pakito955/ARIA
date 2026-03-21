'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ArrowRight, Zap, AlertCircle, CheckCircle2, Clock, TrendingUp, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { VoiceBriefing } from '@/components/VoiceBriefing'

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
  const wowRef = useRef(false)

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
        total: emails.total ?? 0,
        critical: emails.data?.filter((e: any) => e.analysis?.priority === 'CRITICAL').length ?? 0,
        tasks: tasks.data?.length ?? 0,
        criticalEmails: emails.data?.filter((e: any) => e.analysis?.priority === 'CRITICAL').slice(0, 3) ?? [],
        recentEmails: emails.data?.slice(0, 3) ?? [],
      }
    },
  })

  const { data: briefingData, refetch: refetchBriefing } = useQuery({
    queryKey: ['briefing', 'today'],
    queryFn: async () => {
      const res = await fetch('/api/ai/briefing')
      return res.json()
    },
  })

  const briefingMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/ai/briefing', { method: 'POST' })
      return res.json()
    },
    onSuccess: () => refetchBriefing(),
  })

  // WOW moment: show intro on first load
  useEffect(() => {
    if (wowRef.current) return
    wowRef.current = true
    const shown = sessionStorage.getItem('aria-wow-shown')
    if (shown) {
      setWowDone(true)
      return
    }

    const critical = statsData?.critical ?? 0
    const unread = statsData?.unread ?? 0
    const tasks = statsData?.tasks ?? 0

    const msg = critical > 0
      ? `Analyzing your inbox… ${critical} critical item${critical > 1 ? 's' : ''} need${critical === 1 ? 's' : ''} your attention today.`
      : unread > 0
      ? `Analyzing your inbox… ${unread} unread message${unread > 1 ? 's' : ''}. Everything looks manageable.`
      : `Your inbox is clear. ${tasks} task${tasks > 1 ? 's' : ''} pending. Good morning.`

    setWowText(msg)

    const timer = setTimeout(() => {
      setWowDone(true)
      sessionStorage.setItem('aria-wow-shown', '1')
    }, 3200)

    return () => clearTimeout(timer)
  }, [statsData])

  // AI command strip message
  const critical = statsData?.critical ?? 0
  const unread = statsData?.unread ?? 0
  const commandMsg = critical > 0
    ? `You have ${critical} critical item${critical > 1 ? 's' : ''} requiring action today.`
    : unread > 0
    ? `${unread} unread messages. Your inbox is under control.`
    : `Inbox clear. ARIA is monitoring everything for you.`

  const { displayed: commandDisplayed, done: commandDone } = useTypewriter(
    wowDone ? commandMsg : '',
    30
  )

  const today = format(new Date(), "EEEE, d. MMMM")

  const CALENDAR_EVENTS = [
    { time: '10:30', title: 'Team Standup', color: '#8b5cf6', note: 'In 45 min' },
    { time: '14:00', title: 'Investor Call', color: '#f59e0b', note: 'Zoom · 45 min' },
    { time: '15:00', title: 'Board Meeting', color: '#ef4444', note: 'Reply needed' },
    { time: '17:00', title: 'Weekly Review', color: '#10b981', note: 'ARIA scheduled' },
  ]

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
              {/* Glow orb */}
              <div
                className="absolute inset-0 rounded-full blur-[80px] orb-float"
                style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.15), transparent 70%)', width: 400, height: 400, top: -180, left: -190 }}
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
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] typing-dot"
                  />
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
        <div className="relative px-6 py-5 border-b border-[var(--border)] overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.06) 0%, transparent 60%)' }}
          />
          <div className="flex items-center justify-between relative">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] pulse-violet" />
                <span className="text-[9px] tracking-[2.5px] uppercase text-[var(--accent-text)]">ARIA · Command</span>
              </div>
              <div className="flex items-start gap-1">
                <p className="text-[15px] text-white/90 max-w-lg leading-snug">
                  {commandDisplayed}
                  {!commandDone && (
                    <span className="inline-block w-0.5 h-4 bg-[var(--accent)] ml-0.5 animate-pulse align-middle" />
                  )}
                </p>
              </div>
              <p className="text-[11px] text-[var(--text-3)] mt-1">{today}</p>
            </div>

            <div className="flex items-center gap-3">
              {critical > 0 && (
                <Link href="/dashboard/inbox?filter=critical">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-[12px] font-medium"
                  >
                    Focus now
                    <ArrowRight size={13} />
                  </motion.button>
                </Link>
              )}

              <button
                onClick={() => briefingMutation.mutate()}
                disabled={briefingMutation.isPending}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] text-[var(--text-2)] text-[11px] hover:border-[var(--accent)] hover:text-white transition-all disabled:opacity-50"
              >
                {briefingMutation.isPending ? (
                  <Loader2 size={12} className="animate-spin text-[var(--accent-text)]" />
                ) : (
                  <Zap size={12} className="text-[var(--accent-text)]" />
                )}
                AI Briefing
              </button>
            </div>
          </div>
        </div>

        {/* Bento Grid */}
        <div className="flex-1 overflow-y-auto p-3 md:p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4" style={{ gridTemplateRows: 'auto' }}>

            {/* Critical Now — spans 2/3 */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="md:col-span-2 card p-5 relative overflow-hidden"
            >
              <div
                className="absolute top-0 right-0 w-48 h-full pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at top right, rgba(239,68,68,0.05), transparent 70%)' }}
              />
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <AlertCircle size={14} className="text-[var(--red)]" />
                  <span className="text-[9px] tracking-[2px] uppercase text-[var(--red)]">Critical Now</span>
                </div>
                {critical > 0 && (
                  <span className="text-[9px] text-[var(--red)] px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.12)' }}>
                    {critical} item{critical > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {critical === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <CheckCircle2 size={28} className="text-[var(--green)] opacity-60" />
                  <p className="text-[12px] text-[var(--text-3)]">No critical items · You're on top of things</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {(statsData?.criticalEmails ?? []).map((email: any, i: number) => (
                    <motion.div
                      key={email.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.06 }}
                      className="flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer"
                      style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)' }}
                    >
                      <div className="w-1 h-8 rounded-full shrink-0" style={{ background: 'var(--red)' }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12.5px] font-medium text-[var(--text-1)] truncate">
                          {email.fromName || email.fromEmail?.split('@')[0]}
                        </p>
                        <p className="text-[11px] text-[var(--text-2)] truncate">
                          {email.analysis?.summary || email.subject}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href="/dashboard/inbox">
                          <button className="px-2.5 py-1 rounded bg-[var(--accent)] text-white text-[10px] font-medium hover:bg-[var(--accent)] transition-colors">
                            Reply
                          </button>
                        </Link>
                        <button className="px-2.5 py-1 rounded border border-[var(--border)] text-[var(--text-2)] text-[10px] hover:border-white/20 transition-colors">
                          Snooze
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Stats row at bottom */}
              <div className="flex items-center gap-5 mt-5 pt-4 border-t border-[var(--border)]">
                {[
                  { n: statsData?.unread ?? 0, label: 'Unread', color: '#8b5cf6' },
                  { n: statsData?.tasks ?? 0, label: 'Tasks', color: '#10b981' },
                  { n: statsData?.critical ?? 0, label: 'Critical', color: '#ef4444' },
                ].map((s, i) => (
                  <div key={i} className="text-center">
                    <p className="font-cormorant text-3xl font-light" style={{ color: s.color }}>{s.n}</p>
                    <p className="text-[9px] uppercase tracking-[0.8px] text-[var(--text-3)]">{s.label}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Next Best Action — 1/3 */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card p-5 relative overflow-hidden flex flex-col"
            >
              <div
                className="absolute bottom-0 right-0 w-32 h-32 pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.08), transparent 70%)' }}
              />
              <div className="flex items-center gap-2 mb-4">
                <Zap size={13} className="text-[var(--accent-text)]" />
                <span className="text-[9px] tracking-[2px] uppercase text-[var(--accent-text)]">Next Best Action</span>
              </div>

              <div className="flex-1">
                {briefingData?.data?.content ? (
                  <p className="text-[12px] text-[var(--text-1)] leading-relaxed line-clamp-6">
                    {briefingData.data.content.replace(/<[^>]*>/g, '').slice(0, 200)}
                  </p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[12px] text-[var(--text-2)] leading-relaxed">
                      {critical > 0
                        ? `Reply to ${statsData?.criticalEmails?.[0]?.fromName || 'critical sender'} — marked high priority.`
                        : 'Your inbox is under control. Review pending tasks or schedule tomorrow.'}
                    </p>
                  </div>
                )}
              </div>

              <Link href={critical > 0 ? '/dashboard/inbox?filter=critical' : '/dashboard/tasks'}>
                <motion.button
                  whileHover={{ x: 3 }}
                  className="flex items-center gap-1.5 text-[11px] text-[var(--accent-text)] mt-4 group"
                >
                  Open →
                </motion.button>
              </Link>
            </motion.div>

            {/* Today Timeline — 1/3 */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="card p-5"
            >
              <div className="flex items-center gap-2 mb-4">
                <Clock size={13} className="text-[var(--amber)]" />
                <span className="text-[9px] tracking-[2px] uppercase text-[var(--amber)]">Today Timeline</span>
              </div>

              <div className="relative pl-4">
                <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-white/[0.06]" />
                <div className="space-y-3.5">
                  {CALENDAR_EVENTS.map((ev, i) => {
                    const isPast = parseInt(ev.time) < new Date().getHours()
                    return (
                      <div key={i} className={cn('relative transition-opacity', isPast && 'opacity-35')}>
                        <div
                          className="absolute -left-[17px] top-1.5 w-2 h-2 rounded-full border-2 border-[var(--bg-card)]"
                          style={{ background: ev.color }}
                        />
                        <p className="text-[9px] font-mono text-[var(--text-3)] mb-0.5">{ev.time}</p>
                        <p className="text-[12px] text-[var(--text-1)]">{ev.title}</p>
                        <p className="text-[10px]" style={{ color: ev.color }}>{ev.note}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </motion.div>

            {/* AI Insight — 2/3 */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="md:col-span-2 card p-5 relative overflow-hidden"
            >
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.04) 0%, transparent 50%)' }}
              />

              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={13} className="text-[var(--accent-text)]" />
                <span className="text-[9px] tracking-[2px] uppercase text-[var(--accent-text)]">AI Briefing</span>
                {briefingMutation.isPending && (
                  <div className="flex gap-1 ml-2">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] typing-dot" />
                    ))}
                  </div>
                )}
                {briefingData?.data?.content && (
                  <div className="ml-auto">
                    <VoiceBriefing text={briefingData.data.content} />
                  </div>
                )}
              </div>

              <div
                className="text-[12.5px] leading-[1.85] text-[var(--text-1)] max-h-[120px] overflow-hidden"
                dangerouslySetInnerHTML={{
                  __html: briefingData?.data?.content ||
                    '<span style="color:var(--text-3)">Click <b style="color:var(--accent-text)">AI Briefing</b> to generate your morning analysis. ARIA will summarize all critical emails, pending tasks, and suggest actions for the day.</span>'
                }}
              />
            </motion.div>
          </div>
        </div>
      </motion.div>
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
