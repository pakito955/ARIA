'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Trash2, CheckCircle2, Loader2, Search } from 'lucide-react'
import { toast } from '@/lib/store'
import { formatDistanceToNow } from 'date-fns'

function avatarColor(email: string): string {
  const colors = ['#7c3aed', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#6366f1']
  let hash = 0
  for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

export default function UnsubscribePage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [unsubscribed, setUnsubscribed] = useState<Set<string>>(new Set())

  const { data, isLoading } = useQuery({
    queryKey: ['unsubscribe-list'],
    queryFn: async () => {
      const res = await fetch('/api/unsubscribe')
      return res.json()
    },
  })

  const unsubMutation = useMutation({
    mutationFn: async (fromEmail: string) => {
      const res = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromEmail }),
      })
      return res.json()
    },
    onSuccess: (_, fromEmail) => {
      setUnsubscribed((prev) => new Set([...prev, fromEmail]))
      qc.invalidateQueries({ queryKey: ['unsubscribe-list'] })
      toast.success('Unsubscribed and archived all emails', 'Done')
    },
    onError: () => toast.error('Failed to unsubscribe'),
  })

  const senders: any[] = data?.senders || []
  const filtered = senders.filter(
    (s) =>
      !unsubscribed.has(s.email) &&
      (search
        ? s.email.toLowerCase().includes(search.toLowerCase()) ||
          s.name.toLowerCase().includes(search.toLowerCase())
        : true)
  )

  const totalEmails = senders.reduce((acc: number, s: any) => acc + s.count, 0)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-5 border-b border-[var(--border)]">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--red)]" />
          <span className="text-[9px] tracking-[2.5px] uppercase text-[var(--red)]">ARIA · Unsubscribe</span>
        </div>
        <h1 className="font-outfit text-3xl font-light">Unsubscribe Manager</h1>
        {!isLoading && (
          <p className="text-[11px] text-[var(--text-3)] mt-0.5">
            {senders.length} newsletter senders · {totalEmails} emails taking up inbox space
          </p>
        )}
      </div>

      {/* Search */}
      <div className="px-6 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 max-w-sm">
          <Search size={13} className="text-[var(--text-3)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search senders…"
            className="bg-transparent text-[12.5px] text-white placeholder:text-[var(--text-3)] outline-none flex-1"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-5">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-2xl skeleton h-[72px]" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[var(--green-subtle)] border border-[var(--green)]/20 flex items-center justify-center">
              <CheckCircle2 size={26} className="text-[var(--green)]" />
            </div>
            <div className="text-center">
              <p className="text-[14px] font-medium text-white mb-1">All clean!</p>
              <p className="text-[11px] text-[var(--text-3)]">No newsletters or marketing emails found</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {filtered.map((sender, i) => {
                const color = avatarColor(sender.email)
                const initials = (sender.name || sender.email).slice(0, 2).toUpperCase()
                const isPending = unsubMutation.isPending && unsubMutation.variables === sender.email

                return (
                  <motion.div
                    key={sender.email}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -40, height: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="flex items-center gap-4 p-4 rounded-2xl group transition-all"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                  >
                    {/* Avatar */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-[13px] font-semibold text-white shrink-0"
                      style={{ background: color }}
                    >
                      {initials}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-white truncate">{sender.name}</p>
                      <p className="text-[11px] text-[var(--text-3)] truncate">{sender.email}</p>
                      <p className="text-[10px] text-[var(--text-3)] mt-0.5">
                        {sender.count} email{sender.count > 1 ? 's' : ''} ·{' '}
                        last {formatDistanceToNow(new Date(sender.lastReceived), { addSuffix: true })}
                      </p>
                    </div>

                    {/* Email count badge */}
                    <div
                      className="px-2.5 py-1 rounded-full text-[10px] font-mono shrink-0"
                      style={{ background: 'var(--bg-hover)', color: 'var(--text-2)' }}
                    >
                      {sender.count}
                    </div>

                    {/* Action */}
                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => unsubMutation.mutate(sender.email)}
                      disabled={isPending}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-medium text-white shrink-0 transition-all disabled:opacity-50"
                      style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444' }}
                    >
                      {isPending ? (
                        <Loader2 size={11} className="animate-spin" />
                      ) : (
                        <Trash2 size={11} />
                      )}
                      Unsubscribe
                    </motion.button>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
