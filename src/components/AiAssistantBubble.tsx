'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const MAX_MESSAGES = 10

function SparkleIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" />
      <path d="M5 19l1 2 1-2 2-1-2-1-1-2-1 2-2 1z" />
      <path d="M19 3l.75 1.5L21.5 5l-1.75.75L19 7.5l-.75-1.75L16.5 5l1.75-.75z" />
    </svg>
  )
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full"
          style={{
            background: 'var(--text-3)',
            animation: `typing-bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes typing-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
        @keyframes bubble-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(242, 78, 30, 0.35), 0 4px 20px rgba(242, 78, 30, 0.25); }
          50% { box-shadow: 0 0 0 6px rgba(242, 78, 30, 0), 0 4px 20px rgba(242, 78, 30, 0.25); }
        }
      `}</style>
    </div>
  )
}

const QUICK_PROMPTS = [
  'When is my next meeting?',
  'What emails are urgent?',
  'Who needs a reply from me?',
]

export function AiAssistantBubble() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isStreaming])

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isStreaming) return

      setInputValue('')

      const userMsg: Message = {
        id: Math.random().toString(36).slice(2),
        role: 'user',
        content: trimmed,
      }

      const assistantMsg: Message = {
        id: Math.random().toString(36).slice(2),
        role: 'assistant',
        content: '',
      }

      setMessages((prev) => {
        const next = [...prev, userMsg, assistantMsg].slice(-MAX_MESSAGES * 2)
        return next
      })
      setIsStreaming(true)

      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      try {
        const res = await fetch('/api/ai/assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: trimmed }),
          signal: controller.signal,
        })

        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

        const reader = res.body.getReader()
        const decoder = new TextDecoder()

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          setMessages((prev) => {
            const updated = [...prev]
            const last = updated[updated.length - 1]
            if (last?.role === 'assistant') {
              return [...updated.slice(0, -1), { ...last, content: last.content + chunk }]
            }
            return updated
          })
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setMessages((prev) => {
            const updated = [...prev]
            const last = updated[updated.length - 1]
            if (last?.role === 'assistant' && !last.content) {
              return [...updated.slice(0, -1), { ...last, content: 'Sorry, something went wrong. Try again.' }]
            }
            return updated
          })
        }
      } finally {
        setIsStreaming(false)
      }
    },
    [isStreaming]
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(inputValue)
    }
    if (e.key === 'Escape') setIsOpen(false)
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 'var(--z-max)',
      }}
    >
      {/* ── Expanded chat panel ────────────────────────────────────── */}
      {isOpen && (
        <div
          className="flex flex-col mb-4 rounded-2xl overflow-hidden"
          style={{
            width: '380px',
            height: '480px',
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(24px) saturate(1.5)',
            WebkitBackdropFilter: 'blur(24px) saturate(1.5)',
            border: '1px solid var(--glass-border)',
            boxShadow: 'var(--shadow-xl)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 shrink-0"
            style={{ borderBottom: '1px solid var(--glass-border)' }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                <SparkleIcon size={14} />
              </div>
              <div>
                <p className="text-[13px] font-semibold" style={{ color: 'var(--text-1)' }}>
                  ARIA Assistant
                </p>
                <p className="text-[10px]" style={{ color: 'var(--green)' }}>
                  Online
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-6 h-6 rounded-md flex items-center justify-center transition-colors duration-100"
              style={{ color: 'var(--text-3)' }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'
                ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-1)'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background = ''
                ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-3)'
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M1 1l10 10M11 1L1 11" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-[12px] text-center" style={{ color: 'var(--text-3)' }}>
                  Ask me anything about your inbox…
                </p>
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    className="w-full text-left text-[12px] px-3 py-2 rounded-xl transition-colors duration-100"
                    style={{
                      background: 'var(--bg-hover)',
                      border: '1px solid var(--glass-border)',
                      color: 'var(--text-2)',
                    }}
                    onMouseEnter={(e) => {
                      ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-medium)'
                      ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-1)'
                    }}
                    onMouseLeave={(e) => {
                      ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--glass-border)'
                      ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-2)'
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={msg.id}
                className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                <div
                  className="max-w-[85%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed"
                  style={
                    msg.role === 'user'
                      ? {
                          background: 'var(--accent)',
                          color: '#fff',
                          borderBottomRightRadius: '4px',
                        }
                      : {
                          background: 'var(--bg-hover)',
                          border: '1px solid var(--glass-border)',
                          color: 'var(--text-1)',
                          borderBottomLeftRadius: '4px',
                        }
                  }
                >
                  {msg.content || (msg.role === 'assistant' && i === messages.length - 1 && isStreaming
                    ? <TypingDots />
                    : null
                  )}
                </div>
              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            className="px-3 py-3 shrink-0"
            style={{ borderTop: '1px solid var(--glass-border)' }}
          >
            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2"
              style={{
                background: 'var(--bg-hover)',
                border: '1px solid var(--glass-border)',
              }}
            >
              <input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask ARIA…"
                disabled={isStreaming}
                className="flex-1 bg-transparent text-[13px] outline-none"
                style={{ color: 'var(--text-1)' }}
              />
              <button
                onClick={() => sendMessage(inputValue)}
                disabled={!inputValue.trim() || isStreaming}
                className="w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-100 disabled:opacity-30"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 5h8M6 2l3 3-3 3" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Collapsed trigger button ───────────────────────────────── */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="w-14 h-14 rounded-full flex items-center justify-center ml-auto transition-transform duration-150 active:scale-95"
        style={{
          background: isOpen ? 'var(--bg-surface)' : 'var(--accent)',
          color: isOpen ? 'var(--text-1)' : '#fff',
          border: isOpen ? '1px solid var(--border-medium)' : 'none',
          boxShadow: isOpen
            ? 'var(--shadow-md)'
            : '0 4px 20px rgba(242, 78, 30, 0.35)',
          animation: !isOpen ? 'bubble-pulse 2.5s ease-in-out infinite' : 'none',
        }}
        aria-label={isOpen ? 'Close AI assistant' : 'Open AI assistant'}
      >
        {isOpen ? (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M2 2l14 14M16 2L2 16" />
          </svg>
        ) : (
          <SparkleIcon size={22} />
        )}
      </button>
    </div>
  )
}
