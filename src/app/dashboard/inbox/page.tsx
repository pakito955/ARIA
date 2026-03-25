'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, SlidersHorizontal, RefreshCw, Send, Copy, Calendar, CheckCircle, Loader2, ArrowLeft, Paperclip, Inbox, Maximize2, Minimize2, User, Bell, BrainCircuit, Circle, CalendarDays, CheckSquare, Star, AlertCircle, ChevronDown, AlertTriangle, RefreshCcw } from 'lucide-react'
import { EmailCard } from '@/components/inbox/EmailCard'
import { TriageMode } from '@/components/TriageMode'
import { SnoozePickerModal } from '@/components/inbox/SnoozePickerModal'
import { BulkActionBar } from '@/components/inbox/BulkActionBar'
import { ThreadView } from '@/components/inbox/ThreadView'
import { ContactPanel } from '@/components/inbox/ContactPanel'
import { SmartReply } from '@/components/inbox/SmartReply'
import { MeetingBooking } from '@/components/inbox/MeetingBooking'
import { EmailCardSkeleton } from '@/components/ui/Skeletons'
import { useAppStore, useInboxFilters, useEmailSelection, toast } from '@/lib/store'
import { cn } from '@/lib/utils'
import { useDebounce } from '@/hooks/useDebounce'
import { useInboxKeyboard } from '@/hooks/useInboxKeyboard'
import { format, formatDistanceToNow } from 'date-fns'

const FILTERS = [
  { key: 'all',      label: 'All',      Icon: Inbox },
  { key: 'unread',   label: 'Unread',   Icon: Circle },
  { key: 'critical', label: 'Critical', Icon: AlertCircle },
  { key: 'meeting',  label: 'Meetings', Icon: CalendarDays },
  { key: 'task',     label: 'Tasks',    Icon: CheckSquare },
  { key: 'starred',  label: 'Starred',  Icon: Star },
] as const

export default function InboxPage() {
  const { emailFilter, setEmailFilter, searchQuery, setSearchQuery, focusMode, setFocusMode } = useInboxFilters()
  const { selectedEmailId, setSelectedEmail } = useEmailSelection()
  const setContactPanelEmail = useAppStore((s) => s.setContactPanelEmail)
  const newEmailsCount = useAppStore((s) => s.newEmailsCount)
  const setNewEmailsCount = useAppStore((s) => s.setNewEmailsCount)
  const [sort, setSort] = useState<'newest' | 'priority'>('newest')
  const [originalExpanded, setOriginalExpanded] = useState(true)
  const [replyStyle, setReplyStyle] = useState<'short' | 'professional' | 'friendly'>('professional')
  const [editedReply, setEditedReply] = useState('')
  const [sent, setSent] = useState(false)
  const [triageMode, setTriageMode] = useState(false)
  const [snoozeEmailId, setSnoozeEmailId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [smartSearch, setSmartSearch] = useState(false)
  const [followupNote, setFollowupNote] = useState('')
  const [followupEmailId, setFollowupEmailId] = useState<string | null>(null)
  const [showSmartReply, setShowSmartReply] = useState(false)
  const [regenerateModal, setRegenerateModal] = useState(false)
  const [regenerateInstructions, setRegenerateInstructions] = useState('')
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const qc = useQueryClient()

  // Real-time sync via SSE
  useEffect(() => {
    const es = new EventSource('/api/emails/stream')
    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        if (msg.type === 'update' && msg.newEmails > 0) {
          qc.invalidateQueries({ queryKey: ['emails'] })
          setNewEmailsCount(msg.newEmails)
          setTimeout(() => setNewEmailsCount(0), 4000)
        }
      } catch {}
    }
    return () => es.close()
  }, [qc, setNewEmailsCount])

  const debouncedSearch = useDebounce(searchQuery, 300)

  const [syncForced, setSyncForced] = useState(false)

  const { data: emailsData, isLoading, refetch } = useQuery({
    queryKey: ['emails', emailFilter, debouncedSearch, sort, focusMode],
    queryFn: async () => {
      const params = new URLSearchParams({
        filter: emailFilter,
        sort,
        limit: '50',
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(syncForced && { sync: 'true' }),
        ...(focusMode && { focusMode: 'true' }),
      })
      setSyncForced(false)
      const res = await fetch(`/api/emails?${params}`)
      if (!res.ok) throw new Error('Failed to fetch emails')
      return res.json()
    },
    staleTime: 30_000,
  })

  const { data: emailDetail } = useQuery({
    queryKey: ['email', selectedEmailId],
    queryFn: async () => {
      const res = await fetch(`/api/emails/${selectedEmailId}`)
      return res.json()
    },
    enabled: !!selectedEmailId,
    staleTime: 30_000,
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
      qc.invalidateQueries({ queryKey: ['emails'] })
      qc.invalidateQueries({ queryKey: ['email', selectedEmailId] })
    },
  })

  const sendMutation = useMutation({
    mutationFn: async ({ emailId, replyText, style }: any) => {
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
      toast.success('Reply sent successfully', 'Email sent')
    },
    onError: () => toast.error('Failed to send reply. Try again.', 'Send error'),
  })

  const emails = emailsData?.data || []
  const total = emailsData?.total || 0

  // Keyboard shortcuts (needs emails list)
  useInboxKeyboard(emails)

  const selectedEmail = emailDetail?.data
  const analysis = selectedEmail?.analysis

  const replies: Record<string, string> = {
    short: analysis?.replyShort || '',
    professional: analysis?.replyProfessional || '',
    friendly: analysis?.replyFriendly || '',
  }

  const currentReply = replies[replyStyle]

  // Sync editedReply when email or reply style changes; reset original expand on new email
  useEffect(() => {
    setEditedReply(currentReply)
    setShowSmartReply(false)
    setOriginalExpanded(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEmailId, replyStyle, currentReply])

  const followupMutation = useMutation({
    mutationFn: async ({ emailId, daysFromNow, note }: { emailId: string; daysFromNow: number; note?: string }) => {
      const dueAt = new Date()
      dueAt.setDate(dueAt.getDate() + daysFromNow)
      const res = await fetch('/api/followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailId, dueAt: dueAt.toISOString(), note }),
      })
      return res.json()
    },
    onSuccess: () => {
      toast.success('Follow-up reminder set', 'Reminder')
      setFollowupEmailId(null)
      setFollowupNote('')
      qc.invalidateQueries({ queryKey: ['followups'] })
    },
  })

  const handleArchive = useCallback((id: string) => {
    fetch(`/api/emails/${id}/archive`, { method: 'POST' })
      .then((res) => {
        if (!res.ok) throw new Error('Archive failed')
        qc.invalidateQueries({ queryKey: ['emails'] })
        if (selectedEmailId === id) setSelectedEmail(null)
        toast.success('Email archived')
      })
      .catch(() => toast.error('Failed to archive email'))
  }, [qc, selectedEmailId, setSelectedEmail])

  const handleReply = useCallback((id: string) => {
    setSelectedEmail(id)
    setTriageMode(false)
  }, [setSelectedEmail])

  const handleTask = useCallback((id: string) => {
    fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailId: id }),
    }).then(() => toast.success('Task created from email', 'Task added'))
  }, [])

  const handleSnooze = useCallback((id: string) => {
    setSnoozeEmailId(id)
  }, [])

  const handleSnoozeConfirm = useCallback((snoozeUntil: Date) => {
    if (!snoozeEmailId) return
    fetch('/api/emails/snooze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailId: snoozeEmailId, snoozeUntil: snoozeUntil.toISOString() }),
    }).then(() => {
      qc.invalidateQueries({ queryKey: ['emails'] })
      setSnoozeEmailId(null)
    })
  }, [snoozeEmailId, qc])

  const handleBulkAction = useCallback((action: 'archive' | 'read' | 'delete' | 'analyze') => {
    if (selectedIds.size === 0) return
    fetch('/api/emails/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailIds: Array.from(selectedIds), action }),
    }).then(() => {
      qc.invalidateQueries({ queryKey: ['emails'] })
      if (action !== 'analyze') setSelectedIds(new Set())
    })
  }, [selectedIds, qc])

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleAnalyze = useCallback((id: string) => {
    analyzeMutation.mutate(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analyzeMutation.mutate])

  return (
    <>
      {/* Contact Panel */}
      <ContactPanel />

      {/* New emails notification */}
      <AnimatePresence>
        {newEmailsCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-bold text-white shadow-xl bg-accent"
          >
            ↑ {newEmailsCount} new email{newEmailsCount > 1 ? 's' : ''}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Triage Mode Overlay */}
      <AnimatePresence>
        {triageMode && emails.length > 0 && (
          <TriageMode
            emails={emails}
            onArchive={handleArchive}
            onReply={handleReply}
            onTask={handleTask}
            onSnooze={handleSnooze}
            onClose={() => setTriageMode(false)}
          />
        )}
      </AnimatePresence>

      {/* Snooze Modal */}
      <AnimatePresence>
        {snoozeEmailId && (
          <SnoozePickerModal
            onConfirm={handleSnoozeConfirm}
            onClose={() => setSnoozeEmailId(null)}
          />
        )}
      </AnimatePresence>

      {/* Regenerate Modal — replaces window.prompt() */}
      <AnimatePresence>
        {regenerateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={() => setRegenerateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="card p-5 w-full max-w-sm mx-4"
            >
              <p className="text-[var(--text-1)] font-medium text-sm mb-3">Regenerate Reply</p>
              <textarea
                autoFocus
                value={regenerateInstructions}
                onChange={(e) => setRegenerateInstructions(e.target.value)}
                placeholder="Instructions (optional) — e.g. make it shorter, more formal..."
                className="input-base w-full p-2.5 text-sm resize-none h-20 mb-3"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setRegenerateModal(false); setRegenerateInstructions('') }}
                  className="btn-ghost px-3 py-1.5 text-sm"
                >
                  Cancel
                </button>
                <button
                  disabled={isRegenerating}
                  onClick={async () => {
                    if (!selectedEmail) return
                    setIsRegenerating(true)
                    try {
                      const r = await fetch('/api/ai/regenerate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ emailId: selectedEmail.id, style: replyStyle, instructions: regenerateInstructions }),
                      })
                      const d = await r.json()
                      if (d.reply) setEditedReply(d.reply)
                    } finally {
                      setIsRegenerating(false)
                      setRegenerateModal(false)
                      setRegenerateInstructions('')
                    }
                  }}
                  className="btn-primary px-4 py-1.5 text-sm flex items-center gap-1.5"
                >
                  {isRegenerating ? <Loader2 size={13} className="animate-spin" /> : <RefreshCcw size={13} />}
                  {isRegenerating ? 'Generating…' : 'Regenerate'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Action Bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <BulkActionBar
            count={selectedIds.size}
            onAction={handleBulkAction}
            onClear={() => setSelectedIds(new Set())}
          />
        )}
      </AnimatePresence>

    <div className="flex h-full">
      {/* Left: Email List — full on mobile, 380px on desktop */}
      <div
        className={cn(
          'shrink-0 flex flex-col border-r border-[var(--border)] h-full',
          'w-full md:w-[360px] lg:w-[380px]',
          selectedEmailId ? 'hidden md:flex' : 'flex'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--border)]">
          <div>
            <h1 className="font-outfit text-xl md:text-2xl font-semibold tracking-tight">Inbox</h1>
            <p className="text-[10px] text-[var(--text-3)] mt-0.5">{total} messages · AI sorted</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setTriageMode(true)}
              disabled={emails.length === 0}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)] text-[var(--accent-text)] text-[10px] font-medium hover:bg-[var(--accent)]/18 transition-all disabled:opacity-30"
            >
              <Inbox size={11} />
              Triage
            </button>
            <button
              onClick={() => setFocusMode(!focusMode)}
              title={focusMode ? 'Exit focus mode (F)' : 'Focus mode (F)'}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-bold transition-all",
                focusMode 
                  ? "bg-accent text-white shadow-md border border-accent"
                  : "bg-surface border border-border-medium text-text-2 hover:bg-hover hover:text-text-1"
              )}
            >
              {focusMode ? <Minimize2 size={11} /> : <Maximize2 size={11} />}
              {focusMode ? 'Exit Focus' : 'Focus Mode'}
            </button>
            <button
              onClick={() => { setSyncForced(true); refetch() }}
              title="Sync inbox"
              className="p-2 rounded-xl text-[var(--text-3)] hover:text-[var(--text-2)] hover:bg-[var(--bg-hover)] transition-all"
            >
              <RefreshCw size={13} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2.5 border-b border-[var(--border)] space-y-2">
          <div className={cn(
            'flex items-center gap-2 border rounded-lg px-3 py-2 transition-colors',
            smartSearch ? 'bg-[var(--accent)]/5 border-[var(--accent)]' : 'bg-[var(--bg-card)] border-[var(--border)]'
          )}>
            {smartSearch
              ? <BrainCircuit size={12} className="text-[var(--accent-text)] shrink-0" />
              : <Search size={12} className="text-[var(--text-3)] shrink-0" />
            }
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={smartSearch ? 'Ask ARIA anything about your emails…' : 'Search emails…'}
              className="flex-1 bg-transparent text-[12px] text-[var(--text-1)] placeholder:text-[var(--text-3)] outline-none"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-[var(--text-3)] text-xs hover:text-[var(--text-2)]">✕</button>
            )}
          </div>
          <button
            onClick={() => setSmartSearch(!smartSearch)}
            className={cn(
              'flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-lg border transition-all',
              smartSearch
                ? 'border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent-text)]'
                : 'border-[var(--border)] text-[var(--text-3)] hover:border-[var(--border-medium)] hover:text-[var(--text-2)]'
            )}
          >
            <BrainCircuit size={10} />
            {smartSearch ? 'AI Search ON' : 'AI Search'}
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-[var(--border)] overflow-x-auto">
          {FILTERS.map((f) => {
            const active = emailFilter === f.key
            return (
              <button
                key={f.key}
                onClick={() => setEmailFilter(f.key)}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10.5px] whitespace-nowrap transition-all shrink-0',
                  active
                    ? 'bg-[var(--accent)]/12 text-[var(--accent-text)] border border-[var(--accent)]'
                    : 'text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--bg-hover)] border border-transparent'
                )}
              >
                <f.Icon size={9} />
                {f.label}
              </button>
            )
          })}

          <button
            onClick={() => setSort(sort === 'newest' ? 'priority' : 'newest')}
            className="ml-auto flex items-center gap-1 text-[9.5px] text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors shrink-0"
          >
            <SlidersHorizontal size={10} />
            {sort === 'newest' ? 'Newest' : 'Priority'}
          </button>
        </div>

        {/* Email list */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {isLoading ? (
            <EmailCardSkeleton count={8} />
          ) : emails.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="relative">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                >
                  <svg width="26" height="22" viewBox="0 0 26 22" fill="none">
                    <rect x="1" y="1" width="24" height="20" rx="3" stroke="var(--border-medium)" strokeWidth="1.5"/>
                    <path d="M1 5l12 8 12-8" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <div
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center bg-green border-2 border-card"
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
              <div className="text-center">
                <p className="text-[13px] font-medium text-[var(--text-1)] mb-1">
                  {searchQuery ? 'No results' : emailFilter === 'all' ? 'Inbox is clear' : `No ${emailFilter} emails`}
                </p>
                <p className="text-[11px] text-[var(--text-3)]">
                  {searchQuery ? `Nothing matching "${searchQuery}"` : 'ARIA is watching for new messages'}
                </p>
              </div>
            </div>
          ) : (
            emails.map((email: any, i: number) => (
              <EmailCard
                key={email.id}
                email={email}
                index={i}
                onAnalyze={handleAnalyze}
                analyzing={analyzeMutation.isPending && analyzeMutation.variables === email.id}
                selected={selectedIds.has(email.id)}
                onToggleSelect={handleToggleSelect}
              />
            ))
          )}
        </div>
      </div>

      {/* Right: Email Detail — full on mobile when email selected */}
      <div
        className={cn(
          'flex-1 flex flex-col overflow-hidden',
          !selectedEmailId ? 'hidden md:flex' : 'flex'
        )}
      >
        {/* Mobile back button */}
        {selectedEmailId && (
          <div className="md:hidden flex items-center gap-2 px-4 py-3 border-b border-[var(--border)] shrink-0">
            <button
              onClick={() => setSelectedEmail(null)}
              className="flex items-center gap-1.5 text-[13px] text-[var(--text-2)] hover:text-white transition-colors touch-target"
            >
              <ArrowLeft size={16} />
              Back
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {!selectedEmailId ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8"
            >
              <div className="w-14 h-14 rounded-2xl bg-[var(--accent)]/10 border border-[var(--accent)] flex items-center justify-center">
                <span className="text-2xl">✉</span>
              </div>
              <div>
                <p className="text-[13px] text-[var(--text-2)]">Select an email to read</p>
                <p className="text-[11px] text-[var(--text-3)] mt-1">ARIA will analyze it instantly</p>
              </div>
            </motion.div>
          ) : !selectedEmail ? (
            <motion.div key="loading" className="flex-1 flex items-center justify-center">
              <Loader2 size={20} className="animate-spin text-[var(--accent-text)]" />
            </motion.div>
          ) : (
            <motion.div
              key={selectedEmail.id}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              {/* ── Email header ─────────────────────────────────── */}
              <div className="px-6 pt-5 pb-4 border-b border-[var(--border)] space-y-3">
                {/* Subject + AI badge */}
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-[16px] font-semibold text-[var(--text-1)] leading-snug tracking-tight flex-1 min-w-0">
                    {selectedEmail.subject || '(no subject)'}
                  </h2>
                  <div className="shrink-0 flex items-center gap-2">
                    {analysis ? (
                      <span className={cn(
                        'flex items-center gap-1.5 text-[9px] tracking-widest uppercase px-2.5 py-1 rounded-full border font-medium',
                        analysis.priority === 'CRITICAL'
                          ? 'bg-[var(--red)]/10 text-[var(--red)] border-[var(--red)]/30'
                          : analysis.priority === 'HIGH'
                          ? 'bg-[var(--amber)]/10 text-[var(--amber)] border-[var(--amber)]/30'
                          : 'bg-[var(--accent)]/10 text-[var(--accent-text)] border-[var(--accent)]/30'
                      )}>
                        <span className="w-1 h-1 rounded-full bg-current" />
                        {analysis.priority}
                      </span>
                    ) : (
                      <button
                        onClick={() => analyzeMutation.mutate(selectedEmail.id)}
                        disabled={analyzeMutation.isPending}
                        className="flex items-center gap-1.5 text-[10px] bg-[var(--accent)] text-white px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60"
                      >
                        {analyzeMutation.isPending ? <Loader2 size={10} className="animate-spin" /> : '⚡'}
                        {analyzeMutation.isPending ? 'Analyzing…' : 'Analyze'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Metadata grid */}
                <div className="grid gap-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[9px] uppercase tracking-[1.5px] text-[var(--text-3)] w-6 shrink-0">From</span>
                    <button
                      onClick={() => setContactPanelEmail(selectedEmail.fromEmail)}
                      className="flex items-center gap-1.5 group"
                    >
                      <span className="text-[12px] font-medium text-[var(--text-1)] group-hover:text-[var(--accent-text)] transition-colors">
                        {selectedEmail.fromName || selectedEmail.fromEmail}
                      </span>
                      {selectedEmail.fromName && (
                        <span className="text-[11px] text-[var(--text-3)]">&lt;{selectedEmail.fromEmail}&gt;</span>
                      )}
                    </button>
                  </div>
                  {Array.isArray(selectedEmail.toEmails) && selectedEmail.toEmails.length > 0 && (
                    <div className="flex items-baseline gap-2">
                      <span className="text-[9px] uppercase tracking-[1.5px] text-[var(--text-3)] w-6 shrink-0">To</span>
                      <span className="text-[11px] text-[var(--text-2)] truncate">{selectedEmail.toEmails.join(', ')}</span>
                    </div>
                  )}
                  {Array.isArray(selectedEmail.ccEmails) && selectedEmail.ccEmails.length > 0 && (
                    <div className="flex items-baseline gap-2">
                      <span className="text-[9px] uppercase tracking-[1.5px] text-[var(--text-3)] w-6 shrink-0">Cc</span>
                      <span className="text-[11px] text-[var(--text-2)] truncate">{selectedEmail.ccEmails.join(', ')}</span>
                    </div>
                  )}
                  {selectedEmail.receivedAt && !isNaN(new Date(selectedEmail.receivedAt).getTime()) && (
                    <div className="flex items-baseline gap-2">
                      <span className="text-[9px] uppercase tracking-[1.5px] text-[var(--text-3)] w-6 shrink-0">Date</span>
                      <span className="text-[11px] text-[var(--text-2)]">
                        {format(new Date(selectedEmail.receivedAt), 'EEEE, d MMM yyyy · HH:mm')}
                        <span className="text-[var(--text-3)] ml-2">({formatDistanceToNow(new Date(selectedEmail.receivedAt), { addSuffix: true })})</span>
                      </span>
                    </div>
                  )}
                  {selectedEmail.hasAttachments && (
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] uppercase tracking-[1.5px] text-[var(--text-3)] w-6 shrink-0" />
                      <span className="flex items-center gap-1 text-[10px] text-[var(--text-3)]">
                        <Paperclip size={10} />
                        Has attachments
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Scrollable content ───────────────────────────── */}
              <div className="flex-1 overflow-y-auto">

                {/* Original email body — shown by default */}
                <div className="mx-6 mt-5">
                  <button
                    onClick={() => setOriginalExpanded(!originalExpanded)}
                    className="flex items-center gap-2 text-[9px] uppercase tracking-[1.5px] text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors mb-3 group w-full"
                  >
                    <ChevronDown
                      size={11}
                      className={cn('transition-transform duration-200', originalExpanded && 'rotate-180')}
                    />
                    <span>Message</span>
                    <span className="flex-1 h-px bg-[var(--border)] ml-1" />
                  </button>

                  <AnimatePresence initial={false}>
                    {originalExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden"
                      >
                        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-hidden">
                          {selectedEmail.bodyHtml ? (
                            <div
                              className="px-5 py-4 text-[12.5px] text-[var(--text-1)] leading-relaxed prose prose-invert prose-sm max-w-none
                                [&_a]:text-[var(--accent-text)] [&_a]:no-underline [&_a:hover]:underline
                                [&_blockquote]:border-l-2 [&_blockquote]:border-[var(--border)] [&_blockquote]:pl-3 [&_blockquote]:text-[var(--text-3)]
                                [&_p]:mb-3 [&_p:last-child]:mb-0"
                              dangerouslySetInnerHTML={{ __html: selectedEmail.bodyHtml }}
                            />
                          ) : (
                            <div className="px-5 py-4">
                              <p className="text-[12.5px] text-[var(--text-1)] leading-[1.75] whitespace-pre-wrap break-words">
                                {selectedEmail.bodyText?.slice(0, 4000)}
                                {(selectedEmail.bodyText?.length || 0) > 4000 && (
                                  <span className="text-[var(--text-3)] italic"> …[truncated]</span>
                                )}
                              </p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* AI Summary */}
                {analysis && (
                  <div className="mx-6 mt-5">
                    <div className="rounded-2xl border border-[var(--accent)]/30 bg-gradient-to-br from-[var(--accent)]/[0.06] to-transparent p-4 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-48 h-full pointer-events-none bg-gradient-to-l from-[var(--accent)]/[0.03] to-transparent" />
                      <div className="flex items-center gap-2 mb-2.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                        <span className="text-[8px] tracking-[2.5px] uppercase text-[var(--accent-text)] font-semibold">ARIA · Summary</span>
                        <div className="ml-auto flex items-center gap-2">
                          {analysis.category && (
                            <span className="text-[9px] text-[var(--text-3)] bg-white/[0.04] px-2 py-0.5 rounded-full border border-[var(--border)]">
                              {analysis.category}
                            </span>
                          )}
                          <span className="text-[9px] text-[var(--text-3)] bg-white/[0.04] px-2 py-0.5 rounded-full border border-[var(--border)]">
                            Urgency {analysis.urgencyScore}/10
                          </span>
                        </div>
                      </div>
                      <p className="text-[12.5px] leading-relaxed text-[var(--text-1)]">{analysis.summary}</p>
                      {analysis.suggestedAction && (
                        <p className="text-[11px] text-[var(--accent-text)] mt-2.5 flex items-center gap-1.5">
                          <span className="text-[var(--accent)]">→</span>
                          {analysis.suggestedAction}
                        </p>
                      )}
                      {analysis.deadlineText && (
                        <p className="text-[11px] text-[var(--red)] mt-1.5 flex items-center gap-1.5">
                          <AlertTriangle size={10} />
                          Deadline: {analysis.deadlineText}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Meeting Booking Banner */}
                {analysis?.meetingDetected && (
                  <MeetingBooking emailId={selectedEmail.id} />
                )}

                {/* AI Actions */}
                {analysis && (
                  <div className="mx-6 mt-4">
                    <p className="text-[8px] tracking-[2px] uppercase text-[var(--text-3)] mb-3">AI Actions</p>

                    {/* Reply styles */}
                    {analysis.replyProfessional && (
                      <div className="mb-4">
                        <div className="flex gap-1.5 mb-2.5">
                          {(['short', 'professional', 'friendly'] as const).map((s) => (
                            <button
                              key={s}
                              onClick={() => { setReplyStyle(s); setSent(false) }}
                              className={cn(
                                'px-3 py-1.5 rounded-lg text-[10.5px] border transition-all capitalize',
                                replyStyle === s
                                  ? 'border-[var(--accent)] text-[var(--accent-text)] bg-[var(--accent)]/10'
                                  : 'border-[var(--border)] text-[var(--text-2)] hover:border-[var(--border-medium)] hover:text-white'
                              )}
                            >
                              {s === 'short' ? '⚡ Short' : s === 'professional' ? '👔 Professional' : '😊 Friendly'}
                            </button>
                          ))}
                        </div>

                        {sent ? (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex items-center gap-2 p-3 rounded-xl bg-green-subtle border border-green/20"
                          >
                            <CheckCircle size={14} className="text-[var(--green)]" />
                            <span className="text-[11px] text-[var(--green)]">Reply sent successfully</span>
                            <button onClick={() => setSent(false)} className="ml-auto text-[10px] text-[var(--text-3)] hover:text-[var(--text-2)]">
                              New reply
                            </button>
                          </motion.div>
                        ) : (
                          <>
                            <ToneChecker draft={editedReply} subject={selectedEmail.subject} />
                            <textarea
                              value={editedReply}
                              onChange={(e) => setEditedReply(e.target.value)}
                              rows={5}
                              className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-3.5 text-[12px] leading-relaxed text-[var(--text-1)] outline-none focus:border-[var(--accent)] transition-colors resize-none"
                            />
                            <div className="flex gap-2 mt-2 flex-wrap">
                              <button
                                onClick={() => sendMutation.mutate({ emailId: selectedEmail.id, replyText: editedReply, style: replyStyle })}
                                disabled={sendMutation.isPending}
                                className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white text-[11px] font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60"
                              >
                                {sendMutation.isPending ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                                {sendMutation.isPending ? 'Sending…' : 'Send Reply'}
                              </button>
                              <button
                                onClick={async () => {
                                  setIsSavingDraft(true)
                                  try {
                                    await fetch('/api/ai/draft', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ emailId: selectedEmail.id, draftText: editedReply, style: replyStyle }),
                                    })
                                  } finally {
                                    setIsSavingDraft(false)
                                  }
                                }}
                                disabled={isSavingDraft}
                                className="flex items-center gap-1.5 px-3 py-2 border border-[var(--border)] text-[var(--text-2)] text-[11px] rounded-lg hover:border-[var(--border-medium)] hover:text-white transition-all disabled:opacity-50"
                              >
                                {isSavingDraft ? <Loader2 size={11} className="animate-spin" /> : null}
                                Save Draft
                              </button>
                              <button
                                onClick={() => setRegenerateModal(true)}
                                className="flex items-center gap-1.5 px-3 py-2 border border-[var(--border)] text-[var(--text-2)] text-[11px] rounded-lg hover:border-[var(--border-medium)] hover:text-white transition-all"
                              >
                                <RefreshCcw size={11} />
                                Regenerate
                              </button>
                              <button
                                onClick={() => navigator.clipboard.writeText(editedReply)}
                                className="flex items-center gap-1.5 px-3 py-2 border border-[var(--border)] text-[var(--text-2)] text-[11px] rounded-lg hover:border-[var(--border-medium)] hover:text-white transition-all"
                              >
                                <Copy size={11} />
                                Copy
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Quick action buttons */}
                    <div className="flex gap-2 flex-wrap">
                      {!analysis.replyProfessional && (
                        <button
                          onClick={() => analyzeMutation.mutate(selectedEmail.id)}
                          disabled={analyzeMutation.isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--accent)]/10 border border-[var(--accent)] text-[var(--accent-text)] text-[10.5px] rounded-lg hover:bg-[var(--accent)]/18 transition-all"
                        >
                          {analyzeMutation.isPending ? <Loader2 size={10} className="animate-spin" /> : '⚡'}
                          Generate Replies
                        </button>
                      )}
                      <button
                        onClick={() => handleTask(selectedEmail.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-[var(--border)] text-[var(--text-2)] text-[10.5px] rounded-lg hover:border-[var(--border-medium)] hover:text-white transition-all"
                      >
                        <CheckCircle size={11} />
                        Create Task
                      </button>
                      <button
                        onClick={() => setFollowupEmailId(followupEmailId === selectedEmail.id ? null : selectedEmail.id)}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 border text-[10.5px] rounded-lg transition-all',
                          followupEmailId === selectedEmail.id
                            ? 'border-[var(--amber)] bg-[var(--amber)]/10 text-[var(--amber)]'
                            : 'border-[var(--border)] text-[var(--text-2)] hover:border-[var(--amber)]/40 hover:text-[var(--amber)]'
                        )}
                      >
                        <Bell size={11} />
                        Follow-up
                      </button>
                      <button
                        onClick={() => setShowSmartReply(!showSmartReply)}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 border text-[10.5px] rounded-lg transition-all',
                          showSmartReply
                            ? 'border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent-text)]'
                            : 'border-[var(--border)] text-[var(--text-2)] hover:border-[var(--border-medium)] hover:text-white'
                        )}
                      >
                        ✨ Smart Reply
                      </button>
                    </div>

                    {/* Follow-up picker */}
                    <AnimatePresence>
                      {followupEmailId === selectedEmail.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-2 p-3 rounded-xl border border-amber/30 bg-amber-subtle overflow-hidden"
                        >
                          <p className="text-[10px] uppercase tracking-[1.5px] text-[var(--amber)] mb-2">Set reminder</p>
                          <input
                            value={followupNote}
                            onChange={(e) => setFollowupNote(e.target.value)}
                            placeholder="Optional note…"
                            className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[11.5px] text-white placeholder:text-[var(--text-3)] outline-none mb-2"
                          />
                          <div className="flex gap-1.5 flex-wrap">
                            {[
                              { label: 'Tomorrow', days: 1 },
                              { label: 'In 3 days', days: 3 },
                              { label: 'Next week', days: 7 },
                              { label: 'In 2 weeks', days: 14 },
                            ].map((opt) => (
                              <button
                                key={opt.days}
                                onClick={() => followupMutation.mutate({ emailId: selectedEmail.id, daysFromNow: opt.days, note: followupNote || undefined })}
                                disabled={followupMutation.isPending}
                                className="px-2.5 py-1 text-[10px] rounded-lg border border-[var(--amber)]/30 text-[var(--amber)] hover:bg-[var(--amber)]/10 transition-all disabled:opacity-50"
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Meeting booking detection */}
                <MeetingBooking emailId={selectedEmail.id} />

                {/* Smart Reply */}
                <AnimatePresence>
                  {showSmartReply && (
                    <SmartReply
                      emailId={selectedEmail.id}
                      onSelect={(content) => {
                        setEditedReply(content)
                        setShowSmartReply(false)
                      }}
                      onClose={() => setShowSmartReply(false)}
                    />
                  )}
                </AnimatePresence>

                {/* Thread view */}
                <ThreadView emailId={selectedEmail.id} />

                <div className="h-8" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
    </>
  )
}

// Tone detector for reply textarea
function ToneChecker({ draft, subject }: { draft: string; subject: string }) {
  const [tone, setTone] = useState<{ tone: string; warning: string | null } | null>(null)
  const [checking, setChecking] = useState(false)
  const debouncedDraft = useDebounce(draft, 1200)

  useEffect(() => {
    if (!debouncedDraft || debouncedDraft.length < 30) { setTone(null); return }
    setChecking(true)
    fetch('/api/ai/tone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draftText: debouncedDraft, contextSubject: subject }),
    })
      .then((r) => r.json())
      .then((d) => setTone(d))
      .finally(() => setChecking(false))
  }, [debouncedDraft, subject])

  if (!tone || tone.tone === 'ok' || !tone.warning) return null

  const color = tone.tone === 'aggressive' ? 'var(--red)' : 'var(--amber)'
  const bg = tone.tone === 'aggressive'
    ? 'color-mix(in srgb, var(--red) 8%, transparent)'
    : 'color-mix(in srgb, var(--amber) 8%, transparent)'
  const border = tone.tone === 'aggressive'
    ? 'color-mix(in srgb, var(--red) 20%, transparent)'
    : 'color-mix(in srgb, var(--amber) 20%, transparent)'

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-2 px-3 py-2 rounded-lg mb-2 text-[11px]"
      style={{ background: bg, border: `1px solid ${border}` }}
    >
      <AlertTriangle size={12} className="shrink-0 mt-0.5" style={{ color }} />
      <span style={{ color }}>{tone.warning}</span>
    </motion.div>
  )
}
