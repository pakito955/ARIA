'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Inbox, CheckSquare, Clock, BarChart3, Zap,
  RefreshCw, Settings, Search, ArrowRight,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'

const COMMANDS = [
  {
    group: 'Navigate',
    items: [
      { label: 'Command Center', icon: Zap, href: '/dashboard', hint: 'Dashboard' },
      { label: 'Inbox', icon: Inbox, href: '/dashboard/inbox', hint: 'View emails' },
      { label: 'Tasks', icon: CheckSquare, href: '/dashboard/tasks', hint: 'Manage tasks' },
      { label: 'Waiting for reply', icon: Clock, href: '/dashboard/waiting', hint: 'Pending responses' },
      { label: 'Insights', icon: BarChart3, href: '/dashboard/analytics', hint: 'Analytics' },
    ],
  },
  {
    group: 'AI Actions',
    items: [
      { label: 'Generate morning briefing', icon: Zap, action: 'briefing', hint: 'AI summary of inbox' },
      { label: 'Sync emails', icon: RefreshCw, action: 'sync', hint: 'Fetch latest messages' },
    ],
  },
  {
    group: 'Settings',
    items: [
      { label: 'Settings', icon: Settings, href: '/dashboard/settings', hint: 'Configure ARIA' },
    ],
  },
]

const RECENTS = [
  'Reply to critical email',
  'View today\'s briefing',
  'Check waiting replies',
]

export function CommandPalette() {
  const { commandOpen, setCommandOpen } = useAppStore()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCommandOpen(false)
        setQuery('')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setCommandOpen])

  useEffect(() => {
    if (commandOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setSelected(0)
    }
  }, [commandOpen])

  const allItems = COMMANDS.flatMap((g) => g.items.map((item) => ({ ...item, group: g.group })))

  const filtered = query
    ? allItems.filter((i) => i.label.toLowerCase().includes(query.toLowerCase()))
    : allItems

  const grouped = query
    ? [{ group: 'Results', items: filtered }]
    : COMMANDS

  // Keyboard navigation
  useEffect(() => {
    if (!commandOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelected((s) => Math.min(s + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelected((s) => Math.max(s - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filtered[selected]) handleSelect(filtered[selected])
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [commandOpen, filtered, selected])

  const handleSelect = (item: { href?: string; action?: string }) => {
    setCommandOpen(false)
    setQuery('')
    if (item.href) router.push(item.href)
    if (item.action === 'briefing') fetch('/api/ai/briefing', { method: 'POST' })
    if (item.action === 'sync') fetch('/api/emails')
  }

  let itemIndex = 0

  return (
    <AnimatePresence>
      {commandOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { setCommandOpen(false); setQuery('') }}
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm"
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -16 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="fixed left-1/2 top-[18vh] z-[101] -translate-x-1/2 w-full max-w-[540px] px-4"
          >
            <div className="glass rounded-2xl shadow-[0_32px_64px_rgba(0,0,0,0.5),0_0_0_1px_rgba(217,119,87,0.15)] overflow-hidden">
              {/* Input */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border)]">
                <Search size={15} className="text-[var(--accent-text)] shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setSelected(0) }}
                  placeholder="What do you want to do?"
                  className="flex-1 bg-transparent text-[14px] text-white placeholder:text-[var(--text-3)] outline-none"
                />
                <kbd className="text-[9px] bg-white/[0.05] text-[var(--text-3)] px-2 py-1 rounded-md font-mono">ESC</kbd>
              </div>

              {/* Recent (when no query) */}
              {!query && (
                <div className="px-5 py-3 border-b border-white/[0.03]">
                  <p className="text-[8px] tracking-[2px] uppercase text-[var(--text-3)] mb-2">Recent</p>
                  <div className="flex flex-wrap gap-1.5">
                    {RECENTS.map((r, i) => (
                      <button
                        key={i}
                        className="text-[10px] px-2.5 py-1 rounded-lg bg-white/[0.03] border border-[var(--border)] text-[var(--text-2)] hover:text-white hover:border-[var(--accent)] transition-all"
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Results */}
              <div className="max-h-[340px] overflow-y-auto py-2">
                {filtered.length === 0 ? (
                  <div className="py-10 text-center text-[12px] text-[var(--text-3)]">
                    No results for "{query}"
                  </div>
                ) : (
                  (query ? grouped : COMMANDS).map((group) => {
                    const groupItems = query
                      ? (group as any).items
                      : group.items.filter((item) =>
                          !query || item.label.toLowerCase().includes(query.toLowerCase())
                        )

                    if (groupItems.length === 0) return null

                    return (
                      <div key={group.group} className="mb-1">
                        <p className="text-[8px] tracking-[2px] uppercase text-[var(--text-3)] px-5 py-2">
                          {group.group}
                        </p>
                        {groupItems.map((item: any) => {
                          const isSelected = itemIndex === selected
                          const currentIndex = itemIndex++

                          return (
                            <button
                              key={item.label}
                              onMouseEnter={() => setSelected(currentIndex)}
                              onClick={() => handleSelect(item)}
                              className={cn(
                                'w-full flex items-center gap-3 px-5 py-2.5 text-left transition-all',
                                isSelected
                                  ? 'bg-[var(--accent)]/10 text-white'
                                  : 'text-[var(--text-2)] hover:text-white'
                              )}
                            >
                              <div className={cn(
                                'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                                isSelected ? 'bg-[var(--accent)]/20' : 'bg-white/[0.03]'
                              )}>
                                <item.icon size={13} className={isSelected ? 'text-[var(--accent-text)]' : 'text-[var(--text-3)]'} />
                              </div>
                              <div className="flex-1">
                                <span className="text-[12.5px]">{item.label}</span>
                                {item.hint && (
                                  <span className="text-[10px] text-[var(--text-3)] ml-2">{item.hint}</span>
                                )}
                              </div>
                              {isSelected && (
                                <ArrowRight size={12} className="text-[var(--accent-text)] shrink-0" />
                              )}
                            </button>
                          )
                        })}
                      </div>
                    )
                  })
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-5 py-2.5 border-t border-[var(--border)] text-[9px] text-[var(--text-3)]">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1"><kbd className="bg-white/[0.04] px-1.5 py-0.5 rounded font-mono">↑↓</kbd> navigate</span>
                  <span className="flex items-center gap-1"><kbd className="bg-white/[0.04] px-1.5 py-0.5 rounded font-mono">↵</kbd> select</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--green)' }} />
                  <span>ARIA active</span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
