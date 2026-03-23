'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Loader2, Play } from 'lucide-react'
import { useVoice } from '@/hooks/useVoice'
import { toast, useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { useQueryClient } from '@tanstack/react-query'

export function VoiceCommand() {
  const { listen, isListening, supportedSTT, speak } = useVoice()
  const [processing, setProcessing] = useState(false)
  const [lastTranscript, setLastTranscript] = useState('')
  
  const { selectedEmailId, setSelectedEmail, setComposeOpen } = useAppStore()
  const qc = useQueryClient()

  if (!supportedSTT) return null

  const handleListen = () => {
    if (isListening) return // Prevent multiple starts
    
    listen(async (text) => {
      setLastTranscript(text)
      setProcessing(true)
      
      try {
        const res = await fetch('/api/ai/voice-command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            command: text,
            context: {
              selectedEmailId
            }
          })
        })
        
        if (!res.ok) throw new Error('Command failed')
        const data = await res.json()
        
        // Execute the parsed action
        if (data.action === 'ARCHIVE_EMAIL' && data.emailId) {
          await fetch(`/api/emails/${data.emailId}/archive`, { method: 'POST' })
          qc.invalidateQueries({ queryKey: ['emails'] })
          setSelectedEmail(null)
          toast.success('Email archived via voice command')
          speak('Archived.')
        } 
        else if (data.action === 'COMPOSE_EMAIL') {
          setComposeOpen(true)
          speak('Opening compose window.')
        }
        else if (data.action === 'READ_BRIEFING') {
          speak(data.response || 'Here is your briefing...')
        }
        else if (data.action === 'UNKNOWN') {
          toast.error("Didn't understand command", "ARIA Voice")
          speak("I didn't quite catch that.")
        }
        else {
          toast.success(data.response || 'Command executed', 'ARIA Voice')
          if (data.response) speak(data.response)
        }
      } catch (err) {
        toast.error('Failed to process voice command')
      } finally {
        setProcessing(false)
        setTimeout(() => setLastTranscript(''), 3000)
      }
    }, (err) => {
      if (err !== 'no-speech') {
        toast.error(`Voice error: ${err}`)
      }
      setProcessing(false)
    })
  }

  return (
    <div className="relative flex items-center justify-center">
      <button
        onClick={handleListen}
        disabled={isListening || processing}
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300",
          isListening 
            ? "bg-[var(--accent)] text-white shadow-[0_0_15px_rgba(124,92,255,0.5)] scale-110" 
            : processing
            ? "bg-[var(--bg-hover)] text-[var(--accent-text)]"
            : "bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-2)] hover:text-[var(--text-1)] hover:border-[var(--accent)]"
        )}
        title="Voice Command (e.g. 'Aria, archive this')"
      >
        {processing ? (
          <Loader2 size={14} className="animate-spin" />
        ) : isListening ? (
          <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }}>
            <Mic size={14} />
          </motion.div>
        ) : (
          <Mic size={14} />
        )}
      </button>

      {/* Transcript tooltip */}
      <AnimatePresence>
        {(isListening || lastTranscript) && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute top-12 right-0 w-48 p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-xl z-50 pointer-events-none"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="relative flex h-2 w-2">
                <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", isListening ? "bg-[var(--accent)]" : "bg-[var(--green)]")}></span>
                <span className={cn("relative inline-flex rounded-full h-2 w-2", isListening ? "bg-[var(--accent)]" : "bg-[var(--green)]")}></span>
              </span>
              <span className="text-[10px] font-medium tracking-wider uppercase text-[var(--text-3)]">
                {isListening ? 'Listening...' : 'Command Received'}
              </span>
            </div>
            <p className="text-[12px] text-[var(--text-1)] leading-snug">
              {isListening ? <span className="text-[var(--text-3)] italic">Speak now...</span> : `"${lastTranscript}"`}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
