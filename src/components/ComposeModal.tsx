'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Zap, Send, Copy, ChevronDown, Loader2, Sparkles } from 'lucide-react'
import { useAppStore, toast } from '@/lib/store'
import { cn } from '@/lib/utils'

const TONES = ['professional', 'friendly', 'concise', 'formal', 'casual'] as const
type Tone = typeof TONES[number]

export function ComposeModal() {
  const { composeOpen, setComposeOpen } = useAppStore()
  const [prompt, setPrompt] = useState('')
  const [recipient, setRecipient] = useState('')
  const [tone, setTone] = useState<Tone>('professional')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [step, setStep] = useState<'prompt' | 'edit'>('prompt')
  const promptRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (composeOpen) {
      setStep('prompt')
      setPrompt('')
      setSubject('')
      setBody('')
      setRecipient('')
      setTimeout(() => promptRef.current?.focus(), 80)
    }
  }, [composeOpen])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setComposeOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setComposeOpen])

  const generate = async () => {
    if (!prompt.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/ai/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, tone, recipient }),
      })
      const data = await res.json()
      setSubject(data.subject || '')
      setBody(data.body || '')
      setStep('edit')
    } catch {
      toast.error('Failed to generate email')
    } finally {
      setLoading(false)
    }
  }

  const send = async () => {
    if (!recipient.trim() || !body.trim()) {
      toast.warning('Add recipient and body before sending')
      return
    }
    setSending(true)
    try {
      const res = await fetch('/api/ai/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replyText: body, style: 'professional' }),
      })
      if (res.ok) {
        toast.success('Email sent successfully', 'Sent')
        setComposeOpen(false)
      } else {
        toast.error('Failed to send — check your email integration')
      }
    } catch {
      toast.error('Send failed')
    } finally {
      setSending(false)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`)
    toast.success('Copied to clipboard')
  }

  return (
    <AnimatePresence>
      {composeOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setComposeOpen(false)}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -20 }}
            transition={{ type: 'spring', damping: 28, stiffness: 360 }}
            className="fixed left-1/2 top-[10vh] z-[201] -translate-x-1/2 w-full max-w-[600px] px-4"
          >
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: 'color-mix(in srgb, var(--bg-card) 92%, transparent)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                border: '1px solid var(--border-medium)',
                boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(124,58,237,0.12)',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: 'var(--accent)' }}
                  >
                    <Sparkles size={13} className="text-white" />
                  </div>
                  <span className="text-[13px] font-medium text-white">AI Compose</span>
                  <span className="text-[9px] tracking-[2px] uppercase text-[var(--accent-text)] bg-[var(--accent-subtle)] px-2 py-0.5 rounded-full">
                    ARIA
                  </span>
                </div>
                <button
                  onClick={() => setComposeOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] transition-colors text-[var(--text-3)]"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {step === 'prompt' ? (
                  <>
                    {/* Recipient */}
                    <div>
                      <label className="text-[10px] uppercase tracking-[1.5px] text-[var(--text-3)] mb-1.5 block">
                        To (optional)
                      </label>
                      <input
                        value={recipient}
                        onChange={(e) => setRecipient(e.target.value)}
                        placeholder="recipient@example.com"
                        className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-[13px] text-white placeholder:text-[var(--text-3)] outline-none focus:border-[var(--accent)] transition-colors"
                      />
                    </div>

                    {/* Tone selector */}
                    <div>
                      <label className="text-[10px] uppercase tracking-[1.5px] text-[var(--text-3)] mb-2 block">
                        Tone
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {TONES.map((t) => (
                          <button
                            key={t}
                            onClick={() => setTone(t)}
                            className={cn(
                              'px-3 py-1.5 rounded-lg text-[11px] border capitalize transition-all',
                              tone === t
                                ? 'bg-[var(--accent-subtle)] border-[var(--accent)] text-[var(--accent-text)]'
                                : 'border-[var(--border)] text-[var(--text-2)] hover:border-[var(--border-medium)]'
                            )}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Prompt */}
                    <div>
                      <label className="text-[10px] uppercase tracking-[1.5px] text-[var(--text-3)] mb-1.5 block">
                        What do you want to write?
                      </label>
                      <textarea
                        ref={promptRef}
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) generate()
                        }}
                        placeholder="e.g. 'Follow up with the client about the proposal from last week' or 'Reschedule the Friday meeting to next Tuesday'"
                        rows={4}
                        className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl px-3.5 py-3 text-[13px] text-white placeholder:text-[var(--text-3)] outline-none focus:border-[var(--accent)] transition-colors resize-none leading-relaxed"
                      />
                      <p className="text-[9.5px] text-[var(--text-3)] mt-1">⌘↵ to generate</p>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={generate}
                      disabled={!prompt.trim() || loading}
                      className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl text-[13px] font-medium text-white disabled:opacity-40 transition-all"
                      style={{ background: 'var(--accent)' }}
                    >
                      {loading ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          ARIA is writing…
                        </>
                      ) : (
                        <>
                          <Zap size={14} />
                          Generate Email
                        </>
                      )}
                    </motion.button>
                  </>
                ) : (
                  <>
                    {/* Generated result */}
                    <div>
                      <label className="text-[10px] uppercase tracking-[1.5px] text-[var(--text-3)] mb-1.5 block">
                        Subject
                      </label>
                      <input
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-[13px] text-white outline-none focus:border-[var(--accent)] transition-colors"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] uppercase tracking-[1.5px] text-[var(--text-3)] mb-1.5 block">
                        Body
                      </label>
                      <textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        rows={9}
                        className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl px-3.5 py-3 text-[13px] text-white outline-none focus:border-[var(--accent)] transition-colors resize-none leading-relaxed font-mono text-[12px]"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setStep('prompt')}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[var(--border)] text-[var(--text-2)] text-[12px] hover:border-[var(--border-medium)] transition-all"
                      >
                        <ChevronDown size={12} className="rotate-90" />
                        Re-generate
                      </button>
                      <button
                        onClick={copyToClipboard}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[var(--border)] text-[var(--text-2)] text-[12px] hover:border-[var(--border-medium)] transition-all"
                      >
                        <Copy size={12} />
                        Copy
                      </button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={send}
                        disabled={sending}
                        className="ml-auto flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-medium text-white disabled:opacity-50 transition-all"
                        style={{ background: 'var(--accent)' }}
                      >
                        {sending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                        {sending ? 'Sending…' : 'Send'}
                      </motion.button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
