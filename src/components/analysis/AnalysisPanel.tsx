'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  CheckCircle, Send, Calendar, Copy, RefreshCw, Loader2, Zap,
  X, Sparkles, AlertCircle, Clock, Tag, TrendingUp, Brain,
  ChevronRight,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/lib/store'

// ─── Floating AI Trigger Button ───────────────────────────────────────────────

export function AITriggerButton() {
  const { aiPanelOpen, setAiPanelOpen, selectedEmailId } = useAppStore()
  const hasEmail = !!selectedEmailId

  // Hide when panel is open — the panel header has a close button
  if (aiPanelOpen) return null

  return (
    <button
      onClick={() => setAiPanelOpen(true)}
      title="Open AI panel (A)"
      className="fixed top-1/2 right-0 -translate-y-1/2 z-[300] flex flex-col items-center justify-center gap-1.5 py-5 px-2 shadow-2xl"
      style={{
        background: 'linear-gradient(160deg, #7C5CFF, #6D4EF0)',
        borderRadius: '12px 0 0 12px',
        borderLeft: '1px solid var(--border)',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        boxShadow: '0 0 24px rgba(124,92,255,0.35), -4px 0 16px rgba(0,0,0,0.25)',
      }}
    >
      <Brain size={14} className="text-white" />
      <span
        className="text-white font-medium"
        style={{
          fontSize: 9,
          letterSpacing: '0.12em',
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
          transform: 'rotate(180deg)',
        }}
      >
        AI
      </span>
      {hasEmail && (
        <span
          className="w-1.5 h-1.5 rounded-full mt-1"
          style={{ background: '#10b981', boxShadow: '0 0 6px rgba(16,185,129,0.6)' }}
        />
      )}
    </button>
  )
}

// ─── Main AI Drawer Panel ─────────────────────────────────────────────────────

export function AnalysisPanel() {
  const { selectedEmailId, rightPanel, setRightPanel, aiPanelOpen, setAiPanelOpen } = useAppStore()
  const qc = useQueryClient()

  // Keyboard shortcut: A to toggle
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'a' || e.key === 'A') setAiPanelOpen(!aiPanelOpen)
      if (e.key === 'Escape' && aiPanelOpen) setAiPanelOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [aiPanelOpen, setAiPanelOpen])

  const { data: email, isLoading: emailLoading } = useQuery({
    queryKey: ['email', selectedEmailId],
    queryFn: async () => {
      const res = await fetch(`/api/emails/${selectedEmailId}`)
      return res.json()
    },
    enabled: !!selectedEmailId,
  })

  const analyzeMutation = useMutation({
    mutationFn: async (emailId: string) => {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailId }),
      })
      if (!res.ok) throw new Error('Analysis failed')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email', selectedEmailId] })
      qc.invalidateQueries({ queryKey: ['emails'] })
      toast.success('Email analyzed', 'AI Analysis')
    },
    onError: () => toast.error('Analysis failed', 'Error'),
  })

  const analysis = email?.data?.analysis

  const TABS = [
    { key: 'analysis', label: 'Analysis', icon: Brain },
    { key: 'reply', label: 'Reply', icon: Send },
    { key: 'meeting', label: 'Actions', icon: Calendar },
  ] as const

  return (
    <>
      {/* Floating trigger tab — hidden when panel is open */}
      <AITriggerButton />

      {/* In-flow panel: width transitions 0 → 380px, pushing main content */}
      <div
        className="shrink-0 overflow-hidden flex flex-col"
        style={{
          width: aiPanelOpen ? 380 : 0,
          transition: 'width 300ms cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        <aside
          className="w-[380px] h-full flex flex-col overflow-hidden"
          style={{
            background: 'color-mix(in srgb, var(--bg-card) 96%, transparent)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderLeft: '1px solid var(--border-medium)',
          }}
        >
              {/* Header */}
              <div className="px-5 pt-5 pb-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(135deg, #7C5CFF, #6D4EF0)',
                        boxShadow: '0 0 12px rgba(124,92,255,0.35)',
                      }}
                    >
                      <Sparkles size={12} className="text-white" />
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-white tracking-tight">ARIA AI Layer</p>
                      <p className="text-[9px] text-[var(--text-3)] tracking-[0.05em]">
                        {selectedEmailId ? 'Email context loaded' : 'Select an email to start'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setAiPanelOpen(false)}
                    className="p-1.5 rounded-lg text-[var(--text-3)] hover:text-[var(--text-2)] hover:bg-[var(--bg-hover)] transition-all"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Tab bar */}
                <div className="flex gap-1">
                  {TABS.map(({ key, label, icon: Icon }) => {
                    const active = rightPanel === key
                    return (
                      <button
                        key={key}
                        onClick={() => setRightPanel(key)}
                        className={cn(
                          'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-medium transition-all',
                        )}
                        style={{
                          background: active ? 'var(--accent)' : 'var(--bg-surface)',
                          color: active ? 'white' : 'var(--text-3)',
                          border: active ? 'none' : '1px solid var(--border)',
                          boxShadow: active ? '0 4px 12px rgba(124,92,255,0.3)' : 'none',
                        }}
                      >
                        <Icon size={11} />
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                <AnimatePresence mode="wait">
                  {!selectedEmailId ? (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <EmptyState />
                    </motion.div>
                  ) : (
                    <motion.div
                      key={`${selectedEmailId}-${rightPanel}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.18 }}
                      className="px-5 py-4"
                    >
                      {rightPanel === 'analysis' && (
                        <AnalysisTab
                          analysis={analysis}
                          onAnalyze={() => analyzeMutation.mutate(selectedEmailId)}
                          loading={analyzeMutation.isPending}
                        />
                      )}
                      {rightPanel === 'reply' && (
                        <ReplyTab
                          analysis={analysis}
                          emailId={selectedEmailId}
                          onAnalyze={() => analyzeMutation.mutate(selectedEmailId)}
                          loading={analyzeMutation.isPending}
                        />
                      )}
                      {rightPanel === 'meeting' && (
                        <MeetingTab analysis={analysis} email={email?.data} />
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer shortcut hint */}
              <div
                className="px-5 py-2.5 shrink-0 flex items-center justify-between"
                style={{ borderTop: '1px solid var(--border)' }}
              >
                <span className="text-[9px] text-[var(--text-3)]">Press</span>
                <kbd
                  className="text-[9px] px-1.5 py-0.5 rounded font-mono"
                  style={{ background: 'var(--bg-hover)', color: 'var(--text-3)', border: '1px solid var(--border)' }}
                >
                  A
                </kbd>
                <span className="text-[9px] text-[var(--text-3)]">to toggle · Esc to close</span>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--green)' }} />
                  <span className="text-[9px]" style={{ color: 'var(--green)' }}>active</span>
                </div>
              </div>
        </aside>
      </div>
    </>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 text-center py-16 px-6">
      <div className="relative">
        <div
          className="absolute inset-0 rounded-2xl blur-[32px] opacity-25"
          style={{ background: 'radial-gradient(circle, #7C5CFF, transparent 70%)' }}
        />
        <div
          className="relative w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, rgba(124,92,255,0.15), rgba(124,92,255,0.08))',
            border: '1px solid rgba(124,92,255,0.25)',
          }}
        >
          <Brain size={26} style={{ color: 'var(--accent-text)' }} strokeWidth={1.25} />
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-[14px] font-semibold gradient-text">ARIA is ready</p>
        <p className="text-[12px] leading-relaxed max-w-[200px] mx-auto" style={{ color: 'var(--text-3)' }}>
          Select an email and ARIA will instantly analyze it for you
        </p>
      </div>

      <div className="w-full space-y-2 pt-2">
        {[
          { icon: Brain, label: 'AI priority scoring', color: '#7C5CFF' },
          { icon: Send, label: 'Smart reply suggestions', color: '#10b981' },
          { icon: Calendar, label: 'Meeting detection', color: '#f59e0b' },
        ].map(({ icon: Icon, label, color }) => (
          <div
            key={label}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: `color-mix(in srgb, ${color} 12%, transparent)` }}
            >
              <Icon size={13} style={{ color }} />
            </div>
            <span className="text-[11.5px]" style={{ color: 'var(--text-2)' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Analysis Tab ─────────────────────────────────────────────────────────────

const PRIORITY_CONFIG = {
  CRITICAL: { color: 'var(--red)', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' },
  HIGH:     { color: 'var(--amber)', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
  MEDIUM:   { color: 'var(--accent-text)', bg: 'var(--accent-subtle)', border: 'rgba(124,92,255,0.2)' },
  LOW:      { color: 'var(--text-3)', bg: 'var(--bg-surface)', border: 'var(--border)' },
}

function AnalysisTab({ analysis, onAnalyze, loading }: any) {
  if (!analysis) {
    return (
      <div className="space-y-5">
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
          >
            <Zap size={18} style={{ color: 'var(--text-3)' }} strokeWidth={1.5} />
          </div>
          <p className="text-[12px]" style={{ color: 'var(--text-3)' }}>
            This email hasn't been analyzed yet
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={onAnalyze}
          disabled={loading}
          className="w-full py-3 rounded-xl flex items-center justify-center gap-2 text-[12px] font-medium text-white disabled:opacity-50"
          style={{
            background: 'linear-gradient(135deg, #7C5CFF, #6D4EF0)',
            boxShadow: '0 4px 16px rgba(124,92,255,0.3)',
          }}
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
          {loading ? 'Analyzing…' : 'Run AI Analysis'}
        </motion.button>
      </div>
    )
  }

  const cfg = PRIORITY_CONFIG[analysis.priority as keyof typeof PRIORITY_CONFIG] ?? PRIORITY_CONFIG.LOW

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">

      {/* Priority + Urgency hero card */}
      <div
        className="relative overflow-hidden p-4 rounded-2xl"
        style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
      >
        <div
          className="absolute right-0 top-0 w-24 h-full pointer-events-none"
          style={{ background: `radial-gradient(ellipse at right, ${cfg.color}10, transparent 70%)` }}
        />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[9px] uppercase tracking-[2px] mb-1" style={{ color: 'var(--text-3)' }}>Priority</p>
            <div className="flex items-center gap-2">
              <AlertCircle size={15} style={{ color: cfg.color }} />
              <p className="text-[18px] font-semibold" style={{ color: cfg.color }}>{analysis.priority}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[9px] uppercase tracking-[2px] mb-1" style={{ color: 'var(--text-3)' }}>Urgency</p>
            <p className="text-[28px] font-outfit font-light" style={{ color: 'var(--text-1)' }}>
              {analysis.urgencyScore}
              <span className="text-[13px]" style={{ color: 'var(--text-3)' }}>/10</span>
            </p>
          </div>
        </div>

        {/* Urgency bar */}
        <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${analysis.urgencyScore * 10}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ background: cfg.color }}
          />
        </div>
      </div>

      {/* Tags row */}
      <div className="flex flex-wrap gap-1.5">
        {[
          { icon: Tag, text: analysis.category },
          { icon: TrendingUp, text: analysis.intent },
          { icon: Clock, text: analysis.sentiment },
        ].map(({ icon: Icon, text }) => text && (
          <span
            key={text}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px]"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-2)' }}
          >
            <Icon size={9} style={{ color: 'var(--text-3)' }} />
            {text}
          </span>
        ))}
      </div>

      {/* Deadline */}
      {analysis.deadlineText && (
        <div
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
          style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <Clock size={13} style={{ color: 'var(--red)' }} />
          <div>
            <p className="text-[9px] uppercase tracking-[1.5px] mb-0.5" style={{ color: 'var(--red)' }}>Deadline</p>
            <p className="text-[12px] font-medium text-white">{analysis.deadlineText}</p>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="p-4 rounded-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <p className="text-[9px] uppercase tracking-[1.5px] mb-2" style={{ color: 'var(--text-3)' }}>Summary</p>
        <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-2)' }}>{analysis.summary}</p>
      </div>

      {/* Suggested action */}
      {analysis.suggestedAction && (
        <div
          className="p-4 rounded-xl relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(124,92,255,0.08), rgba(124,92,255,0.04))',
            border: '1px solid rgba(124,92,255,0.2)',
          }}
        >
          <p className="text-[9px] uppercase tracking-[1.5px] mb-2" style={{ color: 'var(--accent-text)' }}>Suggested Action</p>
          <p className="text-[12px]" style={{ color: 'var(--text-1)' }}>{analysis.suggestedAction}</p>
        </div>
      )}

      {/* Task */}
      {analysis.taskText && (
        <div
          className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl"
          style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}
        >
          <CheckCircle size={13} className="shrink-0 mt-0.5" style={{ color: 'var(--green)' }} />
          <div>
            <p className="text-[9px] uppercase tracking-[1.5px] mb-0.5" style={{ color: 'var(--green)' }}>Task</p>
            <p className="text-[12px]" style={{ color: 'var(--text-2)' }}>{analysis.taskText}</p>
          </div>
        </div>
      )}

      {/* Confidence */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>AI Confidence</span>
          <span className="text-[10px] font-mono" style={{ color: 'var(--text-2)' }}>
            {Math.round(analysis.confidenceScore * 100)}%
          </span>
        </div>
        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-hover)' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${analysis.confidenceScore * 100}%` }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.15 }}
            className="h-full rounded-full"
            style={{ background: 'var(--green)' }}
          />
        </div>
      </div>

      <button
        onClick={onAnalyze}
        disabled={loading}
        className="flex items-center gap-1.5 text-[11px] transition-colors disabled:opacity-40"
        style={{ color: 'var(--text-3)' }}
      >
        <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
        Re-analyze
      </button>
    </motion.div>
  )
}

// ─── Reply Tab ────────────────────────────────────────────────────────────────

function ReplyTab({ analysis, emailId, onAnalyze, loading }: any) {
  const [style, setStyle] = useState<'short' | 'professional' | 'friendly'>('professional')
  const [sent, setSent] = useState(false)
  const [draftSaved, setDraftSaved] = useState(false)
  const [showRegenerate, setShowRegenerate] = useState(false)
  const [regenInstructions, setRegenInstructions] = useState('')

  const replies: Record<string, string> = {
    short: analysis?.replyShort ?? '',
    professional: analysis?.replyProfessional ?? '',
    friendly: analysis?.replyFriendly ?? '',
  }

  const [editedReply, setEditedReply] = useState(replies[style])

  const handleStyleChange = (s: 'short' | 'professional' | 'friendly') => {
    setStyle(s)
    setEditedReply(replies[s])
    setDraftSaved(false)
  }

  const sendMutation = useMutation({
    mutationFn: async (replyText: string) => {
      const res = await fetch('/api/ai/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailId, replyText, style }),
      })
      if (!res.ok) throw new Error('Send failed')
      return res.json()
    },
    onSuccess: () => {
      setSent(true)
      toast.success('Reply sent successfully')
    },
    onError: () => toast.error('Failed to send reply'),
  })

  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/ai/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailId, draftText: editedReply, style }),
      })
      if (!res.ok) throw new Error('Save draft failed')
      return res.json()
    },
    onSuccess: () => { setDraftSaved(true); setTimeout(() => setDraftSaved(false), 2500) },
  })

  const regenMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/ai/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailId, style, instructions: regenInstructions }),
      })
      if (!res.ok) throw new Error('Regenerate failed')
      return res.json()
    },
    onSuccess: (data) => {
      setEditedReply(data.reply ?? '')
      setShowRegenerate(false)
      setRegenInstructions('')
    },
  })

  if (!analysis?.replyProfessional) {
    return (
      <div className="space-y-5">
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
          >
            <Send size={16} style={{ color: 'var(--text-3)' }} strokeWidth={1.5} />
          </div>
          <p className="text-[12px]" style={{ color: 'var(--text-3)' }}>
            Analyze the email first to get AI reply suggestions
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={onAnalyze}
          disabled={loading}
          className="w-full py-3 rounded-xl flex items-center justify-center gap-2 text-[12px] font-medium text-white disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #7C5CFF, #6D4EF0)', boxShadow: '0 4px 16px rgba(124,92,255,0.3)' }}
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
          {loading ? 'Generating…' : 'Generate Replies'}
        </motion.button>
      </div>
    )
  }

  if (sent) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center gap-4 py-16 text-center"
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}
        >
          <CheckCircle size={22} style={{ color: 'var(--green)' }} />
        </div>
        <div>
          <p className="text-[13px] font-medium text-white">Reply sent!</p>
          <p className="text-[11px] mt-1" style={{ color: 'var(--text-3)' }}>Email delivered successfully</p>
        </div>
        <button
          onClick={() => setSent(false)}
          className="text-[11px] px-4 py-2 rounded-lg transition-all"
          style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}
        >
          Send another
        </button>
      </motion.div>
    )
  }

  const STYLE_OPTS = [
    { key: 'short', label: '⚡ Short' },
    { key: 'professional', label: '👔 Pro' },
    { key: 'friendly', label: '😊 Friendly' },
  ] as const

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
      {/* Style selector */}
      <div className="flex gap-1">
        {STYLE_OPTS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleStyleChange(key)}
            className="flex-1 py-2 rounded-xl text-[10.5px] font-medium transition-all"
            style={{
              background: style === key ? 'var(--accent)' : 'var(--bg-surface)',
              color: style === key ? 'white' : 'var(--text-3)',
              border: style === key ? 'none' : '1px solid var(--border)',
              boxShadow: style === key ? '0 4px 12px rgba(124,92,255,0.25)' : 'none',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Textarea */}
      <textarea
        value={editedReply}
        onChange={(e) => setEditedReply(e.target.value)}
        rows={7}
        className="w-full rounded-xl p-3.5 text-[12.5px] leading-relaxed outline-none transition-colors resize-none"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          color: 'var(--text-1)',
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--border-focus)')}
        onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
      />

      {/* Regenerate panel */}
      <AnimatePresence>
        {showRegenerate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 pt-1">
              <textarea
                value={regenInstructions}
                onChange={(e) => setRegenInstructions(e.target.value)}
                rows={2}
                placeholder="Instructions: make it shorter, more formal…"
                className="w-full rounded-xl p-3 text-[11.5px] leading-relaxed outline-none resize-none"
                style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-2)' }}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => regenMutation.mutate()}
                  disabled={regenMutation.isPending}
                  className="flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 text-[11px] font-medium text-white disabled:opacity-50"
                  style={{ background: 'var(--accent)' }}
                >
                  {regenMutation.isPending ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
                  {regenMutation.isPending ? 'Regenerating…' : 'Regenerate'}
                </button>
                <button
                  onClick={() => setShowRegenerate(false)}
                  className="px-4 py-2 rounded-xl text-[11px]"
                  style={{ border: '1px solid var(--border)', color: 'var(--text-3)' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      <div className="flex gap-2">
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => sendMutation.mutate(editedReply)}
          disabled={sendMutation.isPending}
          className="flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 text-[12px] font-medium text-white disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #7C5CFF, #6D4EF0)', boxShadow: '0 4px 14px rgba(124,92,255,0.3)' }}
        >
          {sendMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
          {sendMutation.isPending ? 'Sending…' : 'Send'}
        </motion.button>

        <button
          onClick={() => saveDraftMutation.mutate()}
          disabled={saveDraftMutation.isPending || draftSaved}
          className="px-3 py-2.5 rounded-xl flex items-center gap-1.5 text-[11px] transition-all disabled:opacity-50"
          style={{
            border: `1px solid ${draftSaved ? 'var(--green)' : 'var(--border)'}`,
            color: draftSaved ? 'var(--green)' : 'var(--text-2)',
          }}
        >
          {draftSaved ? <CheckCircle size={11} /> : saveDraftMutation.isPending ? <Loader2 size={11} className="animate-spin" /> : null}
          {draftSaved ? 'Saved' : 'Draft'}
        </button>

        <button
          onClick={() => setShowRegenerate(!showRegenerate)}
          className="px-2.5 py-2.5 rounded-xl transition-all"
          style={{
            border: `1px solid ${showRegenerate ? 'var(--accent)' : 'var(--border)'}`,
            background: showRegenerate ? 'var(--accent-subtle)' : 'transparent',
            color: showRegenerate ? 'var(--accent-text)' : 'var(--text-3)',
          }}
          title="Regenerate with instructions"
        >
          <RefreshCw size={12} />
        </button>

        <button
          onClick={() => navigator.clipboard.writeText(editedReply)}
          className="px-2.5 py-2.5 rounded-xl transition-all"
          style={{ border: '1px solid var(--border)', color: 'var(--text-3)' }}
          title="Copy reply"
        >
          <Copy size={12} />
        </button>
      </div>
    </motion.div>
  )
}

// ─── Meeting Tab ──────────────────────────────────────────────────────────────

function parseMeetingTime(raw: string | undefined | null): Date | null {
  if (!raw) return null
  const ddmmyyyy = raw.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})(?:[^\d](\d{1,2}):(\d{2}))?/)
  if (ddmmyyyy) {
    const [, d, m, y, h = '9', min = '0'] = ddmmyyyy
    return new Date(+y, +m - 1, +d, +h, +min)
  }
  const isoDate = raw.match(/(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/)
  if (isoDate) {
    const [, y, m, d, h = '9', min = '0'] = isoDate
    return new Date(+y, +m - 1, +d, +h, +min)
  }
  const ts = Date.parse(raw)
  if (!isNaN(ts)) return new Date(ts)
  return null
}

function MeetingTab({ analysis, email }: any) {
  const [scheduled, setScheduled] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [needsReconnect, setNeedsReconnect] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [prepText, setPrepText] = useState<string | null>(null)
  const [prepLoading, setPrepLoading] = useState(false)

  const generatePrep = async () => {
    if (!email?.id) return
    setPrepLoading(true)
    try {
      const res = await fetch('/api/ai/meetingprep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailId: email.id }),
      })
      const data = await res.json()
      setPrepText(data.prep || null)
    } catch {}
    finally { setPrepLoading(false) }
  }

  const toLocalInput = (d: Date) =>
    new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)

  const getInitialTimes = () => {
    const detected = parseMeetingTime(analysis?.meetingTime)
    const base = detected ?? (() => {
      const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d
    })()
    if (!detected) base.setHours(9, 0, 0, 0)
    const end = new Date(base); end.setHours(base.getHours() + 1, base.getMinutes(), 0, 0)
    return { start: toLocalInput(base), end: toLocalInput(end) }
  }

  const [title, setTitle] = useState(() => email?.subject || 'Meeting')
  const [startTime, setStartTime] = useState(() => getInitialTimes().start)
  const [endTime, setEndTime] = useState(() => getInitialTimes().end)

  useEffect(() => {
    if (analysis?.meetingTime) {
      const { start, end } = getInitialTimes()
      setStartTime(start); setEndTime(end)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis?.meetingTime])

  useEffect(() => {
    if (email?.subject) setTitle(email.subject)
  }, [email?.subject])

  const handleSchedule = async () => {
    setLoading(true); setError(null); setNeedsReconnect(false)
    try {
      const participants = Array.isArray(analysis.meetingParticipants)
        ? analysis.meetingParticipants
        : email?.fromEmail ? [email.fromEmail] : []

      const res = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: `Scheduled via ARIA from email: ${email?.subject || ''}`,
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
          participants,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        const msg: string = data.error || 'Failed to create event'
        if (msg.toLowerCase().includes('insufficient') || msg.toLowerCase().includes('forbidden') || res.status === 401 || res.status === 403) {
          setNeedsReconnect(true)
        }
        throw new Error(msg)
      }
      setScheduled(true)
      toast.success('Event added to Google Calendar')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (!analysis?.meetingDetected) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        >
          <Calendar size={18} style={{ color: 'var(--text-3)' }} strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-[13px] font-medium" style={{ color: 'var(--text-2)' }}>No meeting detected</p>
          <p className="text-[11px] mt-1" style={{ color: 'var(--text-3)' }}>
            This email doesn't appear to contain a meeting request
          </p>
        </div>
      </div>
    )
  }

  if (scheduled) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4 py-16 text-center">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}
        >
          <CheckCircle size={22} style={{ color: 'var(--green)' }} />
        </div>
        <div>
          <p className="text-[13px] font-medium text-white">Event created!</p>
          <p className="text-[11px] mt-1" style={{ color: 'var(--text-3)' }}>Added to Google Calendar · Invites sent</p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
      {/* Detected meeting card */}
      <div
        className="p-4 rounded-2xl"
        style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)' }}
      >
        <p className="text-[9px] uppercase tracking-[1.5px] mb-2" style={{ color: 'var(--amber)' }}>Meeting Detected</p>
        {analysis.meetingTime && (
          <p className="text-[16px] font-semibold text-white mb-1">{analysis.meetingTime}</p>
        )}
        {Array.isArray(analysis.meetingParticipants) && analysis.meetingParticipants.length > 0 && (
          <p className="text-[11px]" style={{ color: 'var(--text-2)' }}>
            {analysis.meetingParticipants.join(', ')}
          </p>
        )}
      </div>

      {/* Meeting prep */}
      <button
        onClick={generatePrep}
        disabled={prepLoading}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11.5px] transition-all"
        style={{ border: '1px solid var(--border)', color: 'var(--text-2)', background: 'var(--bg-surface)' }}
      >
        {prepLoading ? <Loader2 size={11} className="animate-spin" /> : <Brain size={11} />}
        {prepLoading ? 'Preparing…' : 'Generate Meeting Prep'}
      </button>

      {prepText && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="p-3 rounded-xl overflow-hidden"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        >
          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-2)' }}>{prepText}</p>
        </motion.div>
      )}

      {/* Expandable form */}
      <button
        onClick={() => setShowForm(!showForm)}
        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-[11.5px]"
        style={{
          border: `1px solid ${showForm ? 'var(--accent)' : 'var(--border)'}`,
          background: showForm ? 'var(--accent-subtle)' : 'var(--bg-surface)',
          color: showForm ? 'var(--accent-text)' : 'var(--text-2)',
        }}
      >
        <span>Customize event details</span>
        <ChevronRight size={12} className={cn('transition-transform', showForm && 'rotate-90')} />
      </button>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden space-y-2"
          >
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Meeting title"
              className="w-full px-3 py-2.5 rounded-xl text-[12px] outline-none"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[9px] uppercase tracking-[1px] mb-1" style={{ color: 'var(--text-3)' }}>Start</p>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-2 py-2 rounded-lg text-[10.5px] outline-none"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
                />
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-[1px] mb-1" style={{ color: 'var(--text-3)' }}>End</p>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-2 py-2 rounded-lg text-[10.5px] outline-none"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div
          className="px-3 py-2.5 rounded-xl"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <p className="text-[11px]" style={{ color: 'var(--red)' }}>{error}</p>
          {needsReconnect && (
            <a href="/api/auth/google-calendar" className="text-[10px] underline mt-1 block" style={{ color: 'var(--amber)' }}>
              Reconnect Google Calendar →
            </a>
          )}
        </div>
      )}

      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleSchedule}
        disabled={loading}
        className="w-full py-3 rounded-xl flex items-center justify-center gap-2 text-[12px] font-medium text-white disabled:opacity-50"
        style={{
          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
          boxShadow: '0 4px 14px rgba(245,158,11,0.3)',
        }}
      >
        {loading ? <Loader2 size={13} className="animate-spin" /> : <Calendar size={13} />}
        {loading ? 'Scheduling…' : 'Add to Google Calendar'}
      </motion.button>
    </motion.div>
  )
}
