'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { motion } from 'framer-motion'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)

  const handleLogin = async (provider: string) => {
    setLoading(true)
    await signIn(provider, { callbackUrl: '/dashboard' })
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* Subtle grid */}
      <div className="absolute inset-0 grid-bg opacity-40" />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-[360px] mx-4 text-center"
      >
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-10"
        >
          <p
            className="text-[10px] tracking-[3px] uppercase mb-5 font-medium"
            style={{ color: 'var(--text-3)' }}
          >
            AI Executive Assistant
          </p>
          <h1
            className="text-6xl font-bold tracking-tight mb-3"
            style={{ color: 'var(--text-1)', fontFamily: 'var(--font-outfit)' }}
          >
            ARIA
          </h1>
          <p
            className="text-[14px] leading-relaxed"
            style={{ color: 'var(--text-2)' }}
          >
            Čita tvoje emailove. Razumije kontekst.<br />
            Organizuje sve — automatski.
          </p>
        </motion.div>

        {/* Login buttons */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-2.5"
        >
          <button
            onClick={() => handleLogin('google')}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl text-[13px] font-medium transition-all disabled:opacity-40"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-medium)',
              color: 'var(--text-1)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border-focus)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-medium)')}
          >
            <GoogleIcon />
            Nastavi sa Google
          </button>

          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            <span className="text-[10px] tracking-widest" style={{ color: 'var(--text-3)' }}>ILI</span>
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          </div>

          <button
            onClick={() => handleLogin('azure-ad')}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl text-[13px] font-medium transition-all disabled:opacity-40"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-medium)',
              color: 'var(--text-1)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border-focus)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-medium)')}
          >
            <MicrosoftIcon />
            Nastavi sa Microsoft
          </button>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="mt-10 grid grid-cols-3 gap-2"
        >
          {[
            { icon: '⚡', label: 'AI analiza' },
            { icon: '✉', label: 'Gmail + Outlook' },
            { icon: '📅', label: 'Auto schedule' },
          ].map((f) => (
            <div
              key={f.label}
              className="py-3 rounded-xl text-center"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <div className="text-base mb-1">{f.icon}</div>
              <p className="text-[10px] font-medium" style={{ color: 'var(--text-3)' }}>{f.label}</p>
            </div>
          ))}
        </motion.div>

        <p className="text-[10px] mt-8" style={{ color: 'var(--text-3)' }}>
          Prijavom prihvatate{' '}
          <a href="#" style={{ color: 'var(--accent-text)' }} className="hover:underline">Terms of Service</a>
          {' '}|{' '}
          <a href="#" style={{ color: 'var(--accent-text)' }} className="hover:underline">Privacy Policy</a>
        </p>
      </motion.div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

function MicrosoftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 23 23">
      <rect x="1" y="1" width="10" height="10" fill="#f25022"/>
      <rect x="12" y="1" width="10" height="10" fill="#7fba00"/>
      <rect x="1" y="12" width="10" height="10" fill="#00a4ef"/>
      <rect x="12" y="12" width="10" height="10" fill="#ffb900"/>
    </svg>
  )
}
