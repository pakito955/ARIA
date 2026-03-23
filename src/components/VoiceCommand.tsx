'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Loader2, Play, Square, X } from 'lucide-react'
import { useVoice } from '@/hooks/useVoice'
import { toast, useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { useQueryClient } from '@tanstack/react-query'

export function VoiceCommand() {
  const { listen, isListening, supportedSTT, speak, isSpeaking, stopSpeaking } = useVoice()
  const [processing, setProcessing] = useState(false)
  const [messages, setMessages] = useState<{role: 'user'|'assistant', content: string}[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  
  const { selectedEmailId, setSelectedEmail, setComposeOpen } = useAppStore()
  const qc = useQueryClient()

  // Auto-scroll chat
  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isListening, processing])

  const handleListen = () => {
    if (!supportedSTT) {
      toast.error('Tvoj pretrazivač ne podrzava glasovne komande. Molim te koristi Google Chrome ili Edge.', 'Nije podržano')
      return
    }

    if (isSpeaking) {
      stopSpeaking()
      return
    }

    if (isListening) return // Prevent multiple starts
    setIsOpen(true) // Open the chat panel when starting to listen
    
    listen(async (text) => {
      // Optimistic update
      const newMessages: {role: 'user'|'assistant', content: string}[] = [...messages, { role: 'user', content: text }]
      setMessages(newMessages)
      setProcessing(true)
      
      try {
        const res = await fetch('/api/ai/voice-agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            messages: newMessages,
            context: { selectedEmailId }
          })
        })
        
        if (!res.ok) throw new Error('Command failed')
        const data = await res.json()
        
        if (data.messages) {
          // Flatten Anthropic's block format for simple rendering
          const flatMessages = data.messages.map((m: any) => ({
             role: m.role,
             content: typeof m.content === 'string' ? m.content : (m.content.find((c: any) => c.type === 'text')?.text || '{Tool Use}')
          })).filter((m: any) => m.content !== '{Tool Use}')
          setMessages(flatMessages)
        } else {
          setMessages([...newMessages, { role: 'assistant', content: data.content }])
        }
        
        if (data.content) speak(data.content)
      } catch (err) {
        toast.error('Failed to process voice command')
      } finally {
        setProcessing(false)
      }
    }, (err) => {
      if (err !== 'no-speech') {
        toast.error(`Voice error: ${err}`)
      }
      setProcessing(false)
    })
  }

  const handleClear = () => {
    setMessages([])
    setIsOpen(false)
  }

  return (
    <div className="relative flex items-center justify-center">
       {/* Main Button */}
      <button
        onClick={handleListen}
        disabled={isListening || processing}
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300",
          isSpeaking
            ? "bg-[var(--red)] text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]"
            : isListening 
            ? "bg-[var(--accent)] text-white shadow-[0_0_15px_rgba(124,92,255,0.5)] scale-110" 
            : processing
            ? "bg-[var(--bg-hover)] text-[var(--accent-text)]"
            : "bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-2)] hover:text-[var(--text-1)] hover:border-[var(--accent)]"
        )}
        title={isSpeaking ? "Stop speaking" : "Voice Assistant"}
      >
        {processing ? (
          <Loader2 size={14} className="animate-spin" />
        ) : isSpeaking ? (
          <Square size={12} fill="currentColor" />
        ) : isListening ? (
          <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }}>
            <Mic size={14} />
          </motion.div>
        ) : (
          <Mic size={14} />
        )}
      </button>

      {/* Expand/Collapse Handle (only if messages exist) */}
      {messages.length > 0 && !isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-[var(--accent)] text-white flex items-center justify-center text-[8px]"
        >
          {messages.length}
        </button>
      )}

      {/* Conversational Floating Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-12 right-0 w-80 max-h-96 flex flex-col rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-2xl z-50 overflow-hidden"
            style={{ boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[#101014]">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", isListening || processing ? "bg-[var(--accent)]" : "bg-[var(--text-3)]")}></span>
                  <span className={cn("relative inline-flex rounded-full h-2 w-2", isListening || processing ? "bg-[var(--accent)]" : "bg-[var(--text-3)]")}></span>
                </span>
                <span className="text-[11px] font-medium tracking-wider uppercase text-[var(--text-2)]">
                  ARIA Voice Agent
                </span>
              </div>
              <div className="flex items-center gap-2">
                 <button onClick={handleClear} className="text-[10px] text-[var(--text-3)] hover:text-[var(--red)] transition-colors">Clear</button>
                 <button onClick={() => setIsOpen(false)} className="text-[var(--text-3)] hover:text-white transition-colors"><X size={14} /></button>
              </div>
            </div>

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-[150px]">
              {messages.length === 0 && !isListening && (
                <div className="flex flex-col items-center justify-center h-full text-center opacity-50 space-y-2 py-4">
                  <Mic size={24} />
                  <p className="text-[11px]">Click the mic and say:<br/>"Schedule a meeting with Dejan for tomorrow"</p>
                </div>
              )}
              
              {messages.map((m, i) => (
                <div key={i} className={cn("flex w-full", m.role === 'user' ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-[12px] leading-relaxed shadow-sm",
                    m.role === 'user' 
                      ? "bg-[var(--accent)] text-white rounded-br-sm" 
                      : "bg-[#1A1A24] text-[var(--text-1)] border border-[var(--border)] rounded-bl-sm"
                  )}>
                    {m.content}
                  </div>
                </div>
              ))}

              {isListening && (
                <div className="flex w-full justify-end">
                  <div className="max-w-[85%] rounded-2xl px-3 py-2 text-[12px] leading-relaxed shadow-sm bg-[var(--accent)]/50 text-white rounded-br-sm italic animate-pulse">
                    Listening...
                  </div>
                </div>
              )}

              {processing && (
                <div className="flex w-full justify-start">
                  <div className="max-w-[85%] rounded-2xl px-4 py-2 bg-[#1A1A24] border border-[var(--border)] rounded-bl-sm flex items-center justify-center gap-1.5 h-[34px]">
                     <span className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                     <span className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                     <span className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
