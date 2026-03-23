'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Check, Zap, Mail, Calendar, ArrowRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const STEPS = [
  {
    id: 1,
    title: 'Connect Gmail',
    subtitle: 'ARIA needs access to your inbox',
    icon: Mail,
    color: '#D97757',
  },
  {
    id: 2,
    title: 'Run first analysis',
    subtitle: 'ARIA scans and prioritizes your emails',
    icon: Zap,
    color: '#10b981',
  },
  {
    id: 3,
    title: 'Your morning briefing',
    subtitle: 'See what matters today',
    icon: Calendar,
    color: '#f59e0b',
  },
]

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [briefingDone, setBriefingDone] = useState(false)
  const router = useRouter()

  const handleConnectGmail = async () => {
    setLoading(true)
    await signIn('google', { callbackUrl: '/onboarding?step=2' })
  }

  const handleRunAnalysis = async () => {
    setAnalyzing(true)
    try {
      // Trigger email sync + analysis
      await fetch('/api/emails')
      await new Promise((r) => setTimeout(r, 2000)) // Show animation
      setStep(3)
      setAnalyzing(false)

      // Generate briefing
      await fetch('/api/ai/briefing', { method: 'POST' })
      setBriefingDone(true)
    } catch {
      setAnalyzing(false)
    }
  }

  // Check URL step param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlStep = params.get('step')
    if (urlStep) setStep(parseInt(urlStep))
  }, [])

  return (
    <div className="min-h-screen bg-[#07070f] flex items-center justify-center relative overflow-hidden">
      {/* Grid bg */}
      <div className="absolute inset-0 grid-bg opacity-40" />

      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(217,119,87,0.08), transparent 60%)' }}
      />

      <div className="relative z-10 w-full max-w-lg mx-4">
        {/* Logo */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D97757] to-[#C4663D] flex items-center justify-center glow-violet">
              <Zap size={18} className="text-white" />
            </div>
            <span className="font-cormorant text-4xl font-light tracking-widest">ARIA</span>
          </div>
          <p className="text-[12px] text-[#5a4a3a]">Let's get you set up in 3 steps</p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-3 mb-10">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-3">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-medium transition-all duration-300',
                step > s.id
                  ? 'bg-[#10b981] text-white'
                  : step === s.id
                  ? 'bg-[#D97757] text-white glow-violet'
                  : 'bg-white/[0.05] text-[#5a4a3a] border border-white/[0.06]'
              )}>
                {step > s.id ? <Check size={14} /> : s.id}
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn(
                  'w-12 h-px transition-all duration-500',
                  step > s.id ? 'bg-[#10b981]' : 'bg-white/[0.06]'
                )} />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl border border-white/[0.06] bg-[#0c0c1a] p-8 text-center"
          >
            {step === 1 && (
              <>
                <div
                  className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
                  style={{ background: 'rgba(217,119,87,0.12)', border: '1px solid rgba(217,119,87,0.2)' }}
                >
                  <Mail size={24} className="text-[#D97757]" />
                </div>
                <h2 className="font-cormorant text-3xl font-light mb-2">Connect your Gmail</h2>
                <p className="text-[12px] text-[#8888aa] mb-6 leading-relaxed">
                  ARIA reads your inbox to understand priorities, detect meetings,
                  and generate intelligent responses. Your data stays private.
                </p>

                <div className="space-y-3 mb-8 text-left">
                  {[
                    'Read and analyze incoming emails',
                    'Send replies on your behalf',
                    'Access Google Calendar for scheduling',
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-[11.5px] text-[#8888aa]">
                      <div className="w-4 h-4 rounded-full bg-[#10b981]/12 border border-[#10b981]/20 flex items-center justify-center shrink-0">
                        <Check size={9} className="text-[#10b981]" />
                      </div>
                      {item}
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleConnectGmail}
                  disabled={loading}
                  className="w-full py-3.5 bg-[#D97757] text-white text-[13px] font-medium rounded-xl hover:bg-[#D97757] transition-colors flex items-center justify-center gap-2 glow-violet disabled:opacity-60"
                >
                  {loading ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}
                  {loading ? 'Connecting…' : 'Connect Gmail'}
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <div
                  className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
                  style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}
                >
                  {analyzing ? (
                    <Loader2 size={24} className="text-[#10b981] animate-spin" />
                  ) : (
                    <Zap size={24} className="text-[#10b981]" />
                  )}
                </div>
                <h2 className="font-cormorant text-3xl font-light mb-2">
                  {analyzing ? 'ARIA is analyzing…' : 'Run first analysis'}
                </h2>
                <p className="text-[12px] text-[#8888aa] mb-6 leading-relaxed">
                  {analyzing
                    ? 'Scanning your inbox, prioritizing emails, detecting meetings and tasks…'
                    : 'ARIA will scan your inbox and prioritize what needs your attention today.'}
                </p>

                {analyzing && (
                  <div className="mb-6 space-y-2">
                    {['Reading inbox…', 'Detecting priorities…', 'Building your command center…'].map((step, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.8 }}
                        className="flex items-center gap-2 text-[11px] text-[#8888aa]"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] pulse-violet" />
                        {step}
                      </motion.div>
                    ))}
                  </div>
                )}

                {!analyzing && (
                  <button
                    onClick={handleRunAnalysis}
                    className="w-full py-3.5 bg-[#10b981] text-white text-[13px] font-medium rounded-xl hover:bg-[#059669] transition-colors flex items-center justify-center gap-2"
                  >
                    <Zap size={15} />
                    Analyze my inbox
                  </button>
                )}
              </>
            )}

            {step === 3 && (
              <>
                <div
                  className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
                  style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}
                >
                  <Check size={24} className="text-[#f59e0b]" />
                </div>
                <h2 className="font-cormorant text-3xl font-light mb-2">You're all set!</h2>
                <p className="text-[12px] text-[#8888aa] mb-8 leading-relaxed">
                  ARIA has analyzed your inbox and is ready to help you take control of your day.
                  Your morning briefing is ready.
                </p>

                <div className="grid grid-cols-3 gap-3 mb-8">
                  {[
                    { label: 'Emails read', value: '✓', color: '#D97757' },
                    { label: 'Prioritized', value: '✓', color: '#10b981' },
                    { label: 'Briefing ready', value: '✓', color: '#f59e0b' },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="rounded-xl p-3 border"
                      style={{ background: `${item.color}0a`, borderColor: `${item.color}20` }}
                    >
                      <p className="text-lg mb-1" style={{ color: item.color }}>{item.value}</p>
                      <p className="text-[9px] text-[#5a4a3a] uppercase tracking-wider">{item.label}</p>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => router.push('/dashboard')}
                  className="w-full py-3.5 bg-[#D97757] text-white text-[13px] font-medium rounded-xl hover:bg-[#D97757] transition-colors flex items-center justify-center gap-2 glow-violet"
                >
                  Enter ARIA
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
