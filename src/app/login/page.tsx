'use client'

import { signIn } from 'next-auth/react'
import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'

function ErrorBanner() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  if (!error) return null

  const messages: Record<string, string> = {
    OAuthCallback: 'OAuth sign-in failed. Please try again.',
    OAuthSignin: 'Could not start sign-in. Please try again.',
    Callback: 'Authentication callback failed.',
    Default: `Authentication error: ${error}`,
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-medium whitespace-nowrap"
      style={{
        background: 'var(--red-subtle)',
        color: 'var(--red)',
        border: '1px solid rgba(239,68,68,0.25)',
        boxShadow: 'var(--glow-red)',
      }}
    >
      <span style={{ fontSize: 14 }}>⚠</span>
      {messages[error] || messages.Default}
    </motion.div>
  )
}

export default function LoginPage() {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null)

  const handleLogin = async (provider: string) => {
    setLoadingProvider(provider)
    try {
      await signIn(provider, { callbackUrl: '/dashboard' })
    } catch {
      setLoadingProvider(null)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* Ambient background */}
      <div className="absolute inset-0 grid-bg opacity-30" />
      <div className="mesh-bg" />
      <div className="noise-overlay" />

      <Suspense><ErrorBanner /></Suspense>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-[380px] mx-4"
      >
        {/* Logo mark */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-10"
        >
          <div className="flex items-center justify-center mb-6">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                boxShadow: '0 0 40px rgba(124,58,237,0.35), inset 0 1px 0 rgba(255,255,255,0.15)',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path
                  d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z"
                  fill="white"
                  stroke="white"
                  strokeWidth="0.5"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          <p
            className="text-[10px] tracking-[4px] uppercase mb-3 font-medium"
            style={{ color: 'var(--text-3)' }}
          >
            AI Executive Assistant
          </p>
          <h1
            className="font-outfit text-5xl font-bold tracking-[-0.03em] mb-3"
            style={{ color: 'var(--text-1)' }}
          >
            ARIA
          </h1>
          <p className="text-[14px] leading-relaxed" style={{ color: 'var(--text-2)' }}>
            Reads your emails. Understands context.
            <br />
            Organizes everything — automatically.
          </p>
        </motion.div>

        {/* Auth buttons */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.45 }}
          className="space-y-3"
        >
          <AuthButton
            provider="google"
            label="Continue with Google"
            loading={loadingProvider === 'google'}
            disabled={loadingProvider !== null}
            onClick={() => handleLogin('google')}
            icon={<GoogleIcon />}
          />

          <div className="flex items-center gap-3 py-0.5">
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            <span className="text-[10px] tracking-[3px] font-medium" style={{ color: 'var(--text-3)' }}>
              OR
            </span>
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          </div>

          <AuthButton
            provider="azure-ad"
            label="Continue with Microsoft"
            loading={loadingProvider === 'azure-ad'}
            disabled={loadingProvider !== null}
            onClick={() => handleLogin('azure-ad')}
            icon={<MicrosoftIcon />}
          />
        </motion.div>

        {/* Feature chips */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="mt-8 grid grid-cols-3 gap-2"
        >
          {FEATURES.map((f) => (
            <div
              key={f.label}
              className="py-3.5 rounded-xl text-center"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <div className="text-[18px] mb-1.5" style={{ lineHeight: 1 }}>{f.icon}</div>
              <p className="text-[10px] font-medium leading-tight" style={{ color: 'var(--text-3)' }}>
                {f.label}
              </p>
            </div>
          ))}
        </motion.div>

        <p className="text-center text-[10px] mt-7" style={{ color: 'var(--text-3)' }}>
          By signing in you agree to our{' '}
          <a href="#" style={{ color: 'var(--accent-text)' }} className="hover:underline">
            Terms
          </a>{' '}
          &{' '}
          <a href="#" style={{ color: 'var(--accent-text)' }} className="hover:underline">
            Privacy Policy
          </a>
        </p>
      </motion.div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

interface AuthButtonProps {
  provider: string
  label: string
  icon: React.ReactNode
  loading: boolean
  disabled: boolean
  onClick: () => void
}

function AuthButton({ label, icon, loading, disabled, onClick }: AuthButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl text-[13px] font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-medium)',
        color: 'var(--text-1)',
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.borderColor = 'var(--border-focus)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-medium)'
      }}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : icon}
      {loading ? 'Signing in…' : label}
    </button>
  )
}

const FEATURES = [
  { icon: '⚡', label: 'AI Analysis' },
  { icon: '✉', label: 'Gmail + Outlook' },
  { icon: '📅', label: 'Auto Schedule' },
]

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

function MicrosoftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 23 23" aria-hidden="true">
      <rect x="1"  y="1"  width="10" height="10" fill="#f25022"/>
      <rect x="12" y="1"  width="10" height="10" fill="#7fba00"/>
      <rect x="1"  y="12" width="10" height="10" fill="#00a4ef"/>
      <rect x="12" y="12" width="10" height="10" fill="#ffb900"/>
    </svg>
  )
}
