'use client'

import { useState, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, SlidersHorizontal, RefreshCw, Send, Copy, Calendar, CheckCircle, Loader2, ArrowLeft, Paperclip, Inbox, Maximize2, Minimize2, User, Bell, BrainCircuit, Circle, CalendarDays, CheckSquare, Star, AlertCircle, ChevronDown, AlertTriangle, RefreshCcw } from 'lucide-react'
import { EmailCard } from '@/components/inbox/EmailCard'
import { TriageMode } from '@/components/TriageMode'
import { SnoozePickerModal } from '@/components/inbox/SnoozePickerModal'
import { BulkActionBar } from '@/components/inbox/BulkActionBar'
import { ThreadView } from '@/components/inbox/ThreadView'
import { ContactPanel } from '@/components/inbox/ContactPanel'
import { EmailCardSkeleton } from '@/components/ui/Skeletons'
import { useAppStore, toast } from '@/lib/store'
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
  const { emailFilter, setEmailFilter, searchQuery, setSearchQuery, selectedEmailId, setSelectedEmail, focusMode, setFocusMode, setContactPanelEmail, newEmailsCount, setNewEmailsCount } = useAppStore()
  const [sort, setSort] = useState<'newest' | 'priority'>('newest')
  const [originalExpanded, setOriginalExpanded] = useState(false)
  const [replyStyle, setReplyStyle] = useState<'short' | 'professional' | 'friendly'>('professional')
  const [editedReply, setEditedReply] = useState('')
  const [sent, setSent] = useState(false)
  const [triageMode, setTriageMode] = useState(false)
  const [snoozeEmailId, setSnoozeEmailId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [smartSearch, setSmartSearch] = useState(false)
  const [followupNote, setFollowupNote] = useState('')
  const [followupEmailId, setFollowupEmailId] = useState<string | null>(null)
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
    queryKey: ['emails', emailFilter, debouncedSearch, sort],
    queryFn: async () => {
      const params = new URLSearchParams({
        filter: emailFilter,
        sort,
        limit: '50',
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(syncForced && { sync: 'true' }),
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

  // Sync editedReply when email or reply style changes
  useEffect(() => {
    setEditedReply(currentReply)
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
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-medium text-white shadow-2xl"
            style={{ background: 'var(--accent)', boxShadow: '0 4px 20px rgba(217,119,87,0.4)' }}
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
              className="p-2 rounded-xl text-[var(--text-3)] hover:text-[var(--text-2)] hover:bg-[var(--bg-hover)] transition-all"
              style={{ color: focusMode ? 'var(--accent-text)' : undefined }}
            >
              {focusMode ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
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
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--green)', boxShadow: '0 0 8px rgba(34,197,94,0.4)' }}
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
                onAnalyze={(id) => analyzeMutation.mutate(id)}
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
              {/* Email header */}
              <div className="px-6 py-5 border-b border-[var(--border)]">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-[15px] font-medium text-[var(--text-1)] leading-snug mb-2">
                      {selectedEmail.subject}
                    </h2>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setContactPanelEmail(selectedEmail.fromEmail)}
                        className="flex items-center gap-1 text-[11px] text-[var(--text-2)] hover:text-[var(--accent-text)] transition-colors group"
                        title="View contact intelligence"
                      >
                        <User size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        {selectedEmail.fromName || selectedEmail.fromEmail}
                      </button>
                      <span className="text-[10px] text-[var(--text-3)]">
                        {selectedEmail.fromEmail !== selectedEmail.fromName && `<${selectedEmail.fromEmail}>`}
                      </span>
                      <span className="text-[10px] text-[var(--text-3)] font-mono ml-auto">
                        {format(new Date(selectedEmail.receivedAt), 'MMM d, HH:mm')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {analysis && (
                      <span className="flex items-center gap-1.5 text-[9px] bg-[var(--accent)]/10 text-[var(--accent-text)] border border-[var(--accent)] px-2.5 py-1 rounded-full">
                        <span className="w-1 h-1 rounded-full bg-[var(--accent)]" />
                        AI Analyzed
                      </span>
                    )}
                    {!analysis && (
                      <button
                        onClick={() => analyzeMutation.mutate(selectedEmail.id)}
                        disabled={analyzeMutation.isPending}
                        className="flex items-center gap-1.5 text-[10px] bg-[var(--accent)] text-white px-3 py-1.5 rounded-lg hover:bg-[var(--accent)] transition-colors disabled:opacity-60"
                      >
                        {analyzeMutation.isPending
                          ? <Loader2 size={10} className="animate-spin" />
                          : '⚡'
                        }
                        {analyzeMutation.isPending ? 'Analyzing…' : 'Analyze with AI'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto">
                {/* AI Summary — always visible */}
                {analysis && (
                  <div className="mx-6 mt-5 p-4 rounded-xl border border-[var(--accent)] bg-[var(--accent)]/[0.04] relative overflow-hidden">
                    <div
                      className="absolute right-0 top-0 w-32 h-full pointer-events-none"
                      style={{ background: 'radial-gradient(ellipse at right, rgba(217,119,87,0.06), transparent 70%)' }}
                    />
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                      <span className="text-[8px] tracking-[2px] uppercase text-[var(--accent-text)]">ARIA · AI Summary</span>
                      <span className="ml-auto text-[9px] text-[var(--text-3)] bg-white/[0.04] px-2 py-0.5 rounded-full">
                        {analysis.priority} · Score {analysis.urgencyScore}/10
                      </span>
                    </div>
                    <p className="text-[12.5px] leading-relaxed text-[var(--text-1)]">
                      {analysis.summary}
                    </p>
                    {analysis.suggestedAction && (
                      <p className="text-[11px] text-[var(--accent-text)] mt-2.5">
                        → {analysis.suggestedAction}
                      </p>
                    )}
                    {analysis.deadlineText && (
                      <p className="text-[11px] text-[var(--red)] mt-1">⚠ Deadline: {analysis.deadlineText}</p>
                    )}
                  </div>
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
                            className="flex items-center gap-2 p-3 bg-[#10b981]/08 border border-[#10b981]/20 rounded-lg"
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
                              className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-3.5 text-[12px] leading-relaxed text-[var(--text-1)] outline-none focus:border-[var(--accent)] transition-colors resize-none"
                            />
                            <div className="flex gap-2 mt-2 flex-wrap">
                              <button
                                onClick={() => sendMutation.mutate({ emailId: selectedEmail.id, replyText: editedReply, style: replyStyle })}
                                disabled={sendMutation.isPending}
                                className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white text-[11px] font-medium rounded-lg hover:bg-[var(--accent)] transition-colors disabled:opacity-60"
                              >
                                {sendMutation.isPending ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                                {sendMutation.isPending ? 'Sending…' : 'Send Reply'}
                              </button>
                              <button
                                onClick={() => {
                                  fetch('/api/ai/draft', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ emailId: selectedEmail.id, draftText: editedReply, style: replyStyle }),
                                  })
                                }}
                                className="flex items-center gap-1.5 px-3 py-2 border border-[var(--border)] text-[var(--text-2)] text-[11px] rounded-lg hover:border-[var(--border-medium)] hover:text-white transition-all"
                              >
                                Save Draft
                              </button>
                              <button
                                onClick={() => {
                                  const instr = window.prompt('Regenerate instructions (optional):') ?? ''
                                  fetch('/api/ai/regenerate', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ emailId: selectedEmail.id, style: replyStyle, instructions: instr }),
                                  })
                                    .then((r) => r.json())
                                    .then((d) => { if (d.reply) setEditedReply(d.reply) })
                                }}
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
                      {analysis.meetingDetected && (
                        <button className="flex items-center gap-1.5 px-3 py-1.5 border border-[#f59e0b]/20 text-[var(--amber)] text-[10.5px] rounded-lg hover:border-[#f59e0b]/35 transition-all bg-[#f59e0b]/05">
                          <Calendar size={11} />
                          Schedule Meeting
                        </button>
                      )}
                    </div>

                    {/* Follow-up picker */}
                    <AnimatePresence>
                      {followupEmailId === selectedEmail.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-2 p-3 rounded-xl border border-[var(--amber)]/30 overflow-hidden"
                          style={{ background: 'rgba(245,158,11,0.04)' }}
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

                {/* Thread view */}
                <ThreadView emailId={selectedEmail.id} />

                {/* Original email — collapsed by default */}
                <div className="mx-6 mt-4 mb-6">
                  <button
                    onClick={() => setOriginalExpanded(!originalExpanded)}
                    className="flex items-center gap-2 text-[10px] text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors mb-2 group"
                  >
                    <ChevronDown
                      size={12}
                      className={cn('transition-transform', originalExpanded && 'rotate-180')}
                    />
                    {originalExpanded ? 'Hide' : 'View'} original email
                    {selectedEmail.hasAttachments && (
                      <span className="flex items-center gap-1 text-[9px]">
                        <Paperclip size={9} />
                        Attachments
                      </span>
                    )}
                  </button>

                  <AnimatePresence>
                    {originalExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 overflow-hidden"
                      >
                        <pre className="text-[11.5px] text-[var(--text-2)] leading-relaxed whitespace-pre-wrap font-space">
                          {selectedEmail.bodyText?.slice(0, 3000)}
                          {(selectedEmail.bodyText?.length || 0) > 3000 && '\n\n[Email truncated…]'}
                        </pre>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
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
