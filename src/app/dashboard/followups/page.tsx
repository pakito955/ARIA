'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Clock, AlertCircle, Bell } from 'lucide-react'
import { toast } from '@/lib/store'
import { formatDistanceToNow, format, isPast } from 'date-fns'
import Link from 'next/link'
import { useAppStore } from '@/lib/store'

export default function FollowupsPage() {
  const qc = useQueryClient()
  const { setSelectedEmail } = useAppStore()

  const { data, isLoading } = useQuery({
    queryKey: ['followups'],
    queryFn: async () => {
      const res = await fetch('/api/followup')
      return res.json()
    },
    refetchInterval: 60_000,
  })

  const doneMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch('/api/followup', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['followups'] })
      toast.success('Follow-up marked as done')
    },
  })

  const overdue: any[] = data?.overdue || []
  const upcoming: any[] = data?.upcoming || []
  const total = (data?.total || 0)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-5 border-b border-[var(--border)]">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--amber)] pulse-amber" />
          <span className="text-[9px] tracking-[2.5px] uppercase text-[var(--amber)]">ARIA · Follow-ups</span>
        </div>
        <h1 className="font-outfit text-3xl font-light">Follow-up Reminders</h1>
        {!isLoading && (
          <p className="text-[11px] text-[var(--text-3)] mt-0.5">
            {total} pending · {overdue.length} overdue
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 rounded-2xl skeleton" />
            ))}
          </div>
        ) : total === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--green-subtle)', border: '1px solid rgba(34,197,94,0.2)' }}
            >
              <CheckCircle2 size={26} className="text-[var(--green)]" />
            </div>
            <div className="text-center">
              <p className="text-[14px] font-medium text-white mb-1">All followed up!</p>
              <p className="text-[11px] text-[var(--text-3)]">
                No pending follow-ups. Set reminders from any email in the inbox.
              </p>
            </div>
            <Link href="/dashboard/inbox">
              <button
                className="mt-2 px-4 py-2 rounded-xl text-[12px] font-medium text-white transition-all"
                style={{ background: 'var(--accent)' }}
              >
                Go to Inbox
              </button>
            </Link>
          </div>
        ) : (
          <>
            {/* Overdue */}
            {overdue.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle size={13} className="text-[var(--red)]" />
                  <p className="text-[9px] uppercase tracking-[2px] text-[var(--red)]">
                    Overdue ({overdue.length})
                  </p>
                </div>
                <div className="space-y-2">
                  <AnimatePresence>
                    {overdue.map((r: any, i: number) => (
                      <ReminderCard
                        key={r.id}
                        reminder={r}
                        index={i}
                        isOverdue
                        onDone={() => doneMutation.mutate(r.id)}
                        onOpen={() => setSelectedEmail(r.emailId)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Upcoming */}
            {upcoming.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Bell size={13} className="text-[var(--amber)]" />
                  <p className="text-[9px] uppercase tracking-[2px] text-[var(--amber)]">
                    Upcoming ({upcoming.length})
                  </p>
                </div>
                <div className="space-y-2">
                  <AnimatePresence>
                    {upcoming.map((r: any, i: number) => (
                      <ReminderCard
                        key={r.id}
                        reminder={r}
                        index={i}
                        isOverdue={false}
                        onDone={() => doneMutation.mutate(r.id)}
                        onOpen={() => setSelectedEmail(r.emailId)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function ReminderCard({
  reminder,
  index,
  isOverdue,
  onDone,
  onOpen,
}: {
  reminder: any
  index: number
  isOverdue: boolean
  onDone: () => void
  onOpen: () => void
}) {
  const dueDate = new Date(reminder.dueAt)
  const accentColor = isOverdue ? 'var(--red)' : 'var(--amber)'
  const bgColor = isOverdue ? 'rgba(239,68,68,0.05)' : 'rgba(245,158,11,0.05)'
  const borderColor = isOverdue ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ delay: index * 0.04 }}
      className="flex items-start gap-4 p-4 rounded-2xl"
      style={{ background: bgColor, border: `1px solid ${borderColor}` }}
    >
      <div
        className="w-1 self-stretch rounded-full shrink-0 mt-0.5"
        style={{ background: accentColor }}
      />

      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-medium text-white truncate mb-0.5">
          {reminder.email?.subject || 'Email'}
        </p>
        <p className="text-[11px] text-[var(--text-3)] truncate">
          {reminder.email?.fromName || reminder.email?.fromEmail}
        </p>
        {reminder.note && (
          <p className="text-[11px] text-[var(--text-2)] mt-1 italic">"{reminder.note}"</p>
        )}
        <div className="flex items-center gap-1.5 mt-2">
          <Clock size={10} style={{ color: accentColor }} />
          <span className="text-[10px]" style={{ color: accentColor }}>
            {isOverdue
              ? `Overdue by ${formatDistanceToNow(dueDate)}`
              : `Due ${format(dueDate, 'MMM d')} · ${formatDistanceToNow(dueDate, { addSuffix: true })}`}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2 shrink-0">
        <Link href="/dashboard/inbox" onClick={onOpen}>
          <button
            className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--text-2)] text-[10px] hover:border-[var(--border-medium)] transition-all whitespace-nowrap"
          >
            Open email
          </button>
        </Link>
        <button
          onClick={onDone}
          className="px-3 py-1.5 rounded-lg text-[10px] font-medium text-white transition-all whitespace-nowrap"
          style={{ background: 'var(--green)', opacity: 0.9 }}
        >
          Mark done
        </button>
      </div>
    </motion.div>
  )
}
