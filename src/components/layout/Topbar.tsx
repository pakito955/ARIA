'use client'

import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { Command, Bell, LogOut, Zap } from 'lucide-react'
import { VoiceCommand } from '@/components/VoiceCommand'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'

export function Topbar() {
  const { data: session } = useSession()
  const { setCommandOpen } = useAppStore()
  const [time, setTime] = useState('')

  useEffect(() => {
    const update = () => {
      setTime(new Date().toLocaleTimeString('bs-BA', {
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      }))
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])

  // Ctrl+K / Cmd+K to open command palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setCommandOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setCommandOpen])

  const initials = session?.user?.name
    ? session.user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  return (
    <header className="flex items-center gap-4 px-5 border-b border-[var(--border)] bg-[var(--bg-base)]/90 backdrop-blur-xl z-50 h-16 shrink-0">
      {/* Mobile Logo Only (Desktop handles logo in sidebar) */}
      <div className="md:hidden flex items-center gap-2">
        <div className="w-8 h-8 rounded shrink-0 flex items-center justify-center bg-[#1A1A1A]">
          <Zap size={14} className="text-white" strokeWidth={2.5} />
        </div>
        <span className="font-inter text-lg font-bold tracking-tight text-[#1A1A1A]">
          Aria<span className="text-accent">.</span>
        </span>
      </div>

      {/* Desktop breadcrumb or status */}
      <div className="hidden md:flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-text-3 px-3 py-1 bg-surface border border-border rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-green" />
          Agent Active
        </div>
      </div>

      {/* Command palette hint */}
      <button
        onClick={() => setCommandOpen(true)}
        className="hidden lg:flex items-center gap-2 ml-4 px-3 py-1.5 rounded-md bg-surface border border-border text-text-3 hover:text-text-1 hover:border-border-medium transition-colors text-xs"
      >
        <Command size={13} />
        <span>Quick actions</span>
        <kbd className="ml-1 text-[10px] bg-hover px-1.5 rounded font-mono font-medium text-text-2">⌘K</kbd>
      </button>

      <div className="ml-auto flex items-center gap-4">
        <VoiceCommand />
        <span className="font-mono text-[11px] font-medium text-text-3">{time}</span>

        <button className="text-text-3 hover:text-text-1 transition-colors relative">
          <Bell size={16} strokeWidth={2} />
        </button>

        {/* User avatar */}
        <div className="flex items-center gap-2.5 group cursor-pointer pl-2 border-l border-border">
          <div className="w-8 h-8 rounded-full bg-[#1A1A1A] flex items-center justify-center text-[10px] font-bold text-white shrink-0">
            {initials}
          </div>
          {session?.user?.name && (
            <span className="text-[13px] font-medium text-text-1 hidden md:block">
              {session.user.name.split(' ')[0]}
            </span>
          )}
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded bg-surface border border-border text-3 hover:text-red hover:border-red/30"
            title="Sign out"
          >
            <LogOut size={13} strokeWidth={2} />
          </button>
        </div>
      </div>
    </header>
  )
}
