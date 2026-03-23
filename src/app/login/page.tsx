'use client'

import { signIn } from 'next-auth/react'
import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
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
    } catch (e) {
      setError('Prijavljivanje nije uspjelo. Pokušajte ponovo.')
      setLoadingProvider(null)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden text-[#1A1A1A]"
      style={{ background: '#F6F6F3' }} // Updated to Light Minimalist background
    >
      {/* Subtle ambient gradient orbs - light mode version */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '-15%',
          right: '-8%',
          width: 700,
          height: 700,
          background: 'radial-gradient(ellipse, rgba(124,92,255,0.03) 0%, transparent 60%)',
        }}
      />

      <div className="absolute inset-0 opacity-[0.03] select-none pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 0.5px, transparent 0.5px)', backgroundSize: '24px 24px' }} />

      <Suspense><ErrorBanner /></Suspense>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-[400px] mx-4"
      >
        {/* Card */}
        <div
          className="bg-white border border-[#E5E5E0] px-10 py-12"
          style={{ borderRadius: 24, boxShadow: '0 4px 24px rgba(0,0,0,0.02)' }}
        >
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.45 }}
            className="flex flex-col items-center mb-10"
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
              style={{
                background: 'var(--accent)',
                boxShadow: '0 8px 16px rgba(124,92,255,0.15)',
              }}
            >
              <Zap size={24} className="text-white" strokeWidth={2.5} />
            </div>
            <h1 className="font-outfit text-4xl font-light tracking-[-0.02em] text-[#1A1A1A]">
              Aria.
            </h1>
            <p className="text-[13px] mt-2 text-[#71717A]">
              Your AI-powered executive assistant
            </p>
          </motion.div>

          <AnimatePresence mode="wait">
            {authMode === 'PROVIDERS' ? (
              <motion.div
                key="providers"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
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

                <AuthButton
                  provider="azure-ad"
                  label="Continue with Microsoft"
                  loading={loadingProvider === 'azure-ad'}
                  disabled={loadingProvider !== null}
                  onClick={() => handleLogin('azure-ad')}
                  icon={<MicrosoftIcon />}
                />

                <div className="flex items-center gap-4 py-2">
                  <div className="flex-1 h-px bg-[#E5E5E0]" />
                  <span className="text-[10px] uppercase tracking-[2px] font-medium text-[#A1A1AA]">
                    OR
                  </span>
                  <div className="flex-1 h-px bg-[#E5E5E0]" />
                </div>

                <button
                  onClick={() => setAuthMode('IMAP')}
                  className="w-full h-12 flex items-center justify-center gap-3 rounded-xl text-[13px] font-medium transition-all hover:bg-[#F6F6F3] border border-[#E5E5E0]"
                >
                  <Mail size={16} className="text-[#A1A1AA]" />
                  Continue with IMAP/SMTP
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="credentials"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4"
              >
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-[#71717A] ml-1">Email Address</label>
                    <input
                      type="email"
                      value={credentials.email}
                      onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                      placeholder="you@company.com"
                      className="w-full h-12 px-4 rounded-xl text-[13px] border border-[#E5E5E0] focus:border-[#7C5CFF] outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-[#71717A] ml-1">App Password</label>
                    <input
                      type="password"
                      value={credentials.password}
                      onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                      placeholder="••••••••••••"
                      className="w-full h-12 px-4 rounded-xl text-[13px] border border-[#E5E5E0] focus:border-[#7C5CFF] outline-none transition-all"
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-[11px] text-[#F24E1E] ml-1 text-center bg-[#F24E1E]/5 py-2 rounded-lg border border-[#F24E1E]/10">
                    {error}
                  </p>
                )}

                <div className="flex gap-2.5 pt-2">
                  <button
                    onClick={() => { setAuthMode('PROVIDERS'); setError(null) }}
                    className="flex-1 h-12 rounded-xl text-[13px] font-medium border border-[#E5E5E0] hover:bg-[#F6F6F3] transition-all"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => handleLogin('credentials')}
                    disabled={loadingProvider !== null || !credentials.email || !credentials.password}
                    className="flex-[2] h-12 bg-[#1A1A1A] text-white rounded-xl text-[13px] font-medium transition-all hover:bg-black disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loadingProvider === 'credentials' ? <Loader2 size={16} className="animate-spin" /> : null}
                    {loadingProvider === 'credentials' ? 'Verifying…' : 'Sign In'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Fine print */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="text-center text-[11px] mt-8 text-[#A1A1AA]"
          >
            By continuing you agree to our{' '}
            <a href="#" className="text-[#1A1A1A] hover:underline font-medium">Terms</a>
            {' '}&amp;{' '}
            <a href="#" className="text-[#1A1A1A] hover:underline font-medium">Privacy Policy</a>
          </motion.p>
        </div>

        {/* Feature chips - hidden on mobile for cleaner login */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 grid grid-cols-3 gap-3"
        >
          {FEATURES.map((f) => (
            <div
              key={f.label}
              className="py-3 px-2 rounded-xl text-center border border-[#E5E5E0] bg-white/50"
            >
              <div className="mb-1.5 flex justify-center">
                <f.Icon size={14} className="text-[#1A1A1A]" />
              </div>
              <p className="text-[10px] font-medium text-[#71717A]">
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
