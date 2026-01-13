"use client"

import { useCallback, useEffect, useRef, useState } from "react"

interface UseWebSpeechRecognitionOptions {
  lang?: string
  onPartialTranscript?: (text: string) => void
  onCommittedTranscript?: (text: string) => void
  onError?: (error: string) => void
}

function isChromeBrowser(): boolean {
  if (typeof window === "undefined") return false
  const userAgent = navigator.userAgent

  // - Desktop Chrome: Has "Chrome" but not "Edg" (Edge)
  // - Android Chrome: Has "Chrome" and "Android" but not "Edg"
  // - iOS Chrome (CriOS): Does NOT support Web Speech API - iOS uses WebKit which doesn't expose it
  // - Samsung Internet: Has "SamsungBrowser" and supports Web Speech API on Android

  const isIOS = /iPhone|iPad|iPod/.test(userAgent)

  // iOS browsers (including Chrome/CriOS) don't support Web Speech API - only Safari has partial support
  if (isIOS) {
    return false
  }

  // Desktop Chrome (excludes Edge which also has "Chrome" in UA)
  const isDesktopChrome = /Chrome/.test(userAgent) && !/Edg/.test(userAgent) && !/Android/.test(userAgent)

  // Android Chrome
  const isAndroidChrome = /Android/.test(userAgent) && /Chrome/.test(userAgent) && !/Edg/.test(userAgent)

  // Samsung Internet browser on Android also supports Web Speech API
  const isSamsungBrowser = /SamsungBrowser/.test(userAgent)

  return isDesktopChrome || isAndroidChrome || isSamsungBrowser
}

export function useWebSpeechRecognition(options?: UseWebSpeechRecognitionOptions) {
  const lang = options?.lang ?? "km-KH"
  const onPartialTranscript = options?.onPartialTranscript
  const onCommittedTranscript = options?.onCommittedTranscript
  const onErrorCallback = options?.onError

  const recognitionRef = useRef<any>(null)
  const shouldBeListeningRef = useRef(false)
  const lastFinalTextRef = useRef("")
  const startTimestampRef = useRef(0)

  const [supported, setSupported] = useState<boolean | null>(null)
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    const Ctor = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    // Web Speech API works reliably only in Chrome
    const hasSupport = !!Ctor && isChromeBrowser()
    setSupported(hasSupport)
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
      setError(null)
      setListening(true)
    }

    recognition.onend = () => {
      setListening(false)
      // Chrome frequently ends after pauses; restart if user expects continuous dictation
      if (shouldBeListeningRef.current) {
        setTimeout(() => {
          try {
            if (shouldBeListeningRef.current && recognitionRef.current) {
              recognitionRef.current.start()
            }
          } catch (e) {
            // Restart failed, stop trying
            shouldBeListeningRef.current = false
          }
        }, 100)
      }
    }

    recognition.onerror = (e: any) => {
      const errorCode = e?.error ?? "unknown_error"

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
          friendlyMessage = "Speech service unavailable. Please check your internet connection."
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
        onPartialTranscript?.(interimText.trim())
      }

      // Handle final (committed) transcript
      if (finalText.trim()) {
        onCommittedTranscript?.(finalText.trim())
        lastFinalTextRef.current = finalText.trim()
      }
    }

    return recognition
  }, [lang, onPartialTranscript, onCommittedTranscript, onErrorCallback])

  const start = useCallback(() => {
    if (!supported) {
      const msg = isChromeBrowser()
        ? "Web Speech not supported in this browser"
        : "Browser Speech only works in Chrome. Please use ElevenLabs or switch to Chrome."
      setError(msg)
      onErrorCallback?.(msg)
      return
    }

    shouldBeListeningRef.current = true
    setError(null)
    lastFinalTextRef.current = ""
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
      recognition.start()
    } catch (e) {
      setError("Failed to start voice recognition")
    }
  }, [supported, setupRecognition, onErrorCallback])

  const stop = useCallback(() => {
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
