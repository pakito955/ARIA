'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { CheckCircle, Send, Calendar, Copy, RefreshCw, Loader2 } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function AnalysisPanel() {
  const { selectedEmailId, rightPanel, setRightPanel } = useAppStore()
  const qc = useQueryClient()

  // Fetch analysis for selected email
  const { data: email } = useQuery({
    queryKey: ['email', selectedEmailId],
    queryFn: async () => {
      const res = await fetch(`/api/emails/${selectedEmailId}`)
      return res.json()
    },
    enabled: !!selectedEmailId,
  })

  // Analyze mutation
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
    <aside className="flex flex-col bg-[#0d0d1a] border-l border-white/[0.055] overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-white/[0.055]">
        {(['analysis', 'reply', 'meeting'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setRightPanel(tab)}
            className={cn(
              'flex-1 py-3 text-[9px] uppercase tracking-[1.2px] transition-all',
              rightPanel === tab
                ? 'text-white border-b-2 border-[#e8c97a]'
                : 'text-[#8888aa] hover:text-white border-b-2 border-transparent'
            )}
          >
            {tab === 'analysis' ? 'Analiza' : tab === 'reply' ? 'Odgovori' : 'Sastanak'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3.5">
        {!selectedEmailId ? (
          <EmptyState icon="✉" text="Odaberi email za AI analizu" />
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

// ─── Analysis Tab ─────────────────────────────────────────────────────────────

function AnalysisTab({ analysis, onAnalyze, loading }: any) {
  if (!analysis) {
    return (
      <div className="space-y-3">
        <EmptyState icon="⚡" text="Klikni Analiziraj na emailu ili ovdje" />
        <button
          onClick={onAnalyze}
          disabled={loading}
          className="w-full py-2.5 bg-[#e8c97a]/[0.08] border border-[#e8c97a]/20 text-[#e8c97a] text-[11px] rounded flex items-center justify-center gap-2 hover:bg-[#e8c97a]/14 transition-all disabled:opacity-50"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : '⚡'}
          {loading ? 'Analiziram…' : 'AI Analiza'}
        </button>
      </div>
    )
  }

  const priorityColor: Record<string, string> = {
    CRITICAL: 'text-[#f4a0b5]',
    HIGH: 'text-[#e8c97a]',
    MEDIUM: 'text-[#7eb8f7]',
    LOW: 'text-[#5a5a78]',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      {/* Main analysis block */}
      <div className="bg-[#e8c97a]/[0.04] border border-[#e8c97a]/10 rounded p-3">
        <p className="text-[8px] tracking-[2px] uppercase text-[#e8c97a] mb-3">⚡ ARIA · Analiza</p>

        <Row label="Prioritet" value={analysis.priority} className={priorityColor[analysis.priority]} />
        <Row label="Kategorija" value={analysis.category} />
        <Row label="Namjera" value={analysis.intent} />
        {analysis.deadlineText && (
          <Row label="Rok" value={analysis.deadlineText} className="text-[#f4a0b5]" />
        )}
        {analysis.amount && (
          <Row label="Iznos" value={analysis.amount} className="text-[#4fd1c5]" />
        )}
        <Row label="Akcija" value={analysis.suggestedAction} className="text-[#4fd1c5]" />
      </div>

      {/* Urgency score bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px]">
          <span className="text-[#8888aa]">Hitnost</span>
          <span className="text-white font-mono">{analysis.urgencyScore}/10</span>
        </div>
        <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${analysis.urgencyScore * 10}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ background: `hsl(${120 - analysis.urgencyScore * 12}, 70%, 65%)` }}
          />
        </div>
      </div>

      {/* Confidence */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px]">
          <span className="text-[#8888aa]">Pouzdanost AI</span>
          <span className="text-white font-mono">{Math.round(analysis.confidenceScore * 100)}%</span>
        </div>
        <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${analysis.confidenceScore * 100}%` }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
            className="h-full rounded-full bg-[#4fd1c5]"
          />
        </div>
      </div>

      {/* Summary */}
      <div className="bg-[#121224] rounded p-2.5">
        <p className="text-[10px] text-[#8888aa] mb-1.5 uppercase tracking-[1px]">Sažetak</p>
        <p className="text-[11.5px] text-[#eeeef5]/75 leading-relaxed">{analysis.summary}</p>
      </div>

      {/* Task created */}
      {analysis.taskText && (
        <div className="flex items-start gap-2 bg-[#86efac]/[0.05] border border-[#86efac]/12 rounded p-2.5">
          <CheckCircle size={12} className="text-[#86efac] mt-0.5 shrink-0" />
          <p className="text-[11px] text-[#86efac]">Task: {analysis.taskText}</p>
        </div>
      )}

      {/* Refresh */}
      <button
        onClick={onAnalyze}
        disabled={loading}
        className="flex items-center gap-1.5 text-[10px] text-[#5a5a78] hover:text-[#8888aa] transition-colors disabled:opacity-40"
      >
        <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
        Ponovi analizu
      </button>
    </motion.div>
  )
}

// ─── Reply Tab ────────────────────────────────────────────────────────────────

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
      <div className="space-y-3">
        <EmptyState icon="✉" text="Analiziraj email za AI prijedloge odgovora" />
        <button
          onClick={onAnalyze}
          disabled={loading}
          className="w-full py-2.5 bg-[#e8c97a]/[0.08] border border-[#e8c97a]/20 text-[#e8c97a] text-[11px] rounded flex items-center justify-center gap-2 hover:bg-[#e8c97a]/14 transition-all disabled:opacity-50"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : '⚡'}
          Generiši odgovore
        </button>
      </div>
    )
  }

  const replies = {
    short: analysis.replyShort,
    professional: analysis.replyProfessional,
    friendly: analysis.replyFriendly,
  }

  const currentReply = replies[style]

  if (sent) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center gap-3 py-10 text-center"
      >
        <div className="text-3xl">✅</div>
        <p className="text-[#86efac] font-medium text-sm">Odgovor poslan!</p>
        <button
          onClick={() => setSent(false)}
          className="text-[10px] text-[#5a5a78] hover:text-[#8888aa] underline"
        >
          Novi odgovor
        </button>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
      {/* Style selector */}
      <div className="flex gap-1.5">
        {(['short', 'professional', 'friendly'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStyle(s)}
            className={cn(
              'flex-1 py-1.5 rounded text-[10px] border transition-all',
              style === s
                ? 'border-[#e8c97a]/30 text-[#e8c97a] bg-[#e8c97a]/[0.05]'
                : 'border-white/[0.07] text-[#8888aa] hover:border-white/[0.11] hover:text-white'
            )}
          >
            {s === 'short' ? 'Kratak' : s === 'professional' ? 'Profesionalan' : 'Prijateljski'}
          </button>
        ))}
      </div>

      {/* Reply text */}
      <div
        contentEditable
        suppressContentEditableWarning
        className="bg-[#121224] border border-white/[0.07] rounded p-3 text-[11.5px] leading-relaxed text-[#eeeef5] min-h-[100px] outline-none focus:border-[#e8c97a]/30"
      >
        {currentReply}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => sendMutation.mutate(currentReply)}
          disabled={sendMutation.isPending}
          className="flex-1 py-2 bg-[#e8c97a] text-[#080810] font-semibold text-[11px] rounded hover:bg-[#f5e0a0] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {sendMutation.isPending ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Send size={12} />
          )}
          {sendMutation.isPending ? 'Šaljem…' : 'Pošalji'}
        </button>
        <button
          onClick={() => navigator.clipboard.writeText(currentReply)}
          className="px-3 py-2 border border-white/[0.11] text-[#8888aa] hover:text-white hover:border-[#e8c97a]/30 rounded text-[10px] transition-all"
          title="Kopiraj"
        >
          <Copy size={13} />
        </button>
      </div>
    </motion.div>
  )
}

// ─── Meeting Tab ──────────────────────────────────────────────────────────────

function MeetingTab({ analysis }: any) {
  const [scheduled, setScheduled] = useState(false)

  if (!analysis?.meetingDetected) {
    return <EmptyState icon="📅" text="Nema detektovanog sastanka u emailu" />
  }

  if (scheduled) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center gap-3 py-10 text-center"
      >
        <div className="text-3xl">✅</div>
        <p className="text-[#86efac] font-medium text-sm">Sastanak zakazan!</p>
        <p className="text-[10.5px] text-[#8888aa]">Inviti poslani svim učesnicima</p>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
      <div className="bg-[#f4a0b5]/[0.04] border border-[#f4a0b5]/12 rounded p-3">
        <p className="text-[8px] tracking-[2px] uppercase text-[#f4a0b5] mb-2.5">ARIA detektovao sastanak</p>
        {analysis.meetingTime && (
          <p className="font-cormorant text-2xl font-light mb-1">{analysis.meetingTime}</p>
        )}
        {analysis.meetingParticipants?.length > 0 && (
          <p className="text-[10.5px] text-[#8888aa]">
            Učesnici: {analysis.meetingParticipants.join(', ')}
          </p>
        )}
      </div>
      <button
        onClick={() => setScheduled(true)}
        className="w-full py-2.5 bg-[#f4a0b5] text-white font-semibold text-[11px] rounded hover:bg-[#f8b4c5] transition-all flex items-center justify-center gap-2"
      >
        <Calendar size={12} />
        Zakaži u Calendar
      </button>
    </motion.div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex gap-2 mb-1.5">
      <span className="text-[10.5px] text-[#8888aa] w-[70px] shrink-0">{label}</span>
      <span className={cn('text-[11.5px] text-white', className)}>{value}</span>
    </div>
  )
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
      <span className="text-2xl opacity-20">{icon}</span>
      <p className="text-[11px] text-[#5a5a78]">{text}</p>
    </div>
  )
}
