'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { CheckCircle, Send, Calendar, Copy, RefreshCw, Loader2, Zap, BookOpen } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function AnalysisPanel() {
  const { selectedEmailId, rightPanel, setRightPanel } = useAppStore()
  const qc = useQueryClient()

  const { data: email } = useQuery({
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
    },
  })

  const analysis = email?.data?.analysis

  return (
    <aside
      className="flex flex-col h-full overflow-hidden"
      style={{ background: 'var(--bg-card)', borderLeft: '1px solid var(--border)' }}
    >
      {/* Header */}
      <div
        className="px-4 pt-4 pb-3 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        {/* Brand */}
        <div className="flex items-center gap-2 mb-4">
          <div
            className="w-5 h-5 rounded-md flex items-center justify-center"
            style={{ background: 'var(--accent-subtle)' }}
          >
            <Zap size={11} style={{ color: 'var(--accent-text)' }} />
          </div>
          <span
            className="text-[11px] font-medium tracking-[0.06em] uppercase"
            style={{ color: 'var(--text-3)' }}
          >
            AI Layer
          </span>
        </div>

        {/* Tabs */}
        <div
          className="flex gap-1 p-1 rounded-lg"
          style={{ background: 'var(--bg-hover)' }}
        >
          {(['analysis', 'reply', 'meeting'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setRightPanel(tab)}
              className={cn(
                'flex-1 py-1.5 rounded-md text-[11px] font-medium transition-all capitalize'
              )}
              style={{
                background: rightPanel === tab ? 'var(--bg-card)' : 'transparent',
                color: rightPanel === tab ? 'var(--text-1)' : 'var(--text-3)',
                boxShadow: rightPanel === tab ? 'var(--shadow-sm)' : 'none',
              }}
            >
              {tab === 'meeting' ? 'Actions' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {!selectedEmailId ? (
          <EmptyState />
        ) : (
          <>
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
            {rightPanel === 'meeting' && <MeetingTab analysis={analysis} email={email?.data} />}
          </>
        )}
      </div>
    </aside>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 text-center py-12">
      <div className="relative">
        <div
          className="absolute inset-0 rounded-2xl blur-xl opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.5), transparent 70%)' }}
        />
        <div className="empty-state-icon relative">
          <Zap size={20} style={{ color: 'var(--accent-text)' }} strokeWidth={1.5} />
        </div>
      </div>
      <div>
        <p className="text-[13px] font-semibold gradient-text">ARIA is ready</p>
        <p className="text-[11.5px] mt-1.5 leading-relaxed max-w-[160px] mx-auto" style={{ color: 'var(--text-3)' }}>
          Select an email to unlock AI analysis
        </p>
      </div>
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: 'var(--accent-subtle)', border: '1px solid rgba(124,58,237,0.2)' }}>
        <span className="pulse-ring shrink-0">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)', display: 'block' }} />
        </span>
        <span className="text-[10px]" style={{ color: 'var(--accent-text)' }}>AI Layer active</span>
      </div>
    </div>
  )
}

function Field({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-start gap-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
      <span className="text-[11px] w-[72px] shrink-0 mt-0.5" style={{ color: 'var(--text-3)' }}>{label}</span>
      <span className="text-[12px] flex-1 font-medium" style={{ color: color || 'var(--text-1)' }}>{value}</span>
    </div>
  )
}

function AnalysisTab({ analysis, onAnalyze, loading }: any) {
  if (!analysis) {
    return (
      <div className="space-y-4 pt-2">
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-[12px]" style={{ color: 'var(--text-3)' }}>No analysis yet</p>
        </div>
        <button
          onClick={onAnalyze}
          disabled={loading}
          className="w-full py-2.5 rounded-lg flex items-center justify-center gap-2 text-[12px] font-medium transition-colors text-white disabled:opacity-50"
          style={{ background: 'var(--accent)' }}
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
          {loading ? 'Analyzing…' : 'Run AI Analysis'}
        </button>
      </div>
    )
  }

  const PRIORITY_COLOR: Record<string, string> = {
    CRITICAL: 'var(--red)',
    HIGH:     'var(--amber)',
    MEDIUM:   'var(--accent)',
    LOW:      'var(--text-3)',
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1">
      {/* Priority + Score */}
      <div
        className="flex items-center justify-between px-3 py-3 rounded-xl mb-4"
        style={{ background: 'var(--bg-surface)' }}
      >
        <div>
          <p className="text-[10px] uppercase tracking-[0.08em] mb-1" style={{ color: 'var(--text-3)' }}>Priority</p>
          <p className="text-[15px] font-semibold" style={{ color: PRIORITY_COLOR[analysis.priority] }}>
            {analysis.priority}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.08em] mb-1" style={{ color: 'var(--text-3)' }}>Urgency</p>
          <p className="text-[15px] font-semibold font-mono" style={{ color: 'var(--text-1)' }}>
            {analysis.urgencyScore}
            <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>/10</span>
          </p>
        </div>
      </div>

      {/* Urgency bar */}
      <div
        className="h-1 rounded-full overflow-hidden mb-4"
        style={{ background: 'var(--bg-hover)' }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${analysis.urgencyScore * 10}%` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{
            background: analysis.urgencyScore >= 8
              ? 'var(--red)'
              : analysis.urgencyScore >= 5
              ? 'var(--amber)'
              : 'var(--accent)',
          }}
        />
      </div>

      {/* Fields */}
      <Field label="Category" value={analysis.category} />
      <Field label="Intent"   value={analysis.intent} />
      <Field label="Sentiment" value={analysis.sentiment} />
      {analysis.deadlineText && <Field label="Deadline" value={analysis.deadlineText} color="var(--red)" />}
      {analysis.amount && <Field label="Amount" value={analysis.amount} color="var(--green)" />}

      {/* Summary */}
      <div className="mt-4 pt-3">
        <p className="text-[10px] uppercase tracking-[0.08em] mb-2" style={{ color: 'var(--text-3)' }}>Summary</p>
        <p className="text-[12.5px] leading-relaxed" style={{ color: 'var(--text-2)' }}>{analysis.summary}</p>
      </div>

      {/* Suggested action */}
      {analysis.suggestedAction && (
        <div
          className="mt-3 p-3 rounded-xl"
          style={{ background: 'var(--accent-subtle)' }}
        >
          <p className="text-[10px] uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--accent-text)' }}>Next step</p>
          <p className="text-[12px]" style={{ color: 'var(--text-2)' }}>{analysis.suggestedAction}</p>
        </div>
      )}

      {/* Task */}
      {analysis.taskText && (
        <div className="flex items-start gap-2 mt-3">
          <CheckCircle size={13} className="shrink-0 mt-0.5" style={{ color: 'var(--green)' }} />
          <p className="text-[12px]" style={{ color: 'var(--text-2)' }}>{analysis.taskText}</p>
        </div>
      )}

      {/* Confidence */}
      <div className="mt-4 flex items-center justify-between">
        <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>Confidence</span>
        <span className="text-[11px] font-mono" style={{ color: 'var(--text-2)' }}>
          {Math.round(analysis.confidenceScore * 100)}%
        </span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-hover)' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${analysis.confidenceScore * 100}%` }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
          className="h-full rounded-full"
          style={{ background: 'var(--green)' }}
        />
      </div>

      <button
        onClick={onAnalyze}
        disabled={loading}
        className="flex items-center gap-1.5 text-[11px] mt-4 transition-colors disabled:opacity-40"
        style={{ color: 'var(--text-3)' }}
      >
        <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
        Re-analyze
      </button>
    </motion.div>
  )
}

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

  // Sync editedReply when style changes
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
    onSuccess: () => setSent(true),
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
      <div className="space-y-4 pt-2">
        <div className="py-10 text-center">
          <p className="text-[12px]" style={{ color: 'var(--text-3)' }}>Analyze email first to get reply suggestions</p>
        </div>
        <button
          onClick={onAnalyze}
          disabled={loading}
          className="w-full py-2.5 rounded-lg flex items-center justify-center gap-2 text-[12px] font-medium text-white disabled:opacity-50"
          style={{ background: 'var(--accent)' }}
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
          {loading ? 'Generating…' : 'Generate Replies'}
        </button>
      </div>
    )
  }

  if (sent) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center gap-3 py-16 text-center"
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--green-subtle)' }}
        >
          <CheckCircle size={18} style={{ color: 'var(--green)' }} />
        </div>
        <p className="text-[13px] font-medium" style={{ color: 'var(--text-1)' }}>Reply sent</p>
        <button
          onClick={() => setSent(false)}
          className="text-[11px] underline underline-offset-2"
          style={{ color: 'var(--text-3)' }}
        >
          Send another
        </button>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 pt-1">
      {/* Style selector */}
      <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--bg-hover)' }}>
        {(['short', 'professional', 'friendly'] as const).map((s) => (
          <button
            key={s}
            onClick={() => handleStyleChange(s)}
            className="flex-1 py-1.5 rounded-md text-[11px] font-medium transition-all capitalize"
            style={{
              background: style === s ? 'var(--bg-card)' : 'transparent',
              color: style === s ? 'var(--text-1)' : 'var(--text-3)',
              boxShadow: style === s ? 'var(--shadow-sm)' : 'none',
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Controlled textarea */}
      <textarea
        value={editedReply}
        onChange={(e) => setEditedReply(e.target.value)}
        rows={6}
        className="w-full rounded-xl p-3 text-[12.5px] leading-relaxed outline-none transition-colors resize-none"
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
              <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>Custom instructions (optional)</p>
              <textarea
                value={regenInstructions}
                onChange={(e) => setRegenInstructions(e.target.value)}
                rows={2}
                placeholder="e.g. Make it shorter, more formal, mention the deadline…"
                className="w-full rounded-lg p-2.5 text-[12px] leading-relaxed outline-none resize-none transition-colors"
                style={{
                  background: 'var(--bg-hover)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-2)',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--border-focus)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => regenMutation.mutate()}
                  disabled={regenMutation.isPending}
                  className="flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 text-[11px] font-medium text-white disabled:opacity-50 transition-colors"
                  style={{ background: 'var(--accent)' }}
                >
                  {regenMutation.isPending ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
                  {regenMutation.isPending ? 'Regenerating…' : 'Regenerate'}
                </button>
                <button
                  onClick={() => setShowRegenerate(false)}
                  className="px-3 py-1.5 rounded-lg text-[11px] transition-colors"
                  style={{ border: '1px solid var(--border)', color: 'var(--text-3)' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => sendMutation.mutate(editedReply)}
          disabled={sendMutation.isPending}
          className="flex-1 py-2 rounded-lg flex items-center justify-center gap-2 text-[12px] font-medium text-white disabled:opacity-50 transition-colors"
          style={{ background: 'var(--accent)' }}
        >
          {sendMutation.isPending ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
          {sendMutation.isPending ? 'Sending…' : 'Send'}
        </button>
        <button
          onClick={() => saveDraftMutation.mutate()}
          disabled={saveDraftMutation.isPending || draftSaved}
          className="px-3 py-2 rounded-lg flex items-center gap-1.5 text-[11px] transition-colors disabled:opacity-50"
          style={{
            border: '1px solid var(--border)',
            color: draftSaved ? 'var(--green)' : 'var(--text-2)',
            borderColor: draftSaved ? 'var(--green)' : 'var(--border)',
          }}
        >
          {saveDraftMutation.isPending
            ? <Loader2 size={10} className="animate-spin" />
            : draftSaved
            ? <CheckCircle size={10} />
            : null}
          {draftSaved ? 'Saved' : 'Draft'}
        </button>
        <button
          onClick={() => { setShowRegenerate(!showRegenerate) }}
          className="px-3 py-2 rounded-lg transition-colors"
          style={{
            border: '1px solid var(--border)',
            color: showRegenerate ? 'var(--accent-text)' : 'var(--text-2)',
            borderColor: showRegenerate ? 'var(--accent)' : 'var(--border)',
            background: showRegenerate ? 'var(--accent-subtle)' : 'transparent',
          }}
          title="Regenerate with instructions"
        >
          <RefreshCw size={12} />
        </button>
        <button
          onClick={() => navigator.clipboard.writeText(editedReply)}
          className="px-3 py-2 rounded-lg transition-colors"
          style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}
        >
          <Copy size={12} />
        </button>
      </div>
    </motion.div>
  )
}

function MeetingTab({ analysis, email }: any) {
  const [scheduled, setScheduled] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
    } catch {
      // ignore
    } finally {
      setPrepLoading(false)
    }
  }

  // Pre-fill sensible defaults from detected meeting time
  const tomorrow9am = new Date()
  tomorrow9am.setDate(tomorrow9am.getDate() + 1)
  tomorrow9am.setHours(9, 0, 0, 0)
  const tomorrow10am = new Date(tomorrow9am)
  tomorrow10am.setHours(10, 0, 0, 0)

  const toLocalInput = (d: Date) =>
    new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)

  const [title, setTitle] = useState(email?.subject || 'Meeting')
  const [startTime, setStartTime] = useState(toLocalInput(tomorrow9am))
  const [endTime, setEndTime] = useState(toLocalInput(tomorrow10am))

  const handleSchedule = async () => {
    setLoading(true)
    setError(null)
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
        throw new Error(data.error || 'Failed to create event')
      }
      setScheduled(true)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (!analysis?.meetingDetected) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--bg-hover)' }}>
          <Calendar size={16} style={{ color: 'var(--text-3)' }} strokeWidth={1.5} />
        </div>
        <p className="text-[12px]" style={{ color: 'var(--text-3)' }}>No meeting detected in this email</p>
      </div>
    )
  }

  if (scheduled) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--green-subtle)' }}>
          <CheckCircle size={18} style={{ color: 'var(--green)' }} />
        </div>
        <p className="text-[13px] font-medium" style={{ color: 'var(--text-1)' }}>Event added to Google Calendar</p>
        <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>Invites sent to participants</p>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 pt-1">
      {/* Detected info */}
      <div className="p-4 rounded-xl" style={{ background: 'var(--amber-subtle)', border: '1px solid color-mix(in srgb, var(--amber) 20%, transparent)' }}>
        <p className="text-[10px] uppercase tracking-[0.08em] mb-2" style={{ color: 'var(--amber)' }}>Meeting Detected</p>
        {analysis.meetingTime && (
          <p className="text-[15px] font-semibold mb-1" style={{ color: 'var(--text-1)' }}>{analysis.meetingTime}</p>
        )}
        {Array.isArray(analysis.meetingParticipants) && analysis.meetingParticipants.length > 0 && (
          <p className="text-[11px]" style={{ color: 'var(--text-2)' }}>{analysis.meetingParticipants.join(', ')}</p>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Meeting title"
            className="w-full px-3 py-2 rounded-lg text-[12px] outline-none"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-medium)', color: 'var(--text-1)' }}
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] mb-1" style={{ color: 'var(--text-3)' }}>Start</p>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg text-[11px] outline-none"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-medium)', color: 'var(--text-1)' }}
              />
            </div>
            <div>
              <p className="text-[10px] mb-1" style={{ color: 'var(--text-3)' }}>End</p>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg text-[11px] outline-none"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-medium)', color: 'var(--text-1)' }}
              />
            </div>
          </div>
        </motion.div>
      )}

      {error && <p className="text-[11px]" style={{ color: 'var(--red)' }}>{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-2.5 rounded-lg text-[12px] font-medium transition-colors"
          style={{ border: '1px solid var(--border-medium)', color: 'var(--text-2)' }}
        >
          {showForm ? 'Hide' : 'Edit details'}
        </button>
        <button
          onClick={handleSchedule}
          disabled={loading}
          className="flex-1 py-2.5 rounded-lg flex items-center justify-center gap-2 text-[12px] font-medium text-white transition-opacity disabled:opacity-50"
          style={{ background: 'var(--amber)' }}
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Calendar size={12} />}
          {loading ? 'Scheduling…' : 'Schedule Meeting'}
        </button>
      </div>

      {/* Meeting Prep */}
      {!prepText ? (
        <button
          onClick={generatePrep}
          disabled={prepLoading || !email?.id}
          className="w-full py-2 rounded-lg flex items-center justify-center gap-2 text-[12px] font-medium transition-colors disabled:opacity-50"
          style={{ border: '1px solid var(--border-medium)', color: 'var(--text-2)' }}
        >
          {prepLoading ? <Loader2 size={12} className="animate-spin" /> : <BookOpen size={12} />}
          {prepLoading ? 'Generating prep…' : 'Generate Meeting Prep'}
        </button>
      ) : (
        <div className="p-3 rounded-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase tracking-[0.08em]" style={{ color: 'var(--accent-text)' }}>Meeting Prep</p>
            <button onClick={() => setPrepText(null)} className="text-[10px]" style={{ color: 'var(--text-3)' }}>Reset</button>
          </div>
          <div
            className="text-[12px] leading-relaxed"
            style={{ color: 'var(--text-2)' }}
            dangerouslySetInnerHTML={{ __html: prepText }}
          />
        </div>
      )}
    </motion.div>
  )
}
