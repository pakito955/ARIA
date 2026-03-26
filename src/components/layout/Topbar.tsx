'use client'

import { useEffect, useState, useRef } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { Command, LogOut, Zap, Sun, Moon, ChevronDown } from 'lucide-react'
import { VoiceCommand } from '@/components/VoiceCommand'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { useAppStore } from '@/lib/store'
import { useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'

export function Topbar() {
  const { data: session } = useSession()
  const { setCommandOpen } = useAppStore()
  const { theme, toggle: toggleTheme } = useTheme()
  const [time, setTime] = useState('')
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const update = () => {
      setTime(
        new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      )
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])

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

  // Close user dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    if (userMenuOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [userMenuOpen])

  const initials = session?.user?.name
    ? session.user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  return (
    <header className="flex items-center gap-4 px-5 z-50 h-16 shrink-0 topbar-glass">
      {/* Mobile logo */}
      <div className="md:hidden flex items-center gap-2">
        <div
          className="w-8 h-8 rounded shrink-0 flex items-center justify-center"
          style={{ background: 'var(--logo-bg)', color: 'var(--logo-bg-text)' }}
        >
          <Zap size={14} strokeWidth={2.5} />
        </div>
        <span className="font-inter text-lg font-bold tracking-tight" style={{ color: 'var(--text-1)' }}>
          Aria<span style={{ color: 'var(--accent)' }}>.</span>
        </span>
      </div>

      {/* Desktop: Agent status pill */}
      <div className="hidden md:flex items-center gap-2">
        <div
          className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full"
          style={{
            background: 'var(--green-subtle)',
            border: '1px solid rgba(47, 158, 68, 0.2)',
            color: 'var(--green)',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full status-live-green" />
          Agent Active
        </div>
      </div>

      {/* Glassmorphism search bar */}
      <button
        onClick={() => setCommandOpen(true)}
        className="hidden lg:flex items-center gap-2 ml-4 px-3 py-1.5 rounded-xl transition-all duration-150"
        style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid var(--glass-border)',
          color: 'var(--text-3)',
          minWidth: '200px',
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLButtonElement
          el.style.borderColor = 'var(--border-medium)'
          el.style.color = 'var(--text-2)'
          el.style.boxShadow = 'var(--shadow-sm)'
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLButtonElement
          el.style.borderColor = 'var(--glass-border)'
          el.style.color = 'var(--text-3)'
          el.style.boxShadow = 'none'
        }}
      >
        <Command size={13} />
        <span className="text-xs flex-1 text-left">Quick actions…</span>
        <kbd
          className="ml-1 text-[10px] px-1.5 rounded font-mono font-medium"
          style={{ background: 'var(--bg-hover)', border: '1px solid var(--glass-border)', color: 'var(--text-3)' }}
        >
          ⌘K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-3">
        <VoiceCommand />

        <span className="font-mono text-[11px] font-medium hidden sm:block" style={{ color: 'var(--text-3)' }}>
          {time}
        </span>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-lg transition-colors duration-150"
          style={{ color: 'var(--text-3)' }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.background = 'var(--bg-hover)'
            el.style.color = 'var(--text-1)'
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.background = ''
            el.style.color = 'var(--text-3)'
          }}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={16} strokeWidth={2} /> : <Moon size={16} strokeWidth={2} />}
        </button>

        {/* Notification bell */}
        <NotificationBell />

        {/* User avatar + dropdown */}
        <div
          ref={userMenuRef}
          className="relative flex items-center gap-2.5 cursor-pointer pl-3"
          style={{ borderLeft: '1px solid var(--border)' }}
          onClick={() => setUserMenuOpen((v) => !v)}
        >
          {session?.user?.image ? (
            <img
              src={session.user.image}
              alt={session.user.name ?? 'User'}
              className="w-8 h-8 rounded-full object-cover"
              style={{ border: '2px solid var(--border-medium)' }}
            />
          ) : (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
              style={{ background: 'var(--logo-bg)', color: 'var(--logo-bg-text)' }}
            >
              {initials}
            </div>
          )}
          {session?.user?.name && (
            <span className="text-[13px] font-medium hidden md:block" style={{ color: 'var(--text-1)' }}>
              {session.user.name.split(' ')[0]}
            </span>
          )}
          <ChevronDown
            size={13}
            strokeWidth={2}
            style={{
              color: 'var(--text-3)',
              transition: 'transform 150ms ease',
              transform: userMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />

          {userMenuOpen && (
            <div
              className="absolute top-full right-0 mt-2 w-44 rounded-xl overflow-hidden z-50"
              style={{
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid var(--glass-border)',
                boxShadow: 'var(--shadow-lg)',
              }}
            >
              <div
                className="px-3 py-2.5"
                style={{ borderBottom: '1px solid var(--glass-border)' }}
              >
                <p className="text-[12px] font-semibold truncate" style={{ color: 'var(--text-1)' }}>
                  {session?.user?.name || 'User'}
                </p>
                <p className="text-[11px] truncate" style={{ color: 'var(--text-3)' }}>
                  {session?.user?.email || ''}
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); signOut({ callbackUrl: '/login' }) }}
                className="flex items-center gap-2 w-full px-3 py-2.5 text-[13px] transition-colors duration-100"
                style={{ color: 'var(--text-2)' }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLButtonElement
                  el.style.background = 'var(--red-subtle)'
                  el.style.color = 'var(--red)'
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLButtonElement
                  el.style.background = ''
                  el.style.color = 'var(--text-2)'
                }}
              >
                <LogOut size={14} strokeWidth={2} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
