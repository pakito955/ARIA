'use client'

import { useState, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, SlidersHorizontal, RefreshCw, ChevronDown, Send, Copy, Calendar, CheckCircle, Loader2, ArrowLeft, Paperclip, Inbox } from 'lucide-react'
import { EmailCard } from '@/components/inbox/EmailCard'
import { TriageMode } from '@/components/TriageMode'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { useDebounce } from '@/hooks/useDebounce'
import { format, formatDistanceToNow } from 'date-fns'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'critical', label: '🔴 Critical' },
  { key: 'meeting', label: '📅 Meetings' },
  { key: 'task', label: '✓ Tasks' },
  { key: 'starred', label: '⭐ Starred' },
] as const

export default function InboxPage() {
  const { emailFilter, setEmailFilter, searchQuery, setSearchQuery, selectedEmailId, setSelectedEmail } = useAppStore()
  const [sort, setSort] = useState<'newest' | 'priority'>('newest')
  const [originalExpanded, setOriginalExpanded] = useState(false)
  const [replyStyle, setReplyStyle] = useState<'short' | 'professional' | 'friendly'>('professional')
  const [sent, setSent] = useState(false)
  const [triageMode, setTriageMode] = useState(false)
  const qc = useQueryClient()

  // Real-time sync via SSE
  useEffect(() => {
    const es = new EventSource('/api/emails/stream')
    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        if (msg.type === 'update' && msg.newEmails?.length > 0) {
          qc.invalidateQueries({ queryKey: ['emails'] })
        }
      } catch {}
    }
    return () => es.close()
  }, [qc])

  const debouncedSearch = useDebounce(searchQuery, 300)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['emails', emailFilter, debouncedSearch, sort],
    queryFn: async () => {
      const params = new URLSearchParams({
        filter: emailFilter,
        sort,
        limit: '50',
        ...(debouncedSearch && { search: debouncedSearch }),
      })
      const res = await fetch(`/api/emails?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')
      return res.json()
    },
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
    onSuccess: () => setSent(true),
  })

  const emails = data?.data || []
  const total = data?.total || 0

  const selectedEmail = emailDetail?.data
  const analysis = selectedEmail?.analysis

  const replies: Record<string, string> = {
    short: analysis?.replyShort || '',
    professional: analysis?.replyProfessional || '',
    friendly: analysis?.replyFriendly || '',
  }

  const currentReply = replies[replyStyle]

  const handleArchive = useCallback((id: string) => {
    fetch(`/api/emails/${id}/archive`, { method: 'POST' }).then(() =>
      qc.invalidateQueries({ queryKey: ['emails'] })
    )
  }, [qc])

  const handleReply = useCallback((id: string) => {
    setSelectedEmail(id)
    setTriageMode(false)
  }, [setSelectedEmail])

  const handleTask = useCallback((id: string) => {
    fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailId: id }),
    })
  }, [])

  const handleSnooze = useCallback((id: string) => {
    // snooze for 24h — mark as read temporarily
    fetch(`/api/emails/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isRead: true }),
    }).then(() => qc.invalidateQueries({ queryKey: ['emails'] }))
  }, [qc])

  return (
    <>
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

    <div className="flex h-full">
      {/* Left: Email List (380px) */}
      <div className="w-[380px] shrink-0 flex flex-col border-r border-white/[0.05] h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/[0.04]">
          <div>
            <h1 className="font-cormorant text-2xl font-light tracking-tight">Inbox</h1>
            <p className="text-[10px] text-[#4a4a6a] mt-0.5">{total} messages · AI sorted</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setTriageMode(true)}
              disabled={emails.length === 0}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 text-[#a78bfa] text-[10px] hover:bg-[#8b5cf6]/18 transition-all disabled:opacity-30"
            >
              <Inbox size={11} />
              Triage
            </button>
            <button
              onClick={() => refetch()}
              className="p-1.5 rounded-lg text-[#4a4a6a] hover:text-[#8888aa] hover:bg-white/[0.04] transition-all"
            >
              <RefreshCw size={13} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2.5 border-b border-white/[0.04]">
          <div className="flex items-center gap-2 bg-[#0c0c1a] border border-white/[0.06] rounded-lg px-3 py-2">
            <Search size={12} className="text-[#4a4a6a] shrink-0" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search emails…"
              className="flex-1 bg-transparent text-[12px] text-white placeholder:text-[#4a4a6a] outline-none"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-[#4a4a6a] text-xs hover:text-[#8888aa]">✕</button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-white/[0.04] overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setEmailFilter(f.key)}
              className={cn(
                'px-2.5 py-1 rounded-lg text-[10.5px] whitespace-nowrap transition-all shrink-0',
                emailFilter === f.key
                  ? 'bg-[#8b5cf6]/12 text-[#a78bfa] border border-[#8b5cf6]/25'
                  : 'text-[#8888aa] hover:text-white hover:bg-white/[0.03]'
              )}
            >
              {f.label}
            </button>
          ))}

          <button
            onClick={() => setSort(sort === 'newest' ? 'priority' : 'newest')}
            className="ml-auto flex items-center gap-1 text-[9.5px] text-[#4a4a6a] hover:text-[#8888aa] transition-colors shrink-0"
          >
            <SlidersHorizontal size={10} />
            {sort === 'newest' ? 'Newest' : 'Priority'}
          </button>
        </div>

        {/* Email list */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {isLoading ? (
            <EmailListSkeleton />
          ) : emails.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <span className="text-3xl opacity-10">✉</span>
              <p className="text-[#4a4a6a] text-[12px]">
                {searchQuery ? 'No results found' : 'Inbox is empty'}
              </p>
            </div>
          ) : (
            emails.map((email: any, i: number) => (
              <EmailCard
                key={email.id}
                email={email}
                index={i}
                onAnalyze={(id) => analyzeMutation.mutate(id)}
                analyzing={analyzeMutation.isPending && analyzeMutation.variables === email.id}
              />
            ))
          )}
        </div>
      </div>

      {/* Right: Email Detail */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <AnimatePresence mode="wait">
          {!selectedEmailId ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8"
            >
              <div className="w-14 h-14 rounded-2xl bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 flex items-center justify-center">
                <span className="text-2xl">✉</span>
              </div>
              <div>
                <p className="text-[13px] text-[#8888aa]">Select an email to read</p>
                <p className="text-[11px] text-[#4a4a6a] mt-1">ARIA will analyze it instantly</p>
              </div>
            </motion.div>
          ) : !selectedEmail ? (
            <motion.div key="loading" className="flex-1 flex items-center justify-center">
              <Loader2 size={20} className="animate-spin text-[#8b5cf6]" />
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
              <div className="px-6 py-5 border-b border-white/[0.04]">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-[15px] font-medium text-white leading-snug mb-2">
                      {selectedEmail.subject}
                    </h2>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-[#8888aa]">
                        {selectedEmail.fromName || selectedEmail.fromEmail}
                      </span>
                      <span className="text-[10px] text-[#4a4a6a]">
                        {selectedEmail.fromEmail !== selectedEmail.fromName && `<${selectedEmail.fromEmail}>`}
                      </span>
                      <span className="text-[10px] text-[#4a4a6a] font-mono ml-auto">
                        {format(new Date(selectedEmail.receivedAt), 'MMM d, HH:mm')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {analysis && (
                      <span className="flex items-center gap-1.5 text-[9px] bg-[#8b5cf6]/10 text-[#a78bfa] border border-[#8b5cf6]/20 px-2.5 py-1 rounded-full">
                        <span className="w-1 h-1 rounded-full bg-[#8b5cf6]" />
                        AI Analyzed
                      </span>
                    )}
                    {!analysis && (
                      <button
                        onClick={() => analyzeMutation.mutate(selectedEmail.id)}
                        disabled={analyzeMutation.isPending}
                        className="flex items-center gap-1.5 text-[10px] bg-[#8b5cf6] text-white px-3 py-1.5 rounded-lg hover:bg-[#7c3aed] transition-colors disabled:opacity-60"
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
                  <div className="mx-6 mt-5 p-4 rounded-xl border border-[#8b5cf6]/20 bg-[#8b5cf6]/[0.04] relative overflow-hidden">
                    <div
                      className="absolute right-0 top-0 w-32 h-full pointer-events-none"
                      style={{ background: 'radial-gradient(ellipse at right, rgba(139,92,246,0.06), transparent 70%)' }}
                    />
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]" />
                      <span className="text-[8px] tracking-[2px] uppercase text-[#8b5cf6]">ARIA · AI Summary</span>
                      <span className="ml-auto text-[9px] text-[#4a4a6a] bg-white/[0.04] px-2 py-0.5 rounded-full">
                        {analysis.priority} · Score {analysis.urgencyScore}/10
                      </span>
                    </div>
                    <p className="text-[12.5px] leading-relaxed text-[#eeeef5]/85">
                      {analysis.summary}
                    </p>
                    {analysis.suggestedAction && (
                      <p className="text-[11px] text-[#8b5cf6] mt-2.5">
                        → {analysis.suggestedAction}
                      </p>
                    )}
                    {analysis.deadlineText && (
                      <p className="text-[11px] text-[#ef4444] mt-1">⚠ Deadline: {analysis.deadlineText}</p>
                    )}
                  </div>
                )}

                {/* AI Actions */}
                {analysis && (
                  <div className="mx-6 mt-4">
                    <p className="text-[8px] tracking-[2px] uppercase text-[#4a4a6a] mb-3">AI Actions</p>

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
                                  ? 'border-[#8b5cf6]/40 text-[#a78bfa] bg-[#8b5cf6]/10'
                                  : 'border-white/[0.06] text-[#8888aa] hover:border-white/[0.1] hover:text-white'
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
                            <CheckCircle size={14} className="text-[#10b981]" />
                            <span className="text-[11px] text-[#10b981]">Reply sent successfully</span>
                            <button onClick={() => setSent(false)} className="ml-auto text-[10px] text-[#4a4a6a] hover:text-[#8888aa]">
                              New reply
                            </button>
                          </motion.div>
                        ) : (
                          <>
                            <div
                              contentEditable
                              suppressContentEditableWarning
                              className="bg-[#0c0c1a] border border-white/[0.06] rounded-lg p-3.5 text-[12px] leading-relaxed text-[#eeeef5] min-h-[80px] outline-none focus:border-[#8b5cf6]/30 transition-colors"
                            >
                              {currentReply}
                            </div>
                            <div className="flex gap-2 mt-2">
                              <button
                                onClick={() => sendMutation.mutate({ emailId: selectedEmail.id, replyText: currentReply, style: replyStyle })}
                                disabled={sendMutation.isPending}
                                className="flex items-center gap-2 px-4 py-2 bg-[#8b5cf6] text-white text-[11px] font-medium rounded-lg hover:bg-[#7c3aed] transition-colors disabled:opacity-60"
                              >
                                {sendMutation.isPending ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                                {sendMutation.isPending ? 'Sending…' : 'Send Reply'}
                              </button>
                              <button
                                onClick={() => navigator.clipboard.writeText(currentReply)}
                                className="flex items-center gap-1.5 px-3 py-2 border border-white/[0.06] text-[#8888aa] text-[11px] rounded-lg hover:border-white/[0.1] hover:text-white transition-all"
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
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 text-[#a78bfa] text-[10.5px] rounded-lg hover:bg-[#8b5cf6]/18 transition-all"
                        >
                          {analyzeMutation.isPending ? <Loader2 size={10} className="animate-spin" /> : '⚡'}
                          Generate Replies
                        </button>
                      )}
                      <button className="flex items-center gap-1.5 px-3 py-1.5 border border-white/[0.06] text-[#8888aa] text-[10.5px] rounded-lg hover:border-white/[0.1] hover:text-white transition-all">
                        <CheckCircle size={11} />
                        Create Task
                      </button>
                      {analysis.meetingDetected && (
                        <button className="flex items-center gap-1.5 px-3 py-1.5 border border-[#f59e0b]/20 text-[#f59e0b] text-[10.5px] rounded-lg hover:border-[#f59e0b]/35 transition-all bg-[#f59e0b]/05">
                          <Calendar size={11} />
                          Schedule Meeting
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Original email — collapsed by default */}
                <div className="mx-6 mt-4 mb-6">
                  <button
                    onClick={() => setOriginalExpanded(!originalExpanded)}
                    className="flex items-center gap-2 text-[10px] text-[#4a4a6a] hover:text-[#8888aa] transition-colors mb-2 group"
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
                        className="bg-[#0c0c1a] border border-white/[0.05] rounded-xl p-4 overflow-hidden"
                      >
                        <pre className="text-[11.5px] text-[#8888aa] leading-relaxed whitespace-pre-wrap font-space">
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

function EmailListSkeleton() {
  return (
    <div className="space-y-2 px-1">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-[88px] rounded-xl skeleton" />
      ))}
    </div>
  )
}
