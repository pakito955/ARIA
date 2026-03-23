'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Loader2, Square, X, Brain, CheckCircle, ChevronRight } from 'lucide-react'
import { useVoice } from '@/hooks/useVoice'
import { toast, useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { useQueryClient } from '@tanstack/react-query'

type Mode = 'agent' | 'braindump'

export function VoiceCommand() {
  const { listen, isListening, supportedSTT, speak, isSpeaking, stopSpeaking } = useVoice()
  const [processing, setProcessing] = useState(false)
  const [messages, setMessages] = useState<{role: 'user'|'assistant', content: string}[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('agent')
  const [brainDumpTranscript, setBrainDumpTranscript] = useState('')
  const [brainDumpResult, setBrainDumpResultLocal] = useState<any>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const { selectedEmailId, setBrainDumpResult } = useAppStore()
  const qc = useQueryClient()

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isListening, processing])

  const handleListen = () => {
    if (!supportedSTT) {
      toast.error('Your browser does not support voice commands. Please use Chrome or Edge.', 'Not supported')
      return
    }
    if (isSpeaking) { stopSpeaking(); return }
    if (isListening) return
    setIsOpen(true)

    if (mode === 'braindump') {
      // Brain dump mode: accumulate transcript
      listen(async (text) => {
        setBrainDumpTranscript(prev => prev ? `${prev} ${text}` : text)
      }, (err) => {
        if (err !== 'no-speech') toast.error(`Voice error: ${err}`)
      })
    } else {
      // Agent mode: standard command processing
      listen(async (text) => {
        const newMessages: {role: 'user'|'assistant', content: string}[] = [...messages, { role: 'user', content: text }]
        setMessages(newMessages)
        setProcessing(true)
        try {
          const res = await fetch('/api/ai/voice-agent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: newMessages, context: { selectedEmailId } })
          })
          if (!res.ok) throw new Error('Command failed')
          const data = await res.json()
          if (data.messages) {
            const flatMessages = data.messages.map((m: any) => ({
              role: m.role,
              content: typeof m.content === 'string' ? m.content : (m.content.find((c: any) => c.type === 'text')?.text || '{Tool Use}')
            })).filter((m: any) => m.content !== '{Tool Use}')
            setMessages(flatMessages)
          } else {
            setMessages([...newMessages, { role: 'assistant', content: data.content }])
          }
          if (data.content) speak(data.content)
        } catch {
          toast.error('Failed to process voice command')
        } finally {
          setProcessing(false)
        }
      }, (err) => {
        if (err !== 'no-speech') toast.error(`Voice error: ${err}`)
        setProcessing(false)
      })
    }
  }

  const processBrainDump = async () => {
    if (!brainDumpTranscript.trim()) {
      toast.warning('No transcript recorded yet')
      return
    }
    setProcessing(true)
    try {
      const res = await fetch('/api/ai/brain-dump', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: brainDumpTranscript }),
      })
      if (!res.ok) throw new Error('Brain dump failed')
      const data = await res.json()
      setBrainDumpResultLocal(data)
      setBrainDumpResult(data.result)
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['queue'] })
      qc.invalidateQueries({ queryKey: ['sidebar-stats'] })
      toast.success(
        `${data.persisted.tasks} tasks · ${data.persisted.contactNotes} notes · ${data.persisted.drafts} drafts saved`,
        'Brain Dump Processed'
      )
    } catch {
      toast.error('Failed to process brain dump')
    } finally {
      setProcessing(false)
    }
  }

  const handleClear = () => {
    setMessages([])
    setBrainDumpTranscript('')
    setBrainDumpResultLocal(null)
    setBrainDumpResult(null)
    setIsOpen(false)
  }

  return (
    <div className="relative flex items-center justify-center z-50">
      {/* Main Mic Button */}
      <button
        onClick={handleListen}
        disabled={isListening || processing}
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300",
          isSpeaking
            ? "bg-red text-white shadow-md border border-red/50"
            : isListening && mode === 'braindump'
            ? "bg-[var(--amber)] text-white shadow-lg border border-[var(--amber)]/50 scale-110"
            : isListening
            ? "bg-accent text-white shadow-lg border border-accent/50 scale-110"
            : processing
            ? "bg-surface border border-border text-accent-text shadow-sm"
            : "bg-surface border border-border text-text-3 hover:text-text-1 hover:border-border-medium hover:bg-hover hover:shadow-sm"
        )}
        title={mode === 'braindump' ? 'Brain Dump — record your thoughts' : 'Voice Assistant'}
      >
        {processing ? (
          <Loader2 size={13} strokeWidth={2.5} className="animate-spin" />
        ) : isSpeaking ? (
          <Square size={11} fill="currentColor" />
        ) : isListening ? (
          <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }}>
            {mode === 'braindump' ? <Brain size={13} strokeWidth={2.5} /> : <Mic size={13} strokeWidth={2.5} />}
          </motion.div>
        ) : mode === 'braindump' ? (
          <Brain size={13} strokeWidth={2} />
        ) : (
          <Mic size={14} strokeWidth={2} />
        )}
      </button>

      {/* Unread badge */}
      {(messages.length > 0 || brainDumpTranscript) && !isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="absolute -top-1.5 -right-1.5 w-[14px] h-[14px] rounded-full bg-accent text-white flex items-center justify-center text-[8px] font-bold shadow-sm"
        >
          {messages.length || '!'}
        </button>
      )}

      {/* Floating Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-[120%] right-0 w-80 md:w-96 max-h-[500px] flex flex-col rounded-2xl border shadow-xl overflow-hidden origin-bottom-right"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-medium)', boxShadow: '0 16px 48px rgba(0,0,0,0.35)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b shrink-0" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", isListening || processing ? "bg-accent" : "bg-text-3")} />
                  <span className={cn("relative inline-flex rounded-full h-2 w-2", isListening || processing ? "bg-accent" : "bg-text-3")} />
                </span>
                <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: 'var(--text-2)' }}>
                  {mode === 'braindump' ? 'Brain Dump' : 'ARIA Agent'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {/* Mode toggle */}
                <div className="flex items-center rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--bg-hover)' }}>
                  {(['agent', 'braindump'] as Mode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={cn(
                        'px-2 py-1 text-[9px] font-medium uppercase tracking-wide transition-all',
                        mode === m ? 'text-white' : 'text-text-3 hover:text-text-1'
                      )}
                      style={{ background: mode === m ? (m === 'braindump' ? 'var(--amber)' : 'var(--accent)') : 'transparent' }}
                    >
                      {m === 'braindump' ? '🧠' : '🎙️'}
                    </button>
                  ))}
                </div>
                <button onClick={handleClear} className="text-[10px] font-medium px-2 py-0.5 rounded transition-colors" style={{ color: 'var(--text-3)' }}>Clear</button>
                <button onClick={() => setIsOpen(false)} className="p-0.5 rounded transition-colors" style={{ color: 'var(--text-3)' }}><X size={14} strokeWidth={2} /></button>
              </div>
            </div>

            {/* Body */}
            {mode === 'agent' ? (
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-[150px]" style={{ background: 'var(--bg-base)' }}>
                {messages.length === 0 && !isListening && (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-3 py-6">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                      <Mic size={20} strokeWidth={2} style={{ color: 'var(--accent-text)' }} />
                    </div>
                    <p className="text-[12px] font-medium" style={{ color: 'var(--text-2)' }}>
                      Click the mic and say:<br/>
                      <span className="font-normal" style={{ color: 'var(--text-3)' }}>"Schedule a meeting with Ana"</span>
                    </p>
                  </div>
                )}
                {messages.map((m, i) => (
                  <div key={i} className={cn("flex w-full", m.role === 'user' ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[85%] rounded-xl px-3.5 py-2.5 text-[12.5px] leading-relaxed shadow-sm",
                      m.role === 'user'
                        ? "text-white rounded-br-sm"
                        : "rounded-bl-sm"
                    )} style={{
                      background: m.role === 'user' ? 'var(--accent)' : 'var(--bg-surface)',
                      color: m.role === 'user' ? 'white' : 'var(--text-1)',
                      border: m.role === 'user' ? 'none' : '1px solid var(--border)',
                    }}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {isListening && (
                  <div className="flex w-full justify-end">
                    <div className="max-w-[85%] rounded-xl px-3.5 py-2.5 text-[12.5px] shadow-sm rounded-br-sm" style={{ background: 'var(--accent)' }}>
                      <div className="flex items-center gap-1.5 h-4">
                        {[0, 150, 300].map(d => <span key={d} className="w-1.5 h-1.5 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                      </div>
                    </div>
                  </div>
                )}
                {processing && (
                  <div className="flex w-full justify-start">
                    <div className="max-w-[85%] rounded-xl px-4 py-2.5 rounded-bl-sm flex items-center gap-1.5 h-[34px] shadow-sm" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                      {[0, 150, 300].map(d => <span key={d} className="w-1.5 h-1.5 rounded-full bg-text-3 animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            ) : (
              /* Brain Dump Mode */
              <div className="flex-1 overflow-y-auto flex flex-col" style={{ background: 'var(--bg-base)' }}>
                {!brainDumpResult ? (
                  <div className="flex-1 p-4 flex flex-col gap-3">
                    {/* Transcript display */}
                    <div className="flex-1 min-h-[100px] p-3 rounded-xl text-[12px] leading-relaxed" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                      {brainDumpTranscript || (
                        <span style={{ color: 'var(--text-3)' }}>
                          {isListening
                            ? '🎙️ Recording… speak your thoughts freely'
                            : 'Press the mic and dump everything on your mind.\nTasks, contacts, emails — ARIA will sort it out.'}
                        </span>
                      )}
                      {isListening && <span className="animate-pulse ml-1">|</span>}
                    </div>
                    {brainDumpTranscript && (
                      <button
                        onClick={processBrainDump}
                        disabled={processing}
                        className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-medium text-white transition-all disabled:opacity-60"
                        style={{ background: 'var(--amber)', boxShadow: '0 4px 14px rgba(240,140,0,0.25)' }}
                      >
                        {processing ? <Loader2 size={13} className="animate-spin" /> : <Brain size={13} />}
                        Process with ARIA
                      </button>
                    )}
                  </div>
                ) : (
                  /* Results */
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    <p className="text-[10px] uppercase tracking-[1.5px] text-center" style={{ color: 'var(--text-3)' }}>
                      Brain Dump Results
                    </p>
                    {/* Summary */}
                    <div className="p-3 rounded-xl text-[11.5px]" style={{ background: 'var(--accent-subtle)', border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)', color: 'var(--accent-text)' }}>
                      {brainDumpResult.result?.summary}
                    </div>
                    {/* Tasks */}
                    {brainDumpResult.result?.tasks?.length > 0 && (
                      <div>
                        <p className="text-[9px] uppercase tracking-[1.5px] mb-1.5" style={{ color: 'var(--text-3)' }}>
                          {brainDumpResult.result.tasks.length} Tasks Created
                        </p>
                        {brainDumpResult.result.tasks.map((t: any, i: number) => (
                          <div key={i} className="flex items-start gap-2 py-1.5">
                            <CheckCircle size={11} className="mt-0.5 shrink-0" style={{ color: 'var(--green)' }} />
                            <span className="text-[11.5px]" style={{ color: 'var(--text-1)' }}>{t.title}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Drafts */}
                    {brainDumpResult.persisted?.drafts > 0 && (
                      <p className="text-[11px]" style={{ color: 'var(--text-2)' }}>
                        ✉️ {brainDumpResult.persisted.drafts} email draft{brainDumpResult.persisted.drafts !== 1 ? 's' : ''} added to Approval Queue
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
