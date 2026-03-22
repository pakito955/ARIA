'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { useQueryClient } from '@tanstack/react-query'

export function useInboxKeyboard(emails: any[]) {
  const {
    selectedEmailId,
    setSelectedEmail,
    setRightPanel,
    setCommandOpen,
    setFocusMode,
    focusMode,
  } = useAppStore()

  const qc = useQueryClient()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't fire when typing in inputs/textareas
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) return

      const idx = emails.findIndex((em) => em.id === selectedEmailId)

      switch (e.key) {
        case 'j':
        case 'ArrowDown': {
          e.preventDefault()
          const next = emails[idx + 1]
          if (next) setSelectedEmail(next.id)
          break
        }
        case 'k':
        case 'ArrowUp': {
          e.preventDefault()
          const prev = emails[idx - 1]
          if (prev) setSelectedEmail(prev.id)
          break
        }
        case 'r':
          if (selectedEmailId) { e.preventDefault(); setRightPanel('reply') }
          break
        case 'a':
          if (selectedEmailId) { e.preventDefault(); setRightPanel('analysis') }
          break
        case 'm':
          if (selectedEmailId) { e.preventDefault(); setRightPanel('meeting') }
          break
        case 'e':
          if (selectedEmailId) {
            e.preventDefault()
            fetch(`/api/emails/${selectedEmailId}/archive`, { method: 'POST' })
              .then(() => {
                qc.invalidateQueries({ queryKey: ['emails'] })
                // Select next email
                const next = emails[idx + 1] || emails[idx - 1]
                setSelectedEmail(next?.id ?? null)
              })
          }
          break
        case '/':
          e.preventDefault()
          setCommandOpen(true)
          break
        case 'f':
          e.preventDefault()
          setFocusMode(!focusMode)
          break
        case 'Escape':
          if (focusMode) { e.preventDefault(); setFocusMode(false) }
          break
        case '?': {
          // Show shortcuts help toast (simple alert for now)
          e.preventDefault()
          const shortcuts = [
            'J/↓  Next email',
            'K/↑  Previous email',
            'R    Open Reply',
            'A    Open Analysis',
            'M    Open Meeting tab',
            'E    Archive email',
            '/    Open command palette',
            'F    Toggle focus mode',
            'Esc  Exit focus mode',
          ]
          alert('⌨ ARIA Keyboard Shortcuts\n\n' + shortcuts.join('\n'))
          break
        }
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [emails, selectedEmailId, focusMode, setSelectedEmail, setRightPanel, setCommandOpen, setFocusMode, qc])
}
