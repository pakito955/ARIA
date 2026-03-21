'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Inbox, CheckSquare, Clock, BarChart3, Zap,
  Mail, RefreshCw, Settings, Search,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'

const COMMANDS = [
  {
    group: 'Navigacija',
    items: [
      { label: 'Daily Briefing', icon: Zap, href: '/dashboard' },
      { label: 'Inbox', icon: Inbox, href: '/dashboard/inbox' },
      { label: 'Tasks', icon: CheckSquare, href: '/dashboard/tasks' },
      { label: 'Čekam odgovor', icon: Clock, href: '/dashboard/waiting' },
      { label: 'Analitika', icon: BarChart3, href: '/dashboard/analytics' },
    ],
  },
  {
    group: 'Akcije',
    items: [
      { label: 'Generiši jutarnji briefing', icon: Zap, action: 'briefing' },
      { label: 'Sinkronizuj emailove', icon: RefreshCw, action: 'sync' },
      { label: 'Novi email', icon: Mail, action: 'compose' },
    ],
  },
  {
    group: 'Podešavanja',
    items: [
      { label: 'Podešavanja', icon: Settings, href: '/dashboard/settings' },
    ],
  },
]

export function CommandPalette() {
  const { commandOpen, setCommandOpen } = useAppStore()
  const [query, setQuery] = useState('')
  const router = useRouter()

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

  const allItems = COMMANDS.flatMap((g) =>
    g.items.map((item) => ({ ...item, group: g.group }))
  )

  const filtered = query
    ? allItems.filter((i) => i.label.toLowerCase().includes(query.toLowerCase()))
    : allItems

  const grouped = COMMANDS.map((g) => ({
    ...g,
    items: g.items.filter((item) =>
      !query || item.label.toLowerCase().includes(query.toLowerCase())
    ),
  })).filter((g) => g.items.length > 0)

  const handleSelect = (item: { href?: string; action?: string }) => {
    setCommandOpen(false)
    setQuery('')
    if (item.href) router.push(item.href)
    if (item.action === 'briefing') {
      fetch('/api/ai/briefing', { method: 'POST' })
    }
  }

  return (
    <AnimatePresence>
      {commandOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { setCommandOpen(false); setQuery('') }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.15 }}
            className="fixed left-1/2 top-[20vh] z-[101] -translate-x-1/2 w-full max-w-[520px] px-4"
          >
            <div className="bg-[#121224] border border-white/[0.11] rounded-lg shadow-2xl overflow-hidden">
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.07]">
                <Search size={14} className="text-[#5a5a78] shrink-0" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Pretraži ili unesi komandu…"
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-[#5a5a78] outline-none"
                />
                <kbd className="text-[9px] bg-white/[0.05] text-[#5a5a78] px-1.5 py-0.5 rounded font-mono">ESC</kbd>
              </div>

              {/* Results */}
              <div className="max-h-[360px] overflow-y-auto p-2">
                {grouped.length === 0 ? (
                  <div className="py-8 text-center text-sm text-[#5a5a78]">Nema rezultata.</div>
                ) : (
                  grouped.map((group) => (
                    <div key={group.group} className="mb-2">
                      <p className="text-[8px] tracking-[2px] uppercase text-[#5a5a78] px-2 py-1.5">
                        {group.group}
                      </p>
                      {group.items.map((item) => (
                        <button
                          key={item.label}
                          onClick={() => handleSelect(item)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm text-[#8888aa] cursor-pointer hover:bg-[#e8c97a]/[0.06] hover:text-white transition-colors text-left"
                        >
                          <item.icon size={14} className="shrink-0 text-[#5a5a78]" />
                          {item.label}
                        </button>
                      ))}
                    </div>
                  ))
                )}
              </div>

              <div className="flex items-center justify-between px-4 py-2 border-t border-white/[0.07] text-[9px] text-[#5a5a78]">
                <span>↑↓ kretanje</span>
                <span>↵ odabir</span>
                <span>ESC zatvori</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
