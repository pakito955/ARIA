'use client'

import { useQuery, useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow, format } from 'date-fns'
import { cn } from '@/lib/utils'
import { Loader2, Mail, Clock, ArrowUpRight, Zap } from 'lucide-react'
import { useState } from 'react'

export default function WaitingPage() {
  // Emails waiting for a reply: unread, older than 2 days, not spam/newsletter
  const { data, isLoading } = useQuery({
    queryKey: ['waiting'],
    queryFn: async () => {
      const res = await fetch('/api/emails?filter=waiting&sort=oldest&limit=20')
      return res.json()
    },
    refetchInterval: 5 * 60_000, // refresh every 5 min
  })

  const [followingUp, setFollowingUp] = useState<string | null>(null)
  const [sentIds, setSentIds] = useState<Set<string>>(new Set())

  const sendFollowUp = async (emailId: string, toName: string) => {
    setFollowingUp(emailId)
    try {
      await fetch('/api/ai/followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailId }),
      })
      setSentIds((prev) => new Set([...prev, emailId]))
      // Clear the success indicator after 3 seconds
      setTimeout(() => {
        setSentIds((prev) => {
          const next = new Set(prev)
          next.delete(emailId)
          return next
        })
      }, 3000)
    } finally {
      setFollowingUp(null)
    }
  }

  const emails = data?.data || []
  const totalCount = emails.length

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[var(--border)]">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-outfit text-2xl font-semibold tracking-tight">Awaiting Reply</h1>
              {!isLoading && totalCount > 0 && (
                <span
                  className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full text-[11px] font-semibold"
                  style={{ background: 'color-mix(in srgb, var(--amber) 18%, transparent)', color: 'var(--amber)' }}
                >
                  {totalCount}
                </span>
              )}
            </div>
            <p className="text-[11px] text-[var(--text-2)] mt-0.5">Emails without a reply for more than 2 days</p>
          </div>

          {/* Stats chip */}
          {!isLoading && totalCount > 0 && (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px]"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-2)' }}
            >
              <Clock size={11} style={{ color: 'var(--text-3)' }} />
              {totalCount} pending
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded skeleton" />
          ))
        ) : emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: 'color-mix(in srgb, var(--green) 12%, transparent)' }}
            >
              <Mail size={20} style={{ color: 'var(--green)', opacity: 0.7 }} strokeWidth={1.5} />
            </div>
            <p className="text-[var(--text-3)] text-sm">All caught up — no pending replies!</p>
          </div>
        ) : (
          emails.map((email: any, i: number) => {
            const daysAgo = Math.floor(
              (Date.now() - new Date(email.receivedAt).getTime()) / (1000 * 60 * 60 * 24)
            )
            const isSending = followingUp === email.id
            const isSent = sentIds.has(email.id)
            const urgencyColor = daysAgo >= 7 ? 'var(--red)' : daysAgo >= 4 ? 'var(--amber)' : '#f4a0b5'

            return (
              <motion.div
                key={email.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-center gap-4 p-3.5 rounded-xl transition-colors"
                style={{
                  background: 'var(--bg-card)',
                  border: `1px solid var(--border)`,
                }}
              >
                {/* Days badge */}
                <div
                  className="w-12 h-12 rounded-full shrink-0 flex flex-col items-center justify-center"
                  style={{
                    background: `color-mix(in srgb, ${urgencyColor} 10%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${urgencyColor} 22%, transparent)`,
                  }}
                >
                  <span
                    className="font-cormorant text-xl font-light leading-none"
                    style={{ color: urgencyColor }}
                  >
                    {daysAgo}
                  </span>
                  <span className="text-[7px] uppercase tracking-[0.5px]" style={{ color: urgencyColor }}>days</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-medium truncate" style={{ color: 'var(--text-1)' }}>
                    {email.fromName || email.fromEmail}
                  </p>
                  <p className="text-[11px] truncate mt-0.5" style={{ color: 'var(--text-2)' }}>{email.subject}</p>
                  <p className="text-[9px] mt-1 font-mono" style={{ color: 'var(--text-3)' }}>
                    Received: {format(new Date(email.receivedAt), 'd. MMM, HH:mm')}
                  </p>
                </div>

                {/* Follow-up button */}
                <AnimatePresence mode="wait">
                  {isSent ? (
                    <motion.div
                      key="sent"
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-medium"
                      style={{
                        background: 'color-mix(in srgb, var(--green) 12%, transparent)',
                        border: '1px solid color-mix(in srgb, var(--green) 25%, transparent)',
                        color: 'var(--green)',
                      }}
                    >
                      <Zap size={10} />
                      Sent!
                    </motion.div>
                  ) : (
                    <motion.button
                      key="followup"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => sendFollowUp(email.id, email.fromName || email.fromEmail)}
                      disabled={isSending}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-medium transition-all disabled:opacity-50"
                      style={{
                        background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
                        border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)',
                        color: 'var(--accent-text)',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSending) {
                          ;(e.currentTarget as HTMLElement).style.background =
                            'color-mix(in srgb, var(--accent) 18%, transparent)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        ;(e.currentTarget as HTMLElement).style.background =
                          'color-mix(in srgb, var(--accent) 10%, transparent)'
                      }}
                    >
                      {isSending ? (
                        <Loader2 size={10} className="animate-spin" />
                      ) : (
                        <ArrowUpRight size={10} />
                      )}
                      Follow Up
                    </motion.button>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })
        )}
      </div>
    </div>
  )
}
