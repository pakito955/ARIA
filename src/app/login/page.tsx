'use client'

import { signIn } from 'next-auth/react'
import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Loader2, Zap, Mail, Calendar } from 'lucide-react'

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
        border: '1px solid rgba(248,113,113,0.25)',
        boxShadow: 'var(--glow-red)',
      }}
    >
      <span className="text-sm">!</span>
      {messages[error] || messages.Default}
    </motion.div>
  )
}

const FEATURES = [
  { Icon: Zap,      label: 'AI Analysis' },
  { Icon: Mail,     label: 'Gmail + Outlook' },
  { Icon: Calendar, label: 'Auto Schedule' },
]

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
      style={{ background: '#0B0B0F' }}
    >
      {/* Subtle ambient gradient orbs */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '-15%',
          right: '-8%',
          width: 700,
          height: 700,
          background: 'radial-gradient(ellipse, rgba(124,92,255,0.07) 0%, transparent 60%)',
          animation: 'float-orb 9s ease-in-out infinite',
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: '-10%',
          left: '-5%',
          width: 500,
          height: 500,
          background: 'radial-gradient(ellipse, rgba(96,165,250,0.04) 0%, transparent 65%)',
          animation: 'float-orb 12s ease-in-out infinite reverse',
        }}
      />

      {/* Grid */}
      <div className="absolute inset-0 grid-bg opacity-25" />
      <div className="noise-overlay" />

      <Suspense><ErrorBanner /></Suspense>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-[400px] mx-4"
      >
        {/* Card */}
        <div
          className="card-glass px-10 py-10"
          style={{ borderRadius: 20 }}
        >
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.45 }}
            className="flex flex-col items-center mb-8"
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
              style={{
                background: 'linear-gradient(135deg, #7C5CFF, #A78BFA)',
                boxShadow: '0 0 32px rgba(124,92,255,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
              }}
            >
              <Zap size={22} className="text-white" strokeWidth={2.5} />
            </div>
            <h1 className="gradient-text font-outfit text-4xl font-bold tracking-[0.1em] mb-2">
              ARIA
            </h1>
            <p className="text-[14px] text-center leading-relaxed" style={{ color: 'var(--text-2)' }}>
              Your AI-powered email assistant
            </p>
          </motion.div>

          {/* Divider */}
          <div className="mb-6 h-px" style={{ background: 'var(--border)' }} />

          {/* Auth buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
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

          {/* Fine print */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="text-center text-[11px] mt-6"
            style={{ color: 'var(--text-3)' }}
          >
            By continuing you agree to our{' '}
            <a href="#" style={{ color: 'var(--accent-text)' }} className="hover:underline">Terms</a>
            {' '}&amp;{' '}
            <a href="#" style={{ color: 'var(--accent-text)' }} className="hover:underline">Privacy Policy</a>
          </motion.p>
        </div>

        {/* Feature chips below card */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-6 grid grid-cols-3 gap-2"
        >
          {FEATURES.map((f) => (
            <div
              key={f.label}
              className="py-3 rounded-xl text-center"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border)',
              }}
            >
              <div className="mb-1.5 flex justify-center">
                <f.Icon size={14} style={{ color: 'var(--accent-text)' }} />
              </div>
              <p className="text-[10px] font-medium leading-tight" style={{ color: 'var(--text-3)' }}>
                {f.label}
              </p>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

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
      className="w-full flex items-center justify-center gap-3 py-3 rounded-xl text-[13px] font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--bg-hover)]"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-medium)',
        color: 'var(--text-1)',
      }}
    >
      {loading
        ? <Loader2 size={16} className="animate-spin" style={{ color: 'var(--accent-text)' }} />
        : icon
      }
      {loading ? 'Signing in…' : label}
    </button>
  )
}

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
