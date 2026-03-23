'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Check, Zap, Mail, Calendar, ArrowRight, Loader2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

const STEPS = [
  {
    id: 1,
    title: 'Connect your inbox',
    subtitle: 'ARIA needs access to read and organize your email',
    icon: Mail,
  },
  {
    id: 2,
    title: 'ARIA is learning your email patterns',
    subtitle: 'Scanning, prioritizing, and building your command center',
    icon: Sparkles,
  },
  {
    id: 3,
    title: "You're ready",
    subtitle: 'ARIA has analyzed your inbox and is ready to help',
    icon: Check,
  },
]

const ANALYZING_STEPS = [
  'Reading inbox…',
  'Detecting priorities…',
  'Building your command center…',
]

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeProgress, setAnalyzeProgress] = useState(0)
  const router = useRouter()

  const handleConnectGmail = async () => {
    setLoading(true)
    await signIn('google', { callbackUrl: '/onboarding?step=2' })
  }

  const handleRunAnalysis = async () => {
    setAnalyzing(true)
    setAnalyzeProgress(0)

    // Animate progress
    const progressInterval = setInterval(() => {
      setAnalyzeProgress((p) => {
        if (p >= 90) { clearInterval(progressInterval); return 90 }
        return p + Math.random() * 12
      })
    }, 400)

    try {
      await fetch('/api/emails')
      await new Promise((r) => setTimeout(r, 2200))
      clearInterval(progressInterval)
      setAnalyzeProgress(100)
      await new Promise((r) => setTimeout(r, 400))
      setStep(3)
      setAnalyzing(false)
      await fetch('/api/ai/briefing', { method: 'POST' })
    } catch {
      clearInterval(progressInterval)
      setAnalyzing(false)
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlStep = params.get('step')
    if (urlStep) setStep(parseInt(urlStep))
  }, [])

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: '#0B0B0F' }}
    >
      {/* Background orbs */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '-20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 600,
          height: 600,
          background: 'radial-gradient(ellipse, rgba(124,92,255,0.07) 0%, transparent 60%)',
          animation: 'float-orb 10s ease-in-out infinite',
        }}
      />
      <div className="absolute inset-0 grid-bg opacity-20" />
      <div className="noise-overlay" />

      <div className="relative z-10 w-full max-w-[480px] mx-4">

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center mb-10"
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
            style={{
              background: 'linear-gradient(135deg, #7C5CFF, #A78BFA)',
              boxShadow: '0 0 28px rgba(124,92,255,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
            }}
          >
            <Zap size={18} className="text-white" strokeWidth={2.5} />
          </div>
          <p className="text-[11px] font-medium tracking-[3px] uppercase" style={{ color: 'var(--text-3)' }}>
            Let's get you set up
          </p>
        </motion.div>

        {/* Step progress dots */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex items-center justify-center gap-2 mb-8"
        >
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-medium transition-all duration-400',
                  step > s.id
                    ? 'bg-[var(--green)]'
                    : step === s.id
                    ? 'bg-[var(--accent)]'
                    : 'border'
                )}
                style={{
                  boxShadow: step === s.id ? '0 0 16px rgba(124,92,255,0.4)' : 'none',
                  borderColor: step <= s.id && step !== s.id ? 'var(--border-medium)' : 'transparent',
                  color: step >= s.id ? '#fff' : 'var(--text-3)',
                  background: step > s.id
                    ? 'var(--green)'
                    : step === s.id
                    ? 'var(--accent)'
                    : 'var(--bg-card)',
                }}
              >
                {step > s.id ? <Check size={14} /> : s.id}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className="w-10 h-px transition-all duration-500"
                  style={{ background: step > s.id ? 'var(--green)' : 'var(--border-medium)' }}
                />
              )}
            </div>
          ))}
        </motion.div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl p-8 text-center"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.35)',
            }}
          >
            {/* Step 1 — Connect Gmail */}
            {step === 1 && (
              <>
                <div
                  className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
                  style={{
                    background: 'var(--accent-subtle)',
                    border: '1px solid rgba(124,92,255,0.25)',
                  }}
                >
                  <Mail size={24} style={{ color: 'var(--accent-text)' }} />
                </div>
                <h2
                  className="text-[22px] font-bold tracking-tight mb-2"
                  style={{ color: 'var(--text-1)' }}
                >
                  Connect your inbox
                </h2>
                <p className="text-[13px] leading-relaxed mb-7" style={{ color: 'var(--text-2)' }}>
                  ARIA reads your inbox to understand priorities, detect meetings,
                  and generate intelligent responses. Your data stays private.
                </p>

                <div className="space-y-2.5 mb-8 text-left">
                  {[
                    'Read and analyze incoming emails',
                    'Send replies on your behalf',
                    'Access Google Calendar for scheduling',
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-[13px]" style={{ color: 'var(--text-2)' }}>
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: 'var(--green-subtle)', border: '1px solid rgba(52,211,153,0.2)' }}
                      >
                        <Check size={10} style={{ color: 'var(--green)' }} />
                      </div>
                      {item}
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleConnectGmail}
                  disabled={loading}
                  className="w-full py-3.5 text-white text-[13px] font-medium rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                  style={{
                    background: 'linear-gradient(135deg, #7C5CFF, #6D4EF0)',
                    boxShadow: loading ? 'none' : '0 0 20px rgba(124,92,255,0.3)',
                  }}
                >
                  {loading
                    ? <Loader2 size={15} className="animate-spin" />
                    : <Mail size={15} />
                  }
                  {loading ? 'Connecting…' : 'Connect Gmail'}
                </button>
              </>
            )}

            {/* Step 2 — Analyzing */}
            {step === 2 && (
              <>
                <div
                  className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
                  style={{
                    background: 'var(--green-subtle)',
                    border: '1px solid rgba(52,211,153,0.2)',
                  }}
                >
                  {analyzing
                    ? <Loader2 size={24} className="animate-spin" style={{ color: 'var(--green)' }} />
                    : <Sparkles size={24} style={{ color: 'var(--green)' }} />
                  }
                </div>
                <h2
                  className="text-[22px] font-bold tracking-tight mb-2"
                  style={{ color: 'var(--text-1)' }}
                >
                  {analyzing ? 'ARIA is learning…' : 'Run first analysis'}
                </h2>
                <p className="text-[13px] leading-relaxed mb-7" style={{ color: 'var(--text-2)' }}>
                  {analyzing
                    ? 'Scanning your inbox, prioritizing emails, detecting meetings and tasks…'
                    : 'ARIA will scan your inbox and prioritize what needs your attention today.'}
                </p>

                {analyzing && (
                  <div className="mb-6 space-y-3">
                    {/* Progress bar */}
                    <div
                      className="w-full rounded-full overflow-hidden"
                      style={{ height: 4, background: 'var(--bg-hover)' }}
                    >
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: 'linear-gradient(90deg, var(--accent), var(--green))' }}
                        animate={{ width: `${Math.min(analyzeProgress, 100)}%` }}
                        transition={{ duration: 0.4 }}
                      />
                    </div>
                    {/* Step items */}
                    {ANALYZING_STEPS.map((s, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.8 }}
                        className="flex items-center gap-2.5 text-[12px]"
                        style={{ color: 'var(--text-2)' }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0 pulse-violet"
                          style={{ background: 'var(--accent)' }}
                        />
                        {s}
                      </motion.div>
                    ))}
                  </div>
                )}

                {!analyzing && (
                  <button
                    onClick={handleRunAnalysis}
                    className="w-full py-3.5 text-white text-[13px] font-medium rounded-xl flex items-center justify-center gap-2 transition-all"
                    style={{
                      background: 'linear-gradient(135deg, #34D399, #059669)',
                      boxShadow: '0 0 20px rgba(52,211,153,0.25)',
                    }}
                  >
                    <Sparkles size={15} />
                    Analyze my inbox
                  </button>
                )}
              </>
            )}

            {/* Step 3 — Ready */}
            {step === 3 && (
              <>
                <div
                  className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
                  style={{
                    background: 'var(--accent-subtle)',
                    border: '1px solid rgba(124,92,255,0.25)',
                  }}
                >
                  <Check size={24} style={{ color: 'var(--accent-text)' }} />
                </div>
                <h2
                  className="text-[22px] font-bold tracking-tight mb-2"
                  style={{ color: 'var(--text-1)' }}
                >
                  You're all set
                </h2>
                <p className="text-[13px] leading-relaxed mb-8" style={{ color: 'var(--text-2)' }}>
                  ARIA has analyzed your inbox and is ready to help you take control of your day.
                </p>

                <div className="grid grid-cols-3 gap-3 mb-8">
                  {[
                    { label: 'Emails read', color: 'var(--accent-text)', bg: 'var(--accent-subtle)', border: 'rgba(124,92,255,0.2)' },
                    { label: 'Prioritized', color: 'var(--green)', bg: 'var(--green-subtle)', border: 'rgba(52,211,153,0.2)' },
                    { label: 'Briefing ready', color: 'var(--amber)', bg: 'var(--amber-subtle)', border: 'rgba(251,191,36,0.2)' },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="rounded-xl py-3 px-2 text-center check-pop"
                      style={{
                        background: item.bg,
                        border: `1px solid ${item.border}`,
                        animationDelay: `${i * 0.1}s`,
                      }}
                    >
                      <Check size={16} className="mx-auto mb-1.5" style={{ color: item.color }} />
                      <p className="text-[9px] font-medium uppercase tracking-wider" style={{ color: item.color }}>
                        {item.label}
                      </p>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => router.push('/dashboard')}
                  className="w-full py-3.5 text-white text-[13px] font-medium rounded-xl flex items-center justify-center gap-2 transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #7C5CFF, #6D4EF0)',
                    boxShadow: '0 0 20px rgba(124,92,255,0.3)',
                  }}
                >
                  Go to inbox
                  <ArrowRight size={15} />
                </button>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
