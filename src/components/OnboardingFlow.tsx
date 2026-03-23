'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Mail, Star, CheckCircle2, ArrowRight, X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'

const STEPS = [
  {
    id: 'welcome',
    icon: Zap,
    color: '#7C5CFF',
    title: 'Welcome to ARIA',
    subtitle: 'Your AI executive email assistant',
    description: 'ARIA automatically reads, prioritizes, and responds to your emails — saving you hours every week.',
    action: 'Get started',
  },
  {
    id: 'connect',
    icon: Mail,
    color: '#3b82f6',
    title: 'Connect your email',
    subtitle: 'Gmail & Outlook supported',
    description: 'ARIA needs access to your inbox to start working. Your data is encrypted and never shared.',
    action: 'Go to Settings',
    href: '/dashboard/settings',
  },
  {
    id: 'vip',
    icon: Star,
    color: '#f59e0b',
    title: 'Set your VIP contacts',
    subtitle: 'Never miss important people',
    description: 'Mark senders whose emails should always be prioritized as CRITICAL, regardless of content.',
    action: 'Add VIPs',
    href: '/dashboard/settings',
  },
  {
    id: 'done',
    icon: CheckCircle2,
    color: '#22c55e',
    title: "You're all set!",
    subtitle: 'ARIA is now active',
    description: 'Go to your inbox — ARIA has already analyzed your emails and is ready to help.',
    action: 'Open Inbox',
    href: '/dashboard/inbox',
  },
]

export function OnboardingFlow() {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)
  const [dismissed, setDismissed] = useState(false)

  const { data: stats } = useQuery({
    queryKey: ['onboarding-check'],
    queryFn: async () => {
      const res = await fetch('/api/stats')
      if (!res.ok) return null
      return res.json()
    },
  })

  useEffect(() => {
    const done = localStorage.getItem('aria-onboarding-done')
    if (done) return

    // Show onboarding if no emails synced yet
    if (stats !== undefined) {
      if (!stats || stats.totalEmails === 0) {
        const timer = setTimeout(() => setVisible(true), 1200)
        return () => clearTimeout(timer)
      }
    }
  }, [stats])

  const dismiss = () => {
    localStorage.setItem('aria-onboarding-done', '1')
    setDismissed(true)
    setTimeout(() => setVisible(false), 300)
  }

  const current = STEPS[step]
  const Icon = current.icon
  const isLast = step === STEPS.length - 1

  if (!visible) return null

  return (
    <AnimatePresence>
      {!dismissed && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-sm"
            onClick={dismiss}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="fixed left-1/2 top-1/2 z-[301] -translate-x-1/2 -translate-y-1/2 w-full max-w-[420px] px-4"
          >
            <div
              className="rounded-3xl overflow-hidden"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-medium)',
                boxShadow: '0 40px 100px rgba(0,0,0,0.6)',
              }}
            >
              {/* Progress dots */}
              <div className="flex items-center justify-between px-5 pt-5 pb-0">
                <div className="flex gap-1.5">
                  {STEPS.map((_, i) => (
                    <div
                      key={i}
                      className="h-1 rounded-full transition-all duration-300"
                      style={{
                        width: i === step ? '20px' : '6px',
                        background: i <= step ? current.color : 'var(--border)',
                      }}
                    />
                  ))}
                </div>
                <button
                  onClick={dismiss}
                  className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] transition-colors text-[var(--text-3)]"
                >
                  <X size={13} />
                </button>
              </div>

              {/* Content */}
              <div className="px-8 py-8">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.18 }}
                  >
                    {/* Icon */}
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 mx-auto"
                      style={{ background: `${current.color}18`, border: `1px solid ${current.color}30` }}
                    >
                      <Icon size={28} style={{ color: current.color }} />
                    </div>

                    <p className="text-[9px] tracking-[2px] uppercase text-center mb-2" style={{ color: current.color }}>
                      {current.subtitle}
                    </p>
                    <h2 className="font-outfit text-2xl font-light text-white text-center mb-3">
                      {current.title}
                    </h2>
                    <p className="text-[12.5px] text-[var(--text-2)] text-center leading-relaxed">
                      {current.description}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Actions */}
              <div className="px-8 pb-8 flex gap-3">
                {step > 0 && (
                  <button
                    onClick={() => setStep((s) => s - 1)}
                    className="flex-1 py-3 rounded-xl border border-[var(--border)] text-[var(--text-2)] text-[12px] hover:border-[var(--border-medium)] transition-all"
                  >
                    Back
                  </button>
                )}

                {current.href ? (
                  <Link href={current.href} className="flex-1" onClick={isLast ? dismiss : undefined}>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={isLast ? dismiss : () => setStep((s) => s + 1)}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[12px] font-medium text-white transition-all"
                      style={{ background: current.color }}
                    >
                      {current.action}
                      <ArrowRight size={13} />
                    </motion.button>
                  </Link>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setStep((s) => s + 1)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[12px] font-medium text-white transition-all"
                    style={{ background: current.color }}
                  >
                    {current.action}
                    <ArrowRight size={13} />
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
