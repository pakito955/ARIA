'use client'

import { useState, useCallback, useEffect } from 'react'

export function useVoice() {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [supportedTTS, setSupportedTTS] = useState(false)
  const [supportedSTT, setSupportedSTT] = useState(false)

  useEffect(() => {
    setSupportedTTS(typeof window !== 'undefined' && 'speechSynthesis' in window)
    setSupportedSTT(
      typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
    )
  }, [])

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (!supportedTTS || !text) return

    window.speechSynthesis.cancel()

    const cleanText = text.replace(/<[^>]*>/g, '').replace(/\\s+/g, ' ').trim()
    const utterance = new SpeechSynthesisUtterance(cleanText)
    
    utterance.rate = 1.05
    utterance.pitch = 1.0
    utterance.volume = 1.0

    const voices = window.speechSynthesis.getVoices()
    const preferredVoice = voices.find(
      (v) => v.name.includes('Samantha') || v.name.includes('Google') || v.name.includes('Natural')
    )
    if (preferredVoice) utterance.voice = preferredVoice

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => {
      setIsSpeaking(false)
      onEnd?.()
    }
    utterance.onerror = () => setIsSpeaking(false)

    window.speechSynthesis.speak(utterance)
  }, [supportedTTS])

  const stopSpeaking = useCallback(() => {
    if (supportedTTS) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
    }
  }, [supportedTTS])

  const listen = useCallback((onResult: (text: string) => void, onError?: (err: string) => void) => {
    if (!supportedSTT) {
      onError?.('Speech recognition not supported in this browser.')
      return
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onstart = () => setIsListening(true)
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      onResult(transcript)
    }

    recognition.onerror = (event: any) => {
      setIsListening(false)
      onError?.(event.error)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.start()

    return () => recognition.stop()
  }, [supportedSTT])

  return {
    speak,
    stopSpeaking,
    isSpeaking,
    listen,
    isListening,
    supportedTTS,
    supportedSTT
  }
}
