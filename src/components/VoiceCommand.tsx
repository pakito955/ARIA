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
    <div className="relative flex items-center justify-center z-50">
       {/* Main Button */}
      <button
        onClick={handleListen}
        disabled={isListening || processing}
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300",
          isSpeaking
            ? "bg-red text-white shadow-md border border-red/50"
            : isListening 
            ? "bg-accent text-white shadow-lg border border-accent/50 scale-110" 
            : processing
            ? "bg-surface border border-border text-accent-text shadow-sm"
            : "bg-surface border border-border text-text-3 hover:text-text-1 hover:border-border-medium hover:bg-hover hover:shadow-sm"
        )}
        title={isSpeaking ? "Stop speaking" : "Voice Assistant"}
      >
        {processing ? (
          <Loader2 size={13} strokeWidth={2.5} className="animate-spin" />
        ) : isSpeaking ? (
          <Square size={11} fill="currentColor" />
        ) : isListening ? (
          <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }}>
            <Mic size={13} strokeWidth={2.5} />
          </motion.div>
        ) : (
          <Mic size={14} strokeWidth={2} />
        )}
      </button>

      {/* Expand/Collapse Handle (only if messages exist) */}
      {messages.length > 0 && !isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="absolute -top-1.5 -right-1.5 w-[14px] h-[14px] rounded-full bg-accent text-white flex items-center justify-center text-[8px] font-bold shadow-sm"
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
            className="absolute bottom-[120%] right-0 w-80 md:w-96 max-h-96 flex flex-col rounded-2xl bg-card border border-border shadow-xl overflow-hidden origin-bottom-right"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", isListening || processing ? "bg-accent" : "bg-text-3")}></span>
                  <span className={cn("relative inline-flex rounded-full h-2 w-2", isListening || processing ? "bg-accent" : "bg-text-3")}></span>
                </span>
                <span className="text-[10px] font-bold tracking-widest uppercase text-text-2">
                  ARIA Agent
                </span>
              </div>
              <div className="flex items-center gap-3">
                 <button onClick={handleClear} className="text-[10px] font-medium text-text-3 hover:text-text-1 hover:bg-hover px-2 py-0.5 rounded transition-colors">Clear</button>
                 <button onClick={() => setIsOpen(false)} className="text-text-3 hover:text-text-1 hover:bg-hover p-0.5 rounded transition-colors"><X size={14} strokeWidth={2} /></button>
              </div>
            </div>

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-[150px] bg-base">
              {messages.length === 0 && !isListening && (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-3 py-6">
                  <div className="w-12 h-12 rounded-full bg-surface border border-border flex items-center justify-center text-accent">
                    <Mic size={20} strokeWidth={2} />
                  </div>
                  <p className="text-[12px] text-text-2 font-medium">Click the mic and say:<br/><span className="text-text-3 font-normal">"Schedule a meeting with Dejan"</span></p>
                </div>
              )}
              
              {messages.map((m, i) => (
                <div key={i} className={cn("flex w-full", m.role === 'user' ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[85%] rounded-xl px-3.5 py-2.5 text-[12.5px] leading-relaxed shadow-sm",
                    m.role === 'user' 
                      ? "bg-[#111111] text-white rounded-br-sm border border-[#111111]" 
                      : "bg-surface text-text-1 border border-border rounded-bl-sm"
                  )}>
                    {m.content}
                  </div>
                </div>
              ))}

              {isListening && (
                <div className="flex w-full justify-end">
                  <div className="max-w-[85%] rounded-xl px-3.5 py-2.5 text-[12.5px] shadow-sm bg-accent text-white rounded-br-sm border border-accent">
                    <div className="flex items-center gap-1.5 h-4">
                      <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              {processing && (
                <div className="flex w-full justify-start">
                  <div className="max-w-[85%] rounded-xl px-4 py-2.5 bg-surface border border-border rounded-bl-sm flex items-center justify-center gap-1.5 h-[34px] shadow-sm">
                     <span className="w-1.5 h-1.5 bg-text-3 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                     <span className="w-1.5 h-1.5 bg-text-3 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                     <span className="w-1.5 h-1.5 bg-text-3 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
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
