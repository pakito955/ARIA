'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery, useMutation } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Loader2, Zap, RefreshCw } from 'lucide-react'

export default function DashboardPage() {
  const [streamedText, setStreamedText] = useState('')

  const { data: statsData } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [emailsRes, tasksRes] = await Promise.all([
        fetch('/api/emails?limit=5&filter=all'),
        fetch('/api/tasks?status=TODO'),
      ])
      const emails = await emailsRes.json()
      const tasks = await tasksRes.json()
      return {
        unread: emails.data?.filter((e: any) => !e.isRead).length ?? 0,
        total: emails.total ?? 0,
        critical: emails.data?.filter((e: any) => e.analysis?.priority === 'CRITICAL').length ?? 0,
        tasks: tasks.data?.length ?? 0,
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

  const stats = [
    { n: statsData?.unread ?? 0, label: 'Novih emailova', color: '#f4a0b5' },
    { n: statsData?.tasks ?? 0, label: 'Zadataka', color: '#86efac' },
    { n: statsData?.critical ?? 0, label: 'Kritičnih', color: '#f4a0b5' },
    { n: 0, label: 'Čeka odgovor', color: '#e8c97a' },
  ]

  const today = format(new Date(), "EEEE, d. MMMM yyyy")

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between px-6 py-5 border-b border-white/[0.055]">
        <div>
          <h1 className="font-cormorant text-3xl font-light tracking-tight">
            Dobro jutro.
          </h1>
          <p className="text-[11px] text-[#8888aa] mt-1">{today}</p>
        </div>
        <button
          onClick={() => briefingMutation.mutate()}
          disabled={briefingMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 border border-[#e8c97a]/30 text-[#e8c97a] text-[11px] tracking-[1.5px] uppercase rounded hover:bg-[#e8c97a]/[0.06] transition-all disabled:opacity-50"
        >
          {briefingMutation.isPending ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Zap size={12} />
          )}
          AI Briefing
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          {stats.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-[#0d0d1a] border border-white/[0.055] rounded p-3.5 hover:border-white/[0.11] transition-colors"
            >
              <p className="font-cormorant text-4xl font-light" style={{ color: s.color }}>
                {s.n}
              </p>
              <p className="text-[9px] uppercase tracking-[0.8px] text-[#8888aa] mt-1">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* ARIA Briefing card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[#0d0d1a] border border-white/[0.055] border-l-2 border-l-[#e8c97a] rounded p-5 relative overflow-hidden"
        >
          <div
            className="absolute top-0 right-0 w-40 h-full pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at right, rgba(232,201,122,.04), transparent 70%)' }}
          />

          <div className="flex items-center gap-2 mb-4">
            {briefingMutation.isPending ? (
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div key={i} className={`w-1.5 h-1.5 rounded-full bg-[#e8c97a] typing-dot`} />
                ))}
              </div>
            ) : (
              <span className="text-[#e8c97a] text-sm">⚡</span>
            )}
            <span className="text-[8px] tracking-[2.5px] uppercase text-[#e8c97a]">
              ARIA · Morning Analysis
            </span>
          </div>

          <div
            className="text-[13px] leading-[1.8] text-[#eeeef5]/80"
            dangerouslySetInnerHTML={{
              __html: briefingData?.data?.content ||
                'Klikni <b>AI Briefing</b> gore da ARIA analizira tvoje emailove i generiše jutarnji pregled.'
            }}
          />
        </motion.div>

        {/* Calendar preview */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-[#0d0d1a] border border-white/[0.055] border-l-2 border-l-[#4fd1c5] rounded p-5"
        >
          <p className="text-[8px] tracking-[2.5px] uppercase text-[#4fd1c5] mb-4">
            📅 Kalendar · Danas
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { time: '10:30', title: 'Team Standup', note: '⚠ Konflikt', noteColor: '#f4a0b5' },
              { time: '14:00', title: 'Investor Call', note: 'Zoom · 45 min', noteColor: '#e8c97a' },
              { time: '15:00', title: 'Board Meeting', note: '⚠ Reply needed', noteColor: '#f4a0b5' },
              { time: '17:00', title: 'Weekly Review', note: 'ARIA scheduled', noteColor: '#4fd1c5' },
            ].map((ev, i) => (
              <div key={i} className="bg-[#121224] rounded p-2.5 border-l-2" style={{ borderLeftColor: i % 2 === 0 ? '#4fd1c5' : '#7eb8f7' }}>
                <p className="text-[9px] text-[#8888aa] mb-0.5 font-mono">{ev.time}</p>
                <p className="text-[11.5px]">{ev.title}</p>
                <p className="text-[9px] mt-1" style={{ color: ev.noteColor }}>{ev.note}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
