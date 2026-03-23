'use client'

import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { Command, Bell, LogOut } from 'lucide-react'
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
    <header className="flex items-center gap-4 px-5 border-b border-[var(--border)] bg-[#09090b]/80 backdrop-blur-xl z-50">
      {/* Logo */}
      <div className="flex items-center gap-2 font-cormorant text-[22px] font-light tracking-tight">
        <div className="w-2 h-2 rounded-full bg-[#e8c97a] shadow-[0_0_8px_#e8c97a] animate-pulse" />
        ARIA
      </div>

      {/* Status */}
      <div className="flex items-center gap-1.5 text-[10px] tracking-[1.5px] uppercase text-[#4fd1c5]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#4fd1c5] shadow-[0_0_6px_#4fd1c5]" />
        Agent Active
      </div>

      {/* Command palette hint */}
      <button
        onClick={() => setCommandOpen(true)}
        className="hidden md:flex items-center gap-2 ml-4 px-3 py-1.5 rounded bg-white/[0.03] border border-white/[0.07] text-[var(--text-3)] hover:text-[var(--text-2)] hover:border-white/[0.11] transition-all text-xs"
      >
        <Command size={11} />
        <span>Quick actions</span>
        <kbd className="ml-1 text-[9px] bg-white/[0.05] px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
      </button>

      <div className="ml-auto flex items-center gap-4">
        <span className="font-mono text-[11px] text-[var(--text-2)]">{time}</span>

        <button className="text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors">
          <Bell size={15} />
        </button>

        {/* User avatar */}
        <div className="flex items-center gap-2 group cursor-pointer">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#e8c97a] to-[#f4a0b5] flex items-center justify-center text-[10px] font-semibold text-[#080810]">
            {initials}
          </div>
          {session?.user?.name && (
            <span className="text-xs text-[var(--text-2)] hidden md:block">
              {session.user.name.split(' ')[0]}
            </span>
          )}
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--text-3)] hover:text-[#f4a0b5]"
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </header>
  )
}
