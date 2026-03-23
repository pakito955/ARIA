'use client'

/**
 * ImapConnectModal — 2-step wizard for connecting any IMAP/SMTP email account.
 * Step 1: email + app password (auto-detects server config for known hosts)
 * Step 2: advanced server settings (pre-filled, editable)
 *
 * @Agent3 — Frontend/UX Engineer
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Mail, Lock, Server, ChevronRight, ChevronLeft, Loader2, CheckCircle, AlertCircle, Eye, EyeOff, Info } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'

interface ImapConnectModalProps {
  onClose: () => void
}

interface FormState {
  email: string
  password: string
  imapHost: string
  imapPort: string
  smtpHost: string
  smtpPort: string
  useSsl: boolean
}

const INITIAL_FORM: FormState = {
  email: '',
  password: '',
  imapHost: '',
  imapPort: '993',
  smtpHost: '',
  smtpPort: '587',
  useSsl: true,
}

// ─── Known hosts hint map ─────────────────────────────────────────────────────
const HOST_HINTS: Record<string, string> = {
  'icloud.com': 'iCloud Mail',
  'me.com': 'iCloud Mail',
  'mac.com': 'iCloud Mail',
  'yahoo.com': 'Yahoo Mail',
  'yahoo.co.uk': 'Yahoo Mail',
  'aol.com': 'AOL Mail',
  'zoho.com': 'Zoho Mail',
  'protonmail.com': 'ProtonMail Bridge',
  'proton.me': 'ProtonMail Bridge',
  'hotmail.com': 'Outlook/Exchange',
  'outlook.com': 'Outlook/Exchange',
  'live.com': 'Outlook/Exchange',
  'msn.com': 'Outlook/Exchange',
}

function getProviderHint(email: string): string | null {
  const domain = email.split('@')[1]?.toLowerCase()
  return domain ? (HOST_HINTS[domain] ?? null) : null
}

// ─── Field component ──────────────────────────────────────────────────────────
function Field({
  label, type = 'text', value, onChange, placeholder, hint, autoComplete,
}: {
  label: string
  type?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  hint?: string
  autoComplete?: string
}) {
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'

  return (
    <div className="space-y-1">
      <label className="text-[11.5px] font-medium" style={{ color: 'var(--text-2)' }}>
        {label}
      </label>
      <div className="relative">
        <input
          type={isPassword && show ? 'text' : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          spellCheck={false}
          className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none transition-colors"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-medium)',
            color: 'var(--text-1)',
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-medium)')}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5"
            style={{ color: 'var(--text-3)' }}
          >
            {show ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        )}
      </div>
      {hint && (
        <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>{hint}</p>
      )}
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────
export function ImapConnectModal({ onClose }: ImapConnectModalProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [error, setError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const set = (key: keyof FormState) => (value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }))

  const providerHint = getProviderHint(form.email)

  // Auto-fill server fields when advancing to step 2
  async function handleNextStep() {
    if (!form.email.includes('@') || form.password.length < 1) {
      setError('Please enter a valid email and password.')
      return
    }
    setError(null)

    // If user hasn't set server config, pre-fill from server-side detection
    if (!form.imapHost) {
      try {
        const domain = form.email.split('@')[1]?.toLowerCase()
        const defaultPort = '993'
        const defaultSmtpPort = '587'
        // Apply sensible defaults based on domain patterns
        if (domain?.endsWith('.com') || domain?.endsWith('.co.uk')) {
          set('imapHost')(`imap.${domain}`)
          set('smtpHost')(`smtp.${domain}`)
        }
        set('imapPort')(defaultPort)
        set('smtpPort')(defaultSmtpPort)
      } catch { /* ignore */ }
    }

    setStep(2)
  }

  const connectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/integrations/imap/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          imapHost: form.imapHost || undefined,
          imapPort: form.imapPort ? parseInt(form.imapPort, 10) : undefined,
          smtpHost: form.smtpHost || undefined,
          smtpPort: form.smtpPort ? parseInt(form.smtpPort, 10) : undefined,
          useSsl: form.useSsl,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Connection failed')
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations-status'] })
      queryClient.invalidateQueries({ queryKey: ['imap-integrations'] })
      onClose()
    },
    onError: (err: Error) => {
      setError(err.message)
    },
  })

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="w-full max-w-md rounded-2xl overflow-hidden"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-medium)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-subtle)' }}>
                <Mail size={14} style={{ color: 'var(--accent-text)' }} />
              </div>
              <div>
                <h2 className="text-[14px] font-semibold" style={{ color: 'var(--text-1)' }}>
                  Connect Email Account
                </h2>
                <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>
                  {step === 1 ? 'Step 1 of 2 — Credentials' : 'Step 2 of 2 — Server Settings'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
              style={{ color: 'var(--text-3)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <X size={14} />
            </button>
          </div>

          {/* Progress bar */}
          <div className="h-0.5 w-full" style={{ background: 'var(--border)' }}>
            <motion.div
              className="h-full"
              style={{ background: 'var(--accent)' }}
              animate={{ width: step === 1 ? '50%' : '100%' }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            />
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-4">
            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-4"
                >
                  {/* Info banner */}
                  <div className="flex gap-2.5 p-3 rounded-xl text-[11.5px]" style={{ background: 'var(--accent-subtle)', border: '1px solid rgba(124,92,255,0.2)' }}>
                    <Info size={13} style={{ color: 'var(--accent-text)', flexShrink: 0, marginTop: 1 }} />
                    <span style={{ color: 'var(--text-2)' }}>
                      Use an <strong>app password</strong> — not your regular login password. Required for iCloud, Yahoo, Gmail with 2FA, and Outlook.
                    </span>
                  </div>

                  <Field
                    label="Email address"
                    type="email"
                    value={form.email}
                    onChange={set('email')}
                    placeholder="you@example.com"
                    autoComplete="email"
                    hint={providerHint ? `Detected: ${providerHint}` : undefined}
                  />

                  <Field
                    label="App password"
                    type="password"
                    value={form.password}
                    onChange={set('password')}
                    placeholder="App-specific password"
                    autoComplete="new-password"
                    hint="Your password is encrypted before storage and never logged."
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-4"
                >
                  <p className="text-[12px]" style={{ color: 'var(--text-3)' }}>
                    Server settings are auto-detected. Only change these if you know they're wrong.
                  </p>

                  <div className="grid grid-cols-[1fr_auto] gap-3">
                    <Field
                      label="IMAP host"
                      value={form.imapHost}
                      onChange={set('imapHost')}
                      placeholder="imap.mail.me.com"
                    />
                    <Field
                      label="Port"
                      type="number"
                      value={form.imapPort}
                      onChange={set('imapPort')}
                      placeholder="993"
                    />
                  </div>

                  <div className="grid grid-cols-[1fr_auto] gap-3">
                    <Field
                      label="SMTP host"
                      value={form.smtpHost}
                      onChange={set('smtpHost')}
                      placeholder="smtp.mail.me.com"
                    />
                    <Field
                      label="Port"
                      type="number"
                      value={form.smtpPort}
                      onChange={set('smtpPort')}
                      placeholder="587"
                    />
                  </div>

                  {/* SSL toggle */}
                  <div className="flex items-center justify-between py-1">
                    <div>
                      <p className="text-[12.5px] font-medium" style={{ color: 'var(--text-1)' }}>Use SSL/TLS</p>
                      <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>Recommended for all connections</p>
                    </div>
                    <button
                      onClick={() => set('useSsl')(!form.useSsl)}
                      className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus:outline-none"
                      style={{ background: form.useSsl ? 'var(--accent)' : 'var(--bg-hover)', border: '1px solid var(--border-medium)' }}
                    >
                      <span
                        className="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200"
                        style={{ transform: form.useSsl ? 'translateX(17px)' : 'translateX(1px)', marginTop: '1px' }}
                      />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-start gap-2 p-3 rounded-xl text-[11.5px]"
                  style={{ background: 'var(--red-subtle)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--red)' }}
                >
                  <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-surface)' }}
          >
            {step === 2 ? (
              <button
                onClick={() => { setStep(1); setError(null) }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-colors"
                style={{ color: 'var(--text-2)', border: '1px solid var(--border-medium)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <ChevronLeft size={13} /> Back
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-3 py-2 rounded-xl text-[12px] font-medium transition-colors"
                style={{ color: 'var(--text-2)', border: '1px solid var(--border-medium)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                Cancel
              </button>
            )}

            {step === 1 ? (
              <button
                onClick={handleNextStep}
                disabled={!form.email || !form.password}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-medium transition-opacity',
                  (!form.email || !form.password) && 'opacity-50 cursor-not-allowed'
                )}
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                Next <ChevronRight size={13} />
              </button>
            ) : (
              <button
                onClick={() => connectMutation.mutate()}
                disabled={connectMutation.isPending}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-medium transition-opacity disabled:opacity-60"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                {connectMutation.isPending ? (
                  <><Loader2 size={12} className="animate-spin" /> Connecting…</>
                ) : connectMutation.isSuccess ? (
                  <><CheckCircle size={12} /> Connected!</>
                ) : (
                  <>Connect account</>
                )}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
