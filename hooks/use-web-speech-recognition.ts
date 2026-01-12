"use client"

import { useCallback, useEffect, useRef, useState } from "react"

interface UseWebSpeechRecognitionOptions {
  lang?: string
  onPartialTranscript?: (text: string) => void
  onCommittedTranscript?: (text: string) => void
  onError?: (error: string) => void
}

export function useWebSpeechRecognition(options?: UseWebSpeechRecognitionOptions) {
  const lang = options?.lang ?? "km-KH"
  const onPartialTranscript = options?.onPartialTranscript
  const onCommittedTranscript = options?.onCommittedTranscript
  const onErrorCallback = options?.onError

  const recognitionRef = useRef<any>(null)
  const shouldBeListeningRef = useRef(false)
  const lastFinalTextRef = useRef("")
  const consecutiveErrorsRef = useRef(0)
  const startTimestampRef = useRef(0)
  const maxConsecutiveErrors = 3

  const [supported, setSupported] = useState<boolean | null>(null)
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check support on mount (client-side only)
  useEffect(() => {
    if (typeof window === "undefined") return
    const Ctor = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    setSupported(!!Ctor)
  }, [])

  const setupRecognition = useCallback(() => {
    if (typeof window === "undefined") return null

    const Ctor = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition

    if (!Ctor) return null

    const recognition = new Ctor()
    recognition.lang = lang
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onstart = () => {
      console.log("[v0] WebSpeech: started")
      setError(null)
      setListening(true)
      consecutiveErrorsRef.current = 0
    }

    recognition.onend = () => {
      console.log("[v0] WebSpeech: ended, shouldBe:", shouldBeListeningRef.current)
      setListening(false)
      // Chrome frequently ends after pauses; restart if user expects continuous dictation
      if (shouldBeListeningRef.current && consecutiveErrorsRef.current < maxConsecutiveErrors) {
        setTimeout(() => {
          try {
            if (shouldBeListeningRef.current && recognitionRef.current) {
              console.log("[v0] WebSpeech: auto-restarting")
              recognitionRef.current.start()
            }
          } catch (e) {
            console.warn("[v0] WebSpeech: restart failed:", e)
          }
        }, 100)
      }
    }

    recognition.onerror = (e: any) => {
      const errorCode = e?.error ?? "unknown_error"
      console.error("[v0] WebSpeech error:", errorCode)

      let friendlyMessage = "Voice recognition error"

      switch (errorCode) {
        case "not-allowed":
          if (e.timeStamp - startTimestampRef.current < 100) {
            friendlyMessage = "Microphone permission is blocked. Check browser settings."
          } else {
            friendlyMessage = "Microphone access denied. Please allow microphone access."
          }
          shouldBeListeningRef.current = false
          break
        case "audio-capture":
          friendlyMessage = "No microphone detected. Please check your microphone settings."
          shouldBeListeningRef.current = false
          break
        case "network":
          friendlyMessage = "Network error. Please check your internet connection and try again."
          shouldBeListeningRef.current = false
          break
        case "no-speech":
          // This is not really an error, just no speech detected
          return
        case "aborted":
          // User or system aborted, not an error to display
          return
        case "service-not-allowed":
          friendlyMessage = "Speech recognition service not allowed"
          shouldBeListeningRef.current = false
          break
        case "language-not-supported":
          friendlyMessage = "This language is not supported by browser speech recognition."
          shouldBeListeningRef.current = false
          break
      }

      setError(friendlyMessage)
      onErrorCallback?.(friendlyMessage)
    }

    recognition.onresult = (event: any) => {
      consecutiveErrorsRef.current = 0

      let interimText = ""
      let finalText = ""

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const transcript = result[0]?.transcript ?? ""

        if (result.isFinal) {
          finalText += transcript
        } else {
          interimText += transcript
        }
      }

      // Handle interim (partial) transcript
      if (interimText.trim()) {
        console.log("[v0] WebSpeech partial:", interimText)
        onPartialTranscript?.(interimText.trim())
      }

      // Handle final (committed) transcript
      if (finalText.trim()) {
        console.log("[v0] WebSpeech FINAL:", finalText)
        onCommittedTranscript?.(finalText.trim())
        lastFinalTextRef.current = finalText.trim()
      }
    }

    return recognition
  }, [lang, onPartialTranscript, onCommittedTranscript, onErrorCallback])

  const start = useCallback(() => {
    if (!supported) {
      setError("Web Speech not supported in this browser")
      return
    }

    shouldBeListeningRef.current = true
    setError(null)
    lastFinalTextRef.current = ""
    consecutiveErrorsRef.current = 0
    startTimestampRef.current = Date.now()

    // Create fresh recognition instance each time
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {}
    }

    const recognition = setupRecognition()
    if (!recognition) {
      setError("Failed to initialize speech recognition")
      return
    }

    recognitionRef.current = recognition

    try {
      console.log("[v0] WebSpeech: starting with lang:", lang)
      recognition.start()
    } catch (e) {
      console.error("[v0] WebSpeech start failed:", e)
      setError("Failed to start voice recognition")
    }
  }, [supported, setupRecognition, lang])

  const stop = useCallback(() => {
    console.log("[v0] WebSpeech: stop called")
    shouldBeListeningRef.current = false
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {}
      recognitionRef.current = null
    }
    setListening(false)
  }, [])

  const reset = useCallback(() => {
    setError(null)
    lastFinalTextRef.current = ""
    consecutiveErrorsRef.current = 0
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shouldBeListeningRef.current = false
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch {}
      }
    }
  }, [])

  return { supported, listening, error, start, stop, reset }
}
