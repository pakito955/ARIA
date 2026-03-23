'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Volume2, VolumeX, Square } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VoiceBriefingProps {
  text: string
  className?: string
}

export function VoiceBriefing({ text, className }: VoiceBriefingProps) {
  const [speaking, setSpeaking] = useState(false)
  const [supported] = useState(() => typeof window !== 'undefined' && 'speechSynthesis' in window)

  const speak = useCallback(() => {
    if (!supported || !text) return

    // Cancel any ongoing speech
    window.speechSynthesis.cancel()

    // Clean text (remove HTML tags)
    const cleanText = text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()

    const utterance = new SpeechSynthesisUtterance(cleanText)
    utterance.rate = 0.95
    utterance.pitch = 1.0
    utterance.volume = 1.0

    // Try to use a premium voice
    const voices = window.speechSynthesis.getVoices()
    const preferredVoice = voices.find(
      (v) => v.name.includes('Samantha') || v.name.includes('Google') || v.name.includes('Natural')
    )
    if (preferredVoice) utterance.voice = preferredVoice

    utterance.onstart = () => setSpeaking(true)
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)

    window.speechSynthesis.speak(utterance)
  }, [text, supported])

  const stop = useCallback(() => {
    window.speechSynthesis.cancel()
    setSpeaking(false)
  }, [])

  if (!supported) return null

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={speaking ? stop : speak}
      title={speaking ? 'Stop voice briefing' : 'Listen to briefing'}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10.5px] transition-all border',
        speaking
          ? 'bg-[#7C5CFF]/15 border-[#7C5CFF]/30 text-[#A78BFA]'
          : 'border-white/[0.06] text-[var(--text-3)] hover:text-[var(--text-2)] hover:border-white/[0.1]',
        className
      )}
    >
      {speaking ? (
        <>
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 0.8 }}
          >
            <Volume2 size={12} className="text-[#7C5CFF]" />
          </motion.div>
          <span>Stop</span>
          <div className="flex gap-0.5 ml-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ height: ['4px', '12px', '4px'] }}
                transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.15 }}
                className="w-0.5 bg-[#7C5CFF] rounded-full"
              />
            ))}
          </div>
        </>
      ) : (
        <>
          <Volume2 size={12} />
          <span>Listen</span>
        </>
      )}
    </motion.button>
  )
}
