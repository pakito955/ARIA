'use client'

import { useQuery, useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { formatDistanceToNow, format } from 'date-fns'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
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

  const sendFollowUp = async (emailId: string, toName: string) => {
    setFollowingUp(emailId)
    try {
      await fetch('/api/ai/followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailId }),
      })
    } finally {
      setFollowingUp(null)
    }
  }

  const emails = data?.data || []

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-white/[0.055]">
        <h1 className="font-outfit text-2xl font-semibold tracking-tight">Čekam odgovor</h1>
        <p className="text-[11px] text-[#8888aa] mt-0.5">Emailovi bez odgovora duže od 2 dana</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded skeleton" />
          ))
        ) : emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <span className="text-4xl opacity-10">✅</span>
            <p className="text-[#5a5a78] text-sm">Svi emailovi su odgovoreni!</p>
          </div>
        ) : (
          emails.map((email: any, i: number) => {
            const daysAgo = Math.floor(
              (Date.now() - new Date(email.receivedAt).getTime()) / (1000 * 60 * 60 * 24)
            )

            return (
              <motion.div
                key={email.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-center gap-4 p-3.5 bg-[#0d0d1a] border border-white/[0.055] rounded"
              >
                {/* Days badge */}
                <div className="w-12 h-12 rounded-full shrink-0 flex flex-col items-center justify-center bg-[#f4a0b5]/[0.08] border border-[#f4a0b5]/18">
                  <span className="font-cormorant text-xl font-light text-[#f4a0b5] leading-none">
                    {daysAgo}
                  </span>
                  <span className="text-[7px] text-[#f4a0b5] uppercase tracking-[0.5px]">dana</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-medium truncate">
                    → {email.fromName || email.fromEmail}
                  </p>
                  <p className="text-[11px] text-[#8888aa] truncate mt-0.5">{email.subject}</p>
                  <p className="text-[9px] text-[#5a5a78] mt-1 font-mono">
                    Primljeno: {format(new Date(email.receivedAt), 'd. MMM, HH:mm')}
                  </p>
                </div>

                {/* Follow-up button */}
                <button
                  onClick={() => sendFollowUp(email.id, email.fromName || email.fromEmail)}
                  disabled={followingUp === email.id}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-[#f4a0b5]/[0.08] border border-[#f4a0b5]/18 text-[#f4a0b5] text-[10px] rounded hover:bg-[#f4a0b5]/15 transition-all disabled:opacity-50"
                >
                  {followingUp === email.id ? (
                    <Loader2 size={10} className="animate-spin" />
                  ) : (
                    '↑'
                  )}
                  Podsjetnik
                </button>
              </motion.div>
            )
          })
        )}
      </div>
    </div>
  )
}
