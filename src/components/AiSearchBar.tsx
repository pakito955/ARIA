'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────────────────────

interface SearchSource {
  id: string
  fromName: string | null
  fromEmail: string
  subject: string
  snippet: string
  receivedAt: string
  priority?: string | null
}

interface SearchResult {
  answer: string
  sources: SearchSource[]
  count: number
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: 'var(--red)',
  HIGH:     'var(--amber)',
  MEDIUM:   'var(--blue)',
  LOW:      'var(--text-3)',
}

// ── Loading dots ─────────────────────────────────────────────────────────────

function LoadingDots() {
  return (
    <span className="inline-flex items-center gap-1" aria-label="Loading">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--accent)]"
          style={{
            animation: `aria-pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </span>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function AiSearchBar() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SearchResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Expose open handler so parent can trigger it
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC')
      const modifier = isMac ? e.metaKey : e.ctrlKey

      if (modifier && e.key === 'k') {
        // Only intercept if CommandPalette is NOT open (it also listens to Cmd+K)
        // We use Cmd+Shift+K to avoid colliding
        if (e.shiftKey) {
          e.preventDefault()
          setOpen((prev) => !prev)
        }
      }

      if (e.key === 'Escape' && open) {
        e.preventDefault()
        handleClose()
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open])

  // Expose a global open trigger for layout usage (Cmd+K without shift,
  // separate from CommandPalette which uses its own store flag)
  useEffect(() => {
    const el = document.getElementById('aria-ai-search-trigger')
    if (!el) return
    const handler = () => setOpen(true)
    el.addEventListener('click', handler)
    return () => el.removeEventListener('click', handler)
  }, [])

  // Auto-focus when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 60)
    }
  }, [open])

  function handleClose() {
    setOpen(false)
    setQuery('')
    setResult(null)
    setError(null)
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    if (!query.trim() || loading) return

    setLoading(true)
    setResult(null)
    setError(null)

    try {
      const res = await fetch('/api/ai/smart-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), limit: 15 }),
      })

      if (!res.ok) throw new Error('Search failed')
      const data: SearchResult = await res.json()
      setResult(data)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleSourceClick(emailId: string) {
    router.push(`/dashboard/inbox?emailId=${emailId}`)
    handleClose()
  }

  return (
    <>
      {/* Keyframe style injected inline — only for loading dots */}
      <style>{`
        @keyframes aria-pulse {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="ai-search-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={handleClose}
              className="fixed inset-0 z-[110] bg-black/75 backdrop-blur-sm"
            />

            {/* Modal */}
            <motion.div
              key="ai-search-modal"
              initial={{ opacity: 0, scale: 0.96, y: -12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -12 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="fixed left-1/2 top-[14vh] z-[111] -translate-x-1/2 w-full max-w-[620px] px-4"
            >
              <div
                className="rounded-2xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.6)]"
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid rgba(124,92,255,0.25)',
                }}
              >
                {/* Search input row */}
                <form onSubmit={handleSubmit}>
                  <div
                    className="flex items-center gap-3 px-5 py-4"
                    style={{ borderBottom: '1px solid var(--border)' }}
                  >
                    <Sparkles size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                    <input
                      ref={inputRef}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Ask your emails..."
                      className="flex-1 bg-transparent text-[14px] outline-none"
                      style={{ color: 'var(--text-1)' }}
                      disabled={loading}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); handleSubmit() }
                      }}
                    />
                    {loading ? (
                      <LoadingDots />
                    ) : query ? (
                      <button
                        type="button"
                        onClick={() => { setQuery(''); setResult(null); setError(null) }}
                        className="p-1 rounded-md transition-colors hover:bg-white/5"
                        aria-label="Clear"
                      >
                        <X size={14} style={{ color: 'var(--text-3)' }} />
                      </button>
                    ) : (
                      <kbd
                        className="text-[9px] px-2 py-1 rounded font-mono"
                        style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-3)' }}
                      >
                        ESC
                      </kbd>
                    )}
                  </div>
                </form>

                {/* Results area */}
                <div className="max-h-[460px] overflow-y-auto">
                  {/* Error state */}
                  {error && (
                    <div className="px-5 py-4 text-[13px]" style={{ color: 'var(--red)' }}>
                      {error}
                    </div>
                  )}

                  {/* Loading placeholder */}
                  {loading && (
                    <div className="px-5 py-6 text-center text-[13px]" style={{ color: 'var(--text-3)' }}>
                      Searching your emails…
                    </div>
                  )}

                  {/* AI Answer */}
                  {result && result.answer && (
                    <div
                      className="mx-4 mt-4 mb-2 rounded-xl px-4 py-3 text-[13.5px] leading-relaxed"
                      style={{
                        background: 'rgba(124,92,255,0.08)',
                        border: '1px solid rgba(124,92,255,0.35)',
                        color: 'var(--text-1)',
                      }}
                    >
                      <div
                        className="flex items-center gap-1.5 mb-2 text-[10px] font-medium tracking-wider uppercase"
                        style={{ color: 'var(--accent)' }}
                      >
                        <Sparkles size={10} />
                        AI Answer
                      </div>
                      {result.answer}
                    </div>
                  )}

                  {/* Source emails */}
                  {result && result.sources.length > 0 && (
                    <div className="px-4 pb-4">
                      <p
                        className="text-[9px] tracking-[2px] uppercase px-1 py-3"
                        style={{ color: 'var(--text-3)' }}
                      >
                        {result.count} source{result.count !== 1 ? 's' : ''}
                      </p>
                      <div className="flex flex-col gap-1.5">
                        {result.sources.map((src) => (
                          <button
                            key={src.id}
                            onClick={() => handleSourceClick(src.id)}
                            className={cn(
                              'w-full text-left rounded-xl px-4 py-3 transition-all',
                              'hover:bg-white/[0.05] group'
                            )}
                            style={{
                              background: 'var(--bg-card)',
                              border: '1px solid var(--border)',
                            }}
                          >
                            {/* Header row */}
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <div className="flex items-center gap-2 min-w-0">
                                {/* Sender initial avatar */}
                                <span
                                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0"
                                  style={{ background: 'var(--accent)', color: '#fff' }}
                                >
                                  {(src.fromName ?? src.fromEmail).charAt(0).toUpperCase()}
                                </span>
                                <span
                                  className="text-[12px] font-medium truncate"
                                  style={{ color: 'var(--text-1)' }}
                                >
                                  {src.fromName ?? src.fromEmail}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {src.priority && src.priority !== 'LOW' && (
                                  <span
                                    className="text-[9px] font-medium px-1.5 py-0.5 rounded-full"
                                    style={{
                                      color: PRIORITY_COLORS[src.priority] ?? 'var(--text-3)',
                                      background: `${PRIORITY_COLORS[src.priority] ?? 'transparent'}1a`,
                                    }}
                                  >
                                    {src.priority}
                                  </span>
                                )}
                                <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>
                                  {formatDate(src.receivedAt)}
                                </span>
                              </div>
                            </div>

                            {/* Subject */}
                            <p
                              className="text-[12px] font-medium truncate mb-0.5"
                              style={{ color: 'var(--text-1)' }}
                            >
                              {src.subject}
                            </p>

                            {/* Snippet */}
                            {src.snippet && (
                              <p
                                className="text-[11px] line-clamp-2"
                                style={{ color: 'var(--text-3)' }}
                              >
                                {src.snippet}
                              </p>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty state */}
                  {result && result.sources.length === 0 && !result.answer && (
                    <div
                      className="py-10 text-center text-[13px]"
                      style={{ color: 'var(--text-3)' }}
                    >
                      No emails found for "{query}"
                    </div>
                  )}

                  {/* Idle state hint */}
                  {!loading && !result && !error && (
                    <div className="px-5 py-5 text-center text-[12px]" style={{ color: 'var(--text-3)' }}>
                      Ask anything about your emails — names, topics, amounts, dates…
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div
                  className="flex items-center justify-between px-5 py-2.5 text-[9px]"
                  style={{
                    borderTop: '1px solid var(--border)',
                    color: 'var(--text-3)',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span>
                      <kbd
                        className="px-1.5 py-0.5 rounded font-mono mr-1"
                        style={{ background: 'rgba(255,255,255,0.04)' }}
                      >
                        ↵
                      </kbd>
                      search
                    </span>
                    <span>
                      <kbd
                        className="px-1.5 py-0.5 rounded font-mono mr-1"
                        style={{ background: 'rgba(255,255,255,0.04)' }}
                      >
                        ESC
                      </kbd>
                      close
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: 'var(--green)' }}
                    />
                    <span>AI Search</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

// ── Trigger button (optional, embeddable anywhere) ────────────────────────────

export function AiSearchTrigger({ className }: { className?: string }) {
  return (
    <button
      id="aria-ai-search-trigger"
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] transition-all',
        'hover:bg-white/[0.06] border',
        className
      )}
      style={{
        color: 'var(--text-3)',
        borderColor: 'var(--border)',
        background: 'var(--bg-card)',
      }}
      aria-label="Open AI search"
    >
      <Search size={13} style={{ color: 'var(--accent)' }} />
      <span>Ask your emails…</span>
      <kbd
        className="ml-1 text-[9px] px-1.5 py-0.5 rounded font-mono"
        style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-3)' }}
      >
        ⌘⇧K
      </kbd>
    </button>
  )
}
