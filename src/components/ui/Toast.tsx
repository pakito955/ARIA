'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react'
import { useAppStore } from '@/lib/store'

const CONFIG = {
  success: {
    icon: CheckCircle2,
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.08)',
    border: 'rgba(34,197,94,0.18)',
  },
  error: {
    icon: XCircle,
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.18)',
  },
  info: {
    icon: Info,
    color: '#A78BFA',
    bg: 'rgba(124,92,255,0.08)',
    border: 'rgba(124,92,255,0.18)',
  },
  warning: {
    icon: AlertTriangle,
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.18)',
  },
}

function ToastItem({ toast }: { toast: { id: string; type: 'success' | 'error' | 'info' | 'warning'; message: string; title?: string } }) {
  const { removeToast } = useAppStore()
  const cfg = CONFIG[toast.type]

  useEffect(() => {
    const timer = setTimeout(() => removeToast(toast.id), 4200)
    return () => clearTimeout(timer)
  }, [toast.id, removeToast])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 48, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 48, scale: 0.9, transition: { duration: 0.16 } }}
      transition={{ type: 'spring', damping: 26, stiffness: 340 }}
      className="relative flex items-start gap-3 pl-4 pr-3 py-3.5 rounded-2xl min-w-[280px] max-w-[360px] overflow-hidden cursor-pointer select-none"
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.3)',
      }}
      onClick={() => removeToast(toast.id)}
    >
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl"
        style={{ background: cfg.color }}
      />

      <cfg.icon size={15} style={{ color: cfg.color, marginTop: 1, flexShrink: 0 }} />

      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className="text-[12px] font-semibold mb-0.5" style={{ color: 'var(--text-1)' }}>{toast.title}</p>
        )}
        <p className="text-[11.5px] leading-relaxed" style={{ color: 'var(--text-2)' }}>
          {toast.message}
        </p>
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); removeToast(toast.id) }}
        className="shrink-0 mt-0.5 opacity-30 hover:opacity-80 transition-opacity"
      >
        <X size={12} style={{ color: 'var(--text-2)' }} />
      </button>

      {/* Progress bar */}
      <motion.div
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: 4.2, ease: 'linear' }}
        className="absolute bottom-0 left-0 right-0 h-[2px] origin-left"
        style={{ background: cfg.color, opacity: 0.5 }}
      />
    </motion.div>
  )
}

export function ToastContainer() {
  const { toasts } = useAppStore()

  return (
    <div className="fixed bottom-6 right-6 z-[600] flex flex-col gap-2.5 items-end pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  )
}
