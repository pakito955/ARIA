'use client'

import { motion } from 'framer-motion'
import { Archive, CheckCheck, Trash2, X, Zap } from 'lucide-react'

interface Props {
  count: number
  onAction: (action: 'archive' | 'read' | 'delete' | 'analyze') => void
  onClear: () => void
}

export function BulkActionBar({ count, onAction, onClear }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-2xl"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Count badge */}
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg mr-1"
        style={{ background: 'var(--accent-subtle)' }}
      >
        <span
          className="text-[13px] font-semibold tabular-nums"
          style={{ color: 'var(--accent-text)' }}
        >
          {count}
        </span>
        <span className="text-[11px]" style={{ color: 'var(--accent-text)' }}>
          selected
        </span>
      </div>

      {/* Actions */}
      <button
        onClick={() => onAction('analyze')}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-all"
        style={{ color: 'var(--accent-text)', border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)', background: 'var(--accent-subtle)' }}
        title="AI Analyze selected"
      >
        <Zap size={13} />
        Analyze
      </button>

      <button
        onClick={() => onAction('read')}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-all"
        style={{ color: 'var(--text-2)', border: '1px solid var(--border)' }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLElement
          el.style.color = 'var(--text-1)'
          el.style.borderColor = 'var(--border-medium)'
          el.style.background = 'var(--bg-hover)'
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLElement
          el.style.color = 'var(--text-2)'
          el.style.borderColor = 'var(--border)'
          el.style.background = 'transparent'
        }}
        title="Mark as read"
      >
        <CheckCheck size={13} />
        Read
      </button>

      <button
        onClick={() => onAction('archive')}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-all"
        style={{ color: 'var(--text-2)', border: '1px solid var(--border)' }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLElement
          el.style.color = 'var(--text-1)'
          el.style.borderColor = 'var(--border-medium)'
          el.style.background = 'var(--bg-hover)'
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLElement
          el.style.color = 'var(--text-2)'
          el.style.borderColor = 'var(--border)'
          el.style.background = 'transparent'
        }}
        title="Archive selected"
      >
        <Archive size={13} />
        Archive
      </button>

      <button
        onClick={() => onAction('delete')}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-all"
        style={{ color: 'var(--red)', border: '1px solid color-mix(in srgb, var(--red) 25%, transparent)' }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLElement
          el.style.background = 'color-mix(in srgb, var(--red) 10%, transparent)'
          el.style.borderColor = 'color-mix(in srgb, var(--red) 40%, transparent)'
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLElement
          el.style.background = 'transparent'
          el.style.borderColor = 'color-mix(in srgb, var(--red) 25%, transparent)'
        }}
        title="Delete selected"
      >
        <Trash2 size={13} />
        Delete
      </button>

      {/* Divider */}
      <div className="w-px h-5 mx-1" style={{ background: 'var(--border)' }} />

      {/* Clear */}
      <button
        onClick={onClear}
        className="p-1.5 rounded-lg transition-colors"
        style={{ color: 'var(--text-3)' }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-1)')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-3)')}
        title="Clear selection"
      >
        <X size={14} />
      </button>
    </motion.div>
  )
}
