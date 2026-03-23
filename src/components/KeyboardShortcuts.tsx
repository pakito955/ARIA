'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Keyboard } from 'lucide-react'
import { useAppStore } from '@/lib/store'

const SHORTCUTS = [
  { key: 'j', description: 'Next email', group: 'Navigation' },
  { key: 'k', description: 'Previous email', group: 'Navigation' },
  { key: 'Enter', description: 'Open selected email', group: 'Navigation' },
  { key: 'Esc', description: 'Close / go back', group: 'Navigation' },
  { key: '/', description: 'Focus search', group: 'Navigation' },
  { key: 'c', description: 'Compose new email', group: 'Actions' },
  { key: 'r', description: 'Reply to email', group: 'Actions' },
  { key: 'a', description: 'Archive email', group: 'Actions' },
  { key: 's', description: 'Snooze email', group: 'Actions' },
  { key: 'u', description: 'Toggle unread', group: 'Actions' },
  { key: '?', description: 'Show keyboard shortcuts', group: 'Help' },
  { key: '⌘K', description: 'Open command palette', group: 'Help' },
]

const GROUPS = ['Navigation', 'Actions', 'Help']

export function KeyboardShortcuts() {
  const [showHelp, setShowHelp] = useState(false)
  const { setComposeOpen, setSelectedEmail, selectedEmailId } = useAppStore()

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't fire when typing in inputs/textareas
      const tag = (e.target as HTMLElement)?.tagName
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable
      if (inInput && e.key !== 'Escape') return

      // Don't fire if modifier key is pressed (except for ?)
      if (e.ctrlKey || e.metaKey || e.altKey) return

      switch (e.key) {
        case '?':
          e.preventDefault()
          setShowHelp((v) => !v)
          break

        case 'Escape':
          if (showHelp) {
            setShowHelp(false)
          } else if (selectedEmailId) {
            setSelectedEmail(null)
          }
          break

        case 'c':
          e.preventDefault()
          setComposeOpen(true)
          break

        case '/': {
          e.preventDefault()
          const searchInput = document.querySelector<HTMLInputElement>('input[placeholder*="Search"]')
          searchInput?.focus()
          break
        }

        // j/k navigation is handled by useInboxKeyboard hook in inbox page
        default:
          break
      }
    },
    [showHelp, selectedEmailId, setComposeOpen, setSelectedEmail]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <AnimatePresence>
      {showHelp && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowHelp(false)}
            className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: -16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -16 }}
            transition={{ type: 'spring', damping: 28, stiffness: 360 }}
            className="fixed left-1/2 top-[15vh] z-[301] -translate-x-1/2 w-full max-w-md px-4"
          >
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-medium)',
                boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: 'var(--accent-subtle)' }}
                  >
                    <Keyboard size={13} style={{ color: 'var(--accent-text)' }} />
                  </div>
                  <span className="text-[13px] font-medium" style={{ color: 'var(--text-1)' }}>
                    Keyboard Shortcuts
                  </span>
                </div>
                <button
                  onClick={() => setShowHelp(false)}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: 'var(--text-3)' }}
                >
                  <X size={14} />
                </button>
              </div>

              {/* Shortcuts grid */}
              <div className="p-5 space-y-5">
                {GROUPS.map((group) => (
                  <div key={group}>
                    <p
                      className="text-[9px] uppercase tracking-[2px] mb-2.5"
                      style={{ color: 'var(--text-3)' }}
                    >
                      {group}
                    </p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                      {SHORTCUTS.filter((s) => s.group === group).map((shortcut) => (
                        <div key={shortcut.key} className="flex items-center justify-between gap-2">
                          <span className="text-[12px]" style={{ color: 'var(--text-2)' }}>
                            {shortcut.description}
                          </span>
                          <kbd
                            className="shrink-0 min-w-[28px] h-6 px-1.5 rounded-lg flex items-center justify-center text-[11px] font-mono font-medium"
                            style={{
                              background: 'var(--bg-surface)',
                              border: '1px solid var(--border-medium)',
                              color: 'var(--accent-text)',
                            }}
                          >
                            {shortcut.key}
                          </kbd>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div
                className="px-5 pb-4 text-center"
              >
                <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>
                  Press <kbd
                    className="px-1 rounded text-[10px] font-mono"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-2)' }}
                  >?</kbd> to toggle this panel
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
