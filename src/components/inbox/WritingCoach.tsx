'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, X, Wand2, ChevronDown } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import { cn } from '@/lib/utils'

interface WritingCoachResult {
  tone: string
  clarityScore: number
  suggestions: string[]
  improvedVersion: string
}

interface Props {
  draft: string
  onApplyImproved: (text: string) => void
}

const TONE_COLORS: Record<string, string> = {
  Professional: 'var(--accent-text)',
  Formal:       '#0ea5e9',
  Friendly:     '#10b981',
  Casual:       'var(--amber)',
  Aggressive:   'var(--red)',
  Urgent:       'var(--red)',
  Passive:      'var(--text-3)',
}

export function WritingCoach({ draft, onApplyImproved }: Props) {
  const [result, setResult] = useState<WritingCoachResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const debouncedDraft = useDebounce(draft, 1500)

  useEffect(() => {
    // Only analyze after 20 words
    const wordCount = debouncedDraft.trim().split(/\s+/).filter(Boolean).length
    if (wordCount < 20) {
      setResult(null)
      return
    }

    setLoading(true)
    fetch('/api/ai/writing-coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draft: debouncedDraft }),
    })
      .then((r) => r.json())
      .then((data) => {
        setResult(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [debouncedDraft])

  if (!result && !loading) return null

  const toneColor = result ? (TONE_COLORS[result.tone] || 'var(--text-2)') : 'var(--text-2)'

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="rounded-xl overflow-hidden mt-2"
      style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[var(--bg-hover)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Wand2 size={11} style={{ color: 'var(--accent-text)' }} />
          <span className="text-[10px] uppercase tracking-[1.5px] font-medium" style={{ color: 'var(--accent-text)' }}>
            Writing Coach
          </span>

          {loading ? (
            <Loader2 size={10} className="animate-spin" style={{ color: 'var(--text-3)' }} />
          ) : result ? (
            <div className="flex items-center gap-2">
              {/* Tone badge */}
              <span
                className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                style={{
                  background: `color-mix(in srgb, ${toneColor} 12%, transparent)`,
                  color: toneColor,
                }}
              >
                {result.tone}
              </span>
              {/* Clarity score */}
              <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>
                Clarity {result.clarityScore}/10
              </span>
            </div>
          ) : null}
        </div>
        <ChevronDown
          size={12}
          className="transition-transform"
          style={{
            color: 'var(--text-3)',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {/* Expanded content */}
      <AnimatePresence initial={false}>
        {expanded && result && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-3" style={{ borderTop: '1px solid var(--border)' }}>
              {/* Clarity bar */}
              <div className="pt-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>Clarity</span>
                  <span className="text-[10px] font-medium" style={{ color: 'var(--accent-text)' }}>
                    {result.clarityScore}/10
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-hover)' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${result.clarityScore * 10}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ background: result.clarityScore >= 7 ? 'var(--green)' : result.clarityScore >= 4 ? 'var(--amber)' : 'var(--red)' }}
                  />
                </div>
              </div>

              {/* Suggestions */}
              {result.suggestions.length > 0 && (
                <div>
                  <p className="text-[9px] uppercase tracking-[1.5px] mb-1.5" style={{ color: 'var(--text-3)' }}>
                    Suggestions
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.suggestions.map((suggestion, i) => (
                      <span
                        key={i}
                        className="text-[10.5px] px-2 py-1 rounded-lg"
                        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-2)' }}
                      >
                        {suggestion}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Apply improved button */}
              {result.improvedVersion && result.improvedVersion !== draft && (
                <button
                  onClick={() => onApplyImproved(result.improvedVersion)}
                  className="flex items-center gap-1.5 w-full px-3 py-2 rounded-xl text-[11px] font-medium transition-all justify-center"
                  style={{
                    background: 'var(--accent-subtle)',
                    border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
                    color: 'var(--accent-text)',
                  }}
                >
                  <Wand2 size={11} />
                  Apply improved version
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
