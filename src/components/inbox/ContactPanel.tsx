'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Star, Mail, Clock, CheckCircle } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { formatDistanceToNow, format } from 'date-fns'

function Avatar({ email, name }: { email: string; name?: string }) {
  const initials = (name || email).slice(0, 2).toUpperCase()
  const hue = email.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
  return (
    <div
      className="w-14 h-14 rounded-2xl flex items-center justify-center text-[18px] font-semibold text-white shrink-0"
      style={{ background: `hsl(${hue},55%,40%)` }}
    >
      {initials}
    </div>
  )
}

export function ContactPanel() {
  const { contactPanelEmail, setContactPanelEmail } = useAppStore()
  const qc = useQueryClient()

  const encoded = contactPanelEmail ? encodeURIComponent(contactPanelEmail) : null

  const { data, isLoading } = useQuery({
    queryKey: ['contact', contactPanelEmail],
    queryFn: async () => {
      const res = await fetch(`/api/contacts/${encoded}`)
      return res.json()
    },
    enabled: !!contactPanelEmail,
  })

  const vipMutation = useMutation({
    mutationFn: async () => {
      if (data?.isVip) {
        await fetch(`/api/vip/${encoded}`, { method: 'DELETE' })
      } else {
        await fetch('/api/vip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: contactPanelEmail, name: data?.name }),
        })
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contact', contactPanelEmail] })
      qc.invalidateQueries({ queryKey: ['vip'] })
    },
  })

  return (
    <AnimatePresence>
      {contactPanelEmail && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setContactPanelEmail(null)}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, x: 320 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 320 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-80 flex flex-col overflow-hidden"
            style={{
              background: 'color-mix(in srgb, var(--bg-card) 80%, transparent)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              borderLeft: '1px solid var(--border-medium)',
              boxShadow: '-8px 0 48px rgba(0,0,0,0.35)',
            }}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-[2px] text-[var(--text-3)]">Contact Intelligence</span>
              <button
                onClick={() => setContactPanelEmail(null)}
                className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-hover)]"
                style={{ color: 'var(--text-3)' }}
              >
                <X size={14} />
              </button>
            </div>

            {isLoading ? (
              <div className="flex-1 p-5 space-y-5">
                {/* Identity skeleton */}
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl skeleton shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-28 skeleton rounded-full" />
                    <div className="h-2.5 w-36 skeleton rounded-full" />
                    <div className="h-5 w-16 skeleton rounded-full mt-1" />
                  </div>
                </div>
                {/* Stats skeleton */}
                <div className="grid grid-cols-3 gap-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="p-3 rounded-xl space-y-2 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                      <div className="w-3 h-3 skeleton rounded-full mx-auto" />
                      <div className="h-5 w-8 skeleton rounded mx-auto" />
                      <div className="h-2 w-10 skeleton rounded-full mx-auto" />
                    </div>
                  ))}
                </div>
                {/* History skeleton */}
                <div className="space-y-2">
                  <div className="h-2.5 w-20 skeleton rounded-full" />
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="p-3 rounded-xl space-y-1.5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                      <div className="h-3 skeleton rounded-full" style={{ width: `${70 + i * 10}%` }} />
                      <div className="h-2 w-16 skeleton rounded-full" />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Identity */}
                <div className="flex items-center gap-3">
                  <Avatar email={contactPanelEmail} name={data?.name} />
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-white truncate">{data?.name || contactPanelEmail}</p>
                    <p className="text-[11px] text-[var(--text-3)] truncate">{contactPanelEmail}</p>
                    <button
                      onClick={() => vipMutation.mutate()}
                      disabled={vipMutation.isPending}
                      className="flex items-center gap-1 mt-1.5 text-[10px] font-medium transition-all px-2 py-0.5 rounded-full disabled:opacity-50"
                      style={{
                        background: data?.isVip ? 'color-mix(in srgb, var(--amber) 15%, transparent)' : 'var(--bg-hover)',
                        color: data?.isVip ? 'var(--amber)' : 'var(--text-3)',
                        border: `1px solid ${data?.isVip ? 'color-mix(in srgb, var(--amber) 30%, transparent)' : 'var(--border)'}`,
                      }}
                    >
                      <Star size={9} fill={data?.isVip ? 'currentColor' : 'none'} />
                      {data?.isVip ? 'VIP' : 'Add VIP'}
                    </button>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Emails', value: data?.totalEmails ?? 0, icon: Mail },
                    { label: 'Tasks', value: data?.tasks ?? 0, icon: CheckCircle },
                    { label: 'Days ago', value: data?.lastContact ? Math.floor((Date.now() - new Date(data.lastContact).getTime()) / 86400000) : '—', icon: Clock },
                  ].map(({ label, value, icon: Icon }) => (
                    <div
                      key={label}
                      className="p-3 rounded-xl text-center"
                      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
                    >
                      <Icon size={12} className="mx-auto mb-1" style={{ color: 'var(--text-3)' }} />
                      <p className="text-[18px] font-semibold text-white font-mono">{value}</p>
                      <p className="text-[9px] text-[var(--text-3)]">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Last contact */}
                {data?.lastContact && (
                  <div className="p-3 rounded-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                    <p className="text-[9px] uppercase tracking-[1.5px] text-[var(--text-3)] mb-1">Last contact</p>
                    <p className="text-[12px] text-[var(--text-2)]">
                      {formatDistanceToNow(new Date(data.lastContact), { addSuffix: true })}
                    </p>
                  </div>
                )}

                {/* Email history */}
                {data?.emails?.length > 0 && (
                  <div>
                    <p className="text-[9px] uppercase tracking-[1.5px] text-[var(--text-3)] mb-2">Email history</p>
                    <div className="space-y-1.5">
                      {data.emails.map((em: any) => (
                        <div
                          key={em.id}
                          className="p-3 rounded-xl cursor-pointer transition-colors hover:bg-[var(--bg-hover)]"
                          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
                        >
                          <p className="text-[11.5px] font-medium text-white truncate">{em.subject}</p>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-[9px] text-[var(--text-3)]">
                              {format(new Date(em.receivedAt), 'd MMM yyyy')}
                            </p>
                            {em.analysis?.category && (
                              <span
                                className="text-[8px] px-1.5 py-0.5 rounded-full"
                                style={{
                                  background: 'var(--accent-subtle)',
                                  color: 'var(--accent-text)',
                                }}
                              >
                                {em.analysis.category}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
