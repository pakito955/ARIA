'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { CheckCircle, Send, Calendar, Copy, RefreshCw, Loader2, Zap } from 'lucide-react'
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
    <aside className="flex flex-col h-full glass border-l border-[#8b5cf6]/10 overflow-hidden relative">
      {/* Ambient glow */}
      <div
        className="absolute top-0 left-0 right-0 h-32 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at top, rgba(139,92,246,0.06), transparent 70%)' }}
      />

      {/* Header */}
      <div className="px-4 pt-5 pb-3 border-b border-white/[0.04]">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 rounded-md bg-[#8b5cf6]/20 flex items-center justify-center">
            <Zap size={11} className="text-[#8b5cf6]" />
          </div>
          <span className="text-[9px] tracking-[2.5px] uppercase text-[#8b5cf6]">AI Layer</span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white/[0.03] rounded-lg p-1">
          {(['analysis', 'reply', 'meeting'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setRightPanel(tab)}
              className={cn(
                'flex-1 py-1.5 rounded-md text-[9.5px] uppercase tracking-[0.8px] transition-all',
                rightPanel === tab
                  ? 'bg-[#8b5cf6]/20 text-[#a78bfa]'
                  : 'text-[#4a4a6a] hover:text-[#8888aa]'
              )}
            >
              {tab === 'analysis' ? 'Analysis' : tab === 'reply' ? 'Reply' : 'Actions'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {!selectedEmailId ? (
          <EmptyAI />
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
            {rightPanel === 'meeting' && (
              <MeetingTab analysis={analysis} />
            )}
          </>
        )}
      </div>
    </aside>
  )
}

function EmptyAI() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-12">
      <div className="relative">
        <div
          className="absolute inset-0 rounded-full blur-xl"
          style={{ background: 'rgba(139,92,246,0.1)', transform: 'scale(1.5)' }}
        />
        <div className="relative w-12 h-12 rounded-xl bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 flex items-center justify-center">
          <Zap size={18} className="text-[#8b5cf6]" />
        </div>
      </div>
      <div>
        <p className="text-[12px] text-[#8888aa] font-medium">ARIA is ready</p>
        <p className="text-[10.5px] text-[#4a4a6a] mt-1 leading-relaxed max-w-[180px] mx-auto">
          Select an email to see AI analysis, or press ⌘K to search and act.
        </p>
      </div>
    </div>
  )
}

function AnalysisTab({ analysis, onAnalyze, loading }: any) {
  if (!analysis) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <div className="w-10 h-10 rounded-xl bg-[#8b5cf6]/08 border border-[#8b5cf6]/15 flex items-center justify-center">
            <Zap size={16} className="text-[#8b5cf6]/60" />
          </div>
          <p className="text-[11px] text-[#4a4a6a]">No analysis yet</p>
        </div>
        <button
          onClick={onAnalyze}
          disabled={loading}
          className="w-full py-2.5 bg-[#8b5cf6] text-white text-[11px] font-medium rounded-lg flex items-center justify-center gap-2 hover:bg-[#7c3aed] transition-colors disabled:opacity-60"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : '⚡'}
          {loading ? 'Analyzing…' : 'Run AI Analysis'}
        </button>
      </div>
    )
  }

  const PRIORITY_STYLES: Record<string, string> = {
    CRITICAL: 'text-[#ef4444]',
    HIGH: 'text-[#f59e0b]',
    MEDIUM: 'text-[#8b5cf6]',
    LOW: 'text-[#4a4a6a]',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Priority badge */}
      <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl border border-white/[0.04]">
        <div>
          <p className="text-[8px] tracking-[1.5px] uppercase text-[#4a4a6a] mb-1">Priority</p>
          <p className={cn('text-[13px] font-semibold', PRIORITY_STYLES[analysis.priority])}>
            {analysis.priority}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[8px] tracking-[1.5px] uppercase text-[#4a4a6a] mb-1">Urgency</p>
          <p className="text-[13px] font-semibold text-white font-mono">{analysis.urgencyScore}<span className="text-[10px] text-[#4a4a6a]">/10</span></p>
        </div>
      </div>

      {/* Urgency bar */}
      <div className="space-y-1.5">
        <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${analysis.urgencyScore * 10}%` }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{
              background: `linear-gradient(90deg, #8b5cf6, ${analysis.urgencyScore >= 8 ? '#ef4444' : analysis.urgencyScore >= 5 ? '#f59e0b' : '#10b981'})`,
            }}
          />
        </div>
      </div>

      {/* Analysis fields */}
      <div className="space-y-2.5">
        {[
          { label: 'Category', value: analysis.category },
          { label: 'Intent', value: analysis.intent },
          { label: 'Sentiment', value: analysis.sentiment },
          analysis.deadlineText && { label: 'Deadline', value: analysis.deadlineText, highlight: '#ef4444' },
          analysis.amount && { label: 'Amount', value: analysis.amount, highlight: '#10b981' },
        ].filter(Boolean).map((row: any, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="text-[10px] text-[#4a4a6a] w-[68px] shrink-0 mt-0.5">{row.label}</span>
            <span className="text-[11px] text-white flex-1" style={row.highlight ? { color: row.highlight } : {}}>
              {row.value}
            </span>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="p-3 bg-[#8b5cf6]/[0.04] border border-[#8b5cf6]/10 rounded-xl">
        <p className="text-[8px] tracking-[1.5px] uppercase text-[#8b5cf6] mb-2">AI Summary</p>
        <p className="text-[11px] text-[#eeeef5]/75 leading-relaxed">{analysis.summary}</p>
      </div>

      {/* Suggested action */}
      {analysis.suggestedAction && (
        <div className="p-3 bg-[#10b981]/[0.04] border border-[#10b981]/12 rounded-xl">
          <p className="text-[8px] tracking-[1.5px] uppercase text-[#10b981] mb-1.5">Suggested Action</p>
          <p className="text-[11px] text-[#eeeef5]/75">{analysis.suggestedAction}</p>
        </div>
      )}

      {/* Task extracted */}
      {analysis.taskText && (
        <div className="flex items-start gap-2 p-2.5 bg-[#10b981]/[0.04] border border-[#10b981]/12 rounded-xl">
          <CheckCircle size={12} className="text-[#10b981] mt-0.5 shrink-0" />
          <p className="text-[11px] text-[#10b981]">{analysis.taskText}</p>
        </div>
      )}

      {/* Confidence */}
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-[#4a4a6a]">AI confidence</span>
        <span className="text-[#8888aa] font-mono">{Math.round(analysis.confidenceScore * 100)}%</span>
      </div>
      <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${analysis.confidenceScore * 100}%` }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
          className="h-full rounded-full bg-[#10b981]"
        />
      </div>

      <button
        onClick={onAnalyze}
        disabled={loading}
        className="flex items-center gap-1.5 text-[10px] text-[#4a4a6a] hover:text-[#8888aa] transition-colors disabled:opacity-40"
      >
        <RefreshCw size={9} className={loading ? 'animate-spin' : ''} />
        Re-analyze
      </button>
    </motion.div>
  )
}

function ReplyTab({ analysis, emailId, onAnalyze, loading }: any) {
  const [style, setStyle] = useState<'short' | 'professional' | 'friendly'>('professional')
  const [sent, setSent] = useState(false)

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

  if (!analysis?.replyProfessional) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <p className="text-[11px] text-[#4a4a6a]">Analyze the email first to get AI reply suggestions</p>
        </div>
        <button
          onClick={onAnalyze}
          disabled={loading}
          className="w-full py-2.5 bg-[#8b5cf6] text-white text-[11px] font-medium rounded-lg flex items-center justify-center gap-2 hover:bg-[#7c3aed] transition-all disabled:opacity-60"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : '⚡'}
          {loading ? 'Generating…' : 'Generate Replies'}
        </button>
      </div>
    )
  }

  const replies: Record<string, string> = {
    short: analysis.replyShort,
    professional: analysis.replyProfessional,
    friendly: analysis.replyFriendly,
  }

  if (sent) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center gap-3 py-12 text-center"
      >
        <div className="w-10 h-10 rounded-xl bg-[#10b981]/12 border border-[#10b981]/20 flex items-center justify-center">
          <CheckCircle size={18} className="text-[#10b981]" />
        </div>
        <p className="text-[12px] text-[#10b981] font-medium">Reply sent!</p>
        <button onClick={() => setSent(false)} className="text-[10px] text-[#4a4a6a] hover:text-[#8888aa] underline">
          Send another
        </button>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
      {/* Style tabs */}
      <div className="flex gap-1 bg-white/[0.02] rounded-lg p-1">
        {(['short', 'professional', 'friendly'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStyle(s)}
            className={cn(
              'flex-1 py-1.5 rounded-md text-[9px] transition-all capitalize',
              style === s
                ? 'bg-[#8b5cf6]/20 text-[#a78bfa]'
                : 'text-[#4a4a6a] hover:text-[#8888aa]'
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Reply text */}
      <div
        contentEditable
        suppressContentEditableWarning
        className="bg-[#0c0c1a] border border-white/[0.06] rounded-xl p-3 text-[11.5px] leading-relaxed text-[#eeeef5] min-h-[100px] outline-none focus:border-[#8b5cf6]/30 transition-colors"
      >
        {replies[style]}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => sendMutation.mutate(replies[style])}
          disabled={sendMutation.isPending}
          className="flex-1 py-2 bg-[#8b5cf6] text-white text-[11px] font-medium rounded-lg hover:bg-[#7c3aed] transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {sendMutation.isPending ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
          {sendMutation.isPending ? 'Sending…' : 'Send'}
        </button>
        <button
          onClick={() => navigator.clipboard.writeText(replies[style])}
          className="px-3 py-2 border border-white/[0.06] text-[#8888aa] hover:text-white hover:border-white/[0.1] rounded-lg text-[10px] transition-all"
        >
          <Copy size={12} />
        </button>
      </div>
    </motion.div>
  )
}

function MeetingTab({ analysis }: any) {
  const [scheduled, setScheduled] = useState(false)

  if (!analysis?.meetingDetected) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
          <Calendar size={16} className="text-[#4a4a6a]" />
        </div>
        <p className="text-[11px] text-[#4a4a6a]">No meeting detected in this email</p>
      </div>
    )
  }

  if (scheduled) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center gap-3 py-12 text-center"
      >
        <div className="w-10 h-10 rounded-xl bg-[#10b981]/12 border border-[#10b981]/20 flex items-center justify-center">
          <CheckCircle size={18} className="text-[#10b981]" />
        </div>
        <p className="text-[12px] text-[#10b981] font-medium">Meeting scheduled!</p>
        <p className="text-[10.5px] text-[#4a4a6a]">Invites sent to all participants</p>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="p-4 bg-[#f59e0b]/[0.04] border border-[#f59e0b]/15 rounded-xl">
        <p className="text-[8px] tracking-[1.5px] uppercase text-[#f59e0b] mb-3">Meeting Detected</p>
        {analysis.meetingTime && (
          <p className="font-cormorant text-2xl font-light text-white mb-1">{analysis.meetingTime}</p>
        )}
        {Array.isArray(analysis.meetingParticipants) && analysis.meetingParticipants.length > 0 && (
          <p className="text-[10.5px] text-[#8888aa]">
            Participants: {analysis.meetingParticipants.join(', ')}
          </p>
        )}
      </div>

      <button
        onClick={() => setScheduled(true)}
        className="w-full py-2.5 bg-[#f59e0b] text-white font-medium text-[11px] rounded-lg hover:bg-[#d97706] transition-colors flex items-center justify-center gap-2"
      >
        <Calendar size={12} />
        Schedule in Calendar
      </button>
    </motion.div>
  )
}
