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
    <div className="min-h-screen flex items-center justify-center bg-[#080810] relative overflow-hidden">
      {/* Grid bg */}
      <div className="absolute inset-0 grid-bg opacity-60" />

      {/* Ambient orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute w-96 h-96 rounded-full orb-float"
          style={{
            top: '-10%', left: '50%', transform: 'translateX(-50%)',
            background: 'radial-gradient(circle, rgba(232,201,122,0.07) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute w-72 h-72 rounded-full"
          style={{
            bottom: '10%', right: '10%',
            background: 'radial-gradient(circle, rgba(79,209,197,0.05) 0%, transparent 70%)',
            animation: 'float-orb 8s ease-in-out infinite reverse',
          }}
        />
      </div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-sm mx-4 text-center"
      >
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <p className="text-[10px] tracking-[4px] uppercase text-[#e8c97a] mb-6">
            AI Executive Assistant
          </p>
          <h1 className="font-cormorant text-7xl font-light italic text-gradient-gold mb-2">
            ARIA
          </h1>
          <p className="text-[14px] text-[#8888aa] leading-relaxed mb-10">
            Čita tvoje emailove. Razumije kontekst.<br />
            Organizuje sve — automatski.
          </p>
        </motion.div>

        {/* Login buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-3"
        >
          <button
            onClick={() => handleLogin('google')}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3.5 bg-white/[0.04] border border-white/[0.11] rounded text-sm text-white hover:bg-white/[0.07] hover:border-white/20 transition-all disabled:opacity-50"
          >
            <GoogleIcon />
            Nastavi sa Google
          </button>

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-[10px] text-[#5a5a78] tracking-widest">ILI</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          <button
            onClick={() => handleLogin('azure-ad')}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3.5 bg-white/[0.04] border border-white/[0.11] rounded text-sm text-white hover:bg-white/[0.07] hover:border-white/20 transition-all disabled:opacity-50"
          >
            <MicrosoftIcon />
            Nastavi sa Microsoft
          </button>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-10 grid grid-cols-3 gap-3"
        >
          {[
            { icon: '⚡', label: 'AI analiza' },
            { icon: '✉', label: 'Gmail + Outlook' },
            { icon: '📅', label: 'Auto schedule' },
          ].map((f) => (
            <div key={f.label} className="text-center">
              <div className="text-lg mb-1 opacity-40">{f.icon}</div>
              <p className="text-[9px] text-[#5a5a78] tracking-wide">{f.label}</p>
            </div>
          ))}
        </motion.div>

        <p className="text-[9px] text-[#5a5a78] mt-8">
          Prijavom prihvatate{' '}
          <a href="#" className="text-[#e8c97a] hover:underline">Terms of Service</a>
          {' '}i{' '}
          <a href="#" className="text-[#e8c97a] hover:underline">Privacy Policy</a>
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
