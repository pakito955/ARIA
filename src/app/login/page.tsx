'use client'

import { signIn } from 'next-auth/react'
import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Zap, Mail, Calendar, Shield } from 'lucide-react'

function ErrorBanner() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  if (!error) return null

  const messages: Record<string, string> = {
    OAuthCallback: 'OAuth sign-in failed. Please try again.',
    OAuthSignin:   'Could not start sign-in. Please try again.',
    Callback:      'Authentication callback failed.',
    Default:       `Authentication error: ${error}`,
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute top-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-medium whitespace-nowrap"
      style={{
        background: 'rgba(255, 107, 107, 0.10)',
        color: '#FF6B6B',
        border: '1px solid rgba(255, 107, 107, 0.20)',
      }}
    >
      <span>⚠</span>
      {messages[error] || messages.Default}
    </motion.div>
  )
}

const FEATURES = [
  { Icon: Zap,      label: 'AI Triage' },
  { Icon: Mail,     label: 'Gmail + Outlook' },
  { Icon: Calendar, label: 'Auto Schedule' },
  { Icon: Shield,   label: 'Encrypted' },
]

export default function LoginPage() {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null)
  const [authMode, setAuthMode] = useState<'PROVIDERS' | 'IMAP'>('PROVIDERS')
  const [credentials, setCredentials] = useState({ email: '', password: '' })
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (provider: string) => {
    setLoadingProvider(provider)
    setError(null)
    try {
      if (provider === 'credentials') {
        const res = await signIn('credentials', {
          email: credentials.email,
          password: credentials.password,
          redirect: false,
          callbackUrl: '/dashboard',
        })
        if (res?.error) {
          setError(res.error)
          setLoadingProvider(null)
        } else {
          window.location.href = '/dashboard'
        }
      } else {
        await signIn(provider, { callbackUrl: '/dashboard' })
      }
    } catch {
      setError('Sign-in failed. Please try again.')
      setLoadingProvider(null)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: '#09090F' }}
    >
      {/* ── Ambient background ─────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Top-right violet glow */}
        <div
          className="absolute"
          style={{
            top: '-20%', right: '-10%',
            width: 900, height: 900,
            background: 'radial-gradient(ellipse, rgba(124, 92, 255, 0.07) 0%, transparent 55%)',
          }}
        />
        {/* Bottom-left warm glow */}
        <div
          className="absolute"
          style={{
            bottom: '-20%', left: '-10%',
            width: 700, height: 700,
            background: 'radial-gradient(ellipse, rgba(242, 78, 30, 0.06) 0%, transparent 55%)',
          }}
        />
        {/* Center accent glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: 500, height: 500,
            background: 'radial-gradient(ellipse, rgba(242, 78, 30, 0.03) 0%, transparent 60%)',
          }}
        />
        {/* Subtle grid */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.03) 0.5px, transparent 0.5px)',
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      <Suspense><ErrorBanner /></Suspense>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-[380px] mx-5"
      >
        {/* ── Status chip ──────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="flex justify-center mb-7"
        >
          <div
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-medium tracking-wide"
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: 'rgba(255, 255, 255, 0.40)',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: '#51CF66', boxShadow: '0 0 6px rgba(81,207,102,0.6)' }}
            />
            AI systems operational
          </div>
        </motion.div>

        {/* ── Card ─────────────────────────────────────────── */}
        <div
          style={{
            background: '#FAFAFA',
            borderRadius: 22,
            padding: '44px 40px 40px',
            boxShadow: '0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06)',
          }}
        >
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.4 }}
            className="flex flex-col items-center mb-9"
          >
            <div
              className="w-12 h-12 flex items-center justify-center mb-4"
              style={{
                background: 'var(--accent)',
                borderRadius: 14,
                boxShadow: '0 8px 24px rgba(242, 78, 30, 0.32)',
              }}
            >
              <Zap size={20} className="text-white" strokeWidth={2.5} />
            </div>
            <h1
              style={{
                fontFamily: 'var(--font-inter)',
                fontSize: 30,
                fontWeight: 300,
                letterSpacing: '-0.04em',
                color: '#0A0A0F',
                lineHeight: 1,
                margin: 0,
              }}
            >
              Aria<span style={{ color: 'var(--accent)' }}>.</span>
            </h1>
            <p style={{ fontSize: 12, color: '#999', marginTop: 7, letterSpacing: '0.01em' }}>
              Your AI-powered executive assistant
            </p>
          </motion.div>

          {/* Auth forms */}
          <AnimatePresence mode="wait">
            {authMode === 'PROVIDERS' ? (
              <motion.div
                key="providers"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                <ProviderButton
                  label="Continue with Google"
                  loading={loadingProvider === 'google'}
                  disabled={loadingProvider !== null}
                  onClick={() => handleLogin('google')}
                  icon={<GoogleIcon />}
                />
                <ProviderButton
                  label="Continue with Microsoft"
                  loading={loadingProvider === 'azure-ad'}
                  disabled={loadingProvider !== null}
                  onClick={() => handleLogin('azure-ad')}
                  icon={<MicrosoftIcon />}
                />

                <div className="flex items-center gap-3 py-1">
                  <div className="flex-1 h-px" style={{ background: '#EBEBEB' }} />
                  <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.10em', color: '#C0C0C0', textTransform: 'uppercase' }}>
                    or
                  </span>
                  <div className="flex-1 h-px" style={{ background: '#EBEBEB' }} />
                </div>

                <button
                  onClick={() => setAuthMode('IMAP')}
                  className="w-full h-11 flex items-center justify-center gap-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 hover:bg-[#F0F0F0]"
                  style={{ border: '1px solid #E5E5E0', color: '#777', background: 'transparent' }}
                >
                  <Mail size={14} style={{ color: '#AAA' }} />
                  Use IMAP / SMTP
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="credentials"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                <div className="space-y-3">
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 500, color: '#888', display: 'block', marginBottom: 5 }}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={credentials.email}
                      onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                      placeholder="you@company.com"
                      className="w-full h-11 px-4 rounded-xl text-[13px] outline-none transition-all duration-150 focus:border-[#1A1A1A] focus:shadow-[0_0_0_3px_rgba(0,0,0,0.05)]"
                      style={{ border: '1px solid #E5E5E0', background: '#FFF', color: '#1A1A1A' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 500, color: '#888', display: 'block', marginBottom: 5 }}>
                      App Password
                    </label>
                    <input
                      type="password"
                      value={credentials.password}
                      onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                      placeholder="••••••••••••"
                      className="w-full h-11 px-4 rounded-xl text-[13px] outline-none transition-all duration-150 focus:border-[#1A1A1A] focus:shadow-[0_0_0_3px_rgba(0,0,0,0.05)]"
                      style={{ border: '1px solid #E5E5E0', background: '#FFF', color: '#1A1A1A' }}
                    />
                  </div>
                </div>

                {error && (
                  <p
                    className="text-center py-2 px-3 rounded-xl text-[12px]"
                    style={{
                      background: 'rgba(242, 78, 30, 0.06)',
                      color: 'var(--accent)',
                      border: '1px solid rgba(242, 78, 30, 0.12)',
                    }}
                  >
                    {error}
                  </p>
                )}

                <div className="flex gap-2.5 pt-1">
                  <button
                    onClick={() => { setAuthMode('PROVIDERS'); setError(null) }}
                    className="flex-1 h-11 rounded-xl text-[13px] font-medium transition-all duration-150 hover:bg-[#F0F0F0]"
                    style={{ border: '1px solid #E5E5E0', color: '#666', background: 'transparent' }}
                  >
                    Back
                  </button>
                  <button
                    onClick={() => handleLogin('credentials')}
                    disabled={loadingProvider !== null || !credentials.email || !credentials.password}
                    className="flex-[2] h-11 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-2 transition-all duration-150 hover:opacity-90 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: '#0A0A0F', color: '#FFF' }}
                  >
                    {loadingProvider === 'credentials' && (
                      <Loader2 size={14} className="animate-spin" />
                    )}
                    {loadingProvider === 'credentials' ? 'Verifying…' : 'Sign In'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Fine print */}
          <p className="text-center mt-8" style={{ fontSize: 11, color: '#C0C0C0' }}>
            By continuing you agree to our{' '}
            <a href="#" style={{ color: '#999', textDecorationLine: 'underline' }}>Terms</a>
            {' '}&amp;{' '}
            <a href="#" style={{ color: '#999', textDecorationLine: 'underline' }}>Privacy</a>
          </p>
        </div>

        {/* ── Feature chips ─────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 flex justify-center gap-2.5 flex-wrap"
        >
          {FEATURES.map((f) => (
            <div
              key={f.label}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                color: 'rgba(255, 255, 255, 0.30)',
              }}
            >
              <f.Icon size={11} />
              <span style={{ fontSize: 11, fontWeight: 500 }}>{f.label}</span>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

interface ProviderButtonProps {
  label: string
  icon: React.ReactNode
  loading: boolean
  disabled: boolean
  onClick: () => void
}

function ProviderButton({ label, icon, loading, disabled, onClick }: ProviderButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full h-11 flex items-center justify-center gap-3 rounded-xl text-[13px] font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#F4F4F4] active:scale-[0.98]"
      style={{
        background: '#FFFFFF',
        border: '1px solid #E5E5E0',
        color: '#1A1A1A',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      {loading
        ? <Loader2 size={15} className="animate-spin" style={{ color: 'var(--accent)' }} />
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
