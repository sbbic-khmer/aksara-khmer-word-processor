"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useAdConfig } from "@/components/ads"

interface UseAdTimerOptions {
  onTypingActivity?: () => void
}

interface UseAdTimerReturn {
  showPopup: boolean
  dismissAd: () => void
  sessionTime: number
  adCount: number
  isPaused: boolean
  reportTypingActivity: () => void
}

const TYPING_PAUSE_THRESHOLD = 3000 // 3 seconds of no typing before timer resumes
const COUNTDOWN_DURATION = 5 // seconds before user can dismiss

export function useAdTimer(options: UseAdTimerOptions = {}): UseAdTimerReturn {
  const { showAds, frequencySchedule, isLoading } = useAdConfig()

  const [sessionTime, setSessionTime] = useState(0) // in milliseconds
  const [adCount, setAdCount] = useState(0)
  const [showPopup, setShowPopup] = useState(false)
  const [isPaused, setIsPaused] = useState(false)

  const lastTypingRef = useRef<number>(0)
  const isTypingRef = useRef(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const nextAdTimeRef = useRef<number>(0)

  // Calculate next ad time based on schedule
  const getNextAdTime = useCallback(
    (currentAdCount: number, currentSessionTime: number): number => {
      if (!frequencySchedule || frequencySchedule.length === 0) {
        return Infinity
      }
      const index = Math.min(currentAdCount, frequencySchedule.length - 1)
      const intervalMinutes = frequencySchedule[index]
      // Next ad time = current session time + interval
      return currentSessionTime + intervalMinutes * 60 * 1000
    },
    [frequencySchedule]
  )

  // Initialize next ad time
  useEffect(() => {
    if (!isLoading && showAds && frequencySchedule.length > 0) {
      nextAdTimeRef.current = getNextAdTime(0, 0)
    }
  }, [isLoading, showAds, frequencySchedule, getNextAdTime])

  // Report typing activity - call this from the editor
  const reportTypingActivity = useCallback(() => {
    lastTypingRef.current = Date.now()
    isTypingRef.current = true
  }, [])

  // Main timer effect
  useEffect(() => {
    if (!showAds || isLoading || showPopup) {
      return
    }

    const tick = () => {
      const now = Date.now()

      // Check if user is actively typing (typed within last 3 seconds)
      if (isTypingRef.current && now - lastTypingRef.current < TYPING_PAUSE_THRESHOLD) {
        setIsPaused(true)
        return
      }

      // User stopped typing, resume timer
      if (isTypingRef.current && now - lastTypingRef.current >= TYPING_PAUSE_THRESHOLD) {
        isTypingRef.current = false
      }

      setIsPaused(false)

      // Increment session time
      setSessionTime((prev) => {
        const newTime = prev + 1000

        // Check if it's time to show an ad
        if (newTime >= nextAdTimeRef.current) {
          setShowPopup(true)
        }

        return newTime
      })
    }

    intervalRef.current = setInterval(tick, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [showAds, isLoading, showPopup])

  // Visibility API - pause when tab is hidden
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        setIsPaused(true)
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }
    }

    document.addEventListener("visibilitychange", handleVisibility)
    return () => document.removeEventListener("visibilitychange", handleVisibility)
  }, [])

  // Dismiss ad and schedule next one
  const dismissAd = useCallback(() => {
    setShowPopup(false)
    setAdCount((prev) => {
      const newCount = prev + 1
      // Schedule next ad
      nextAdTimeRef.current = getNextAdTime(newCount, sessionTime)
      return newCount
    })
  }, [getNextAdTime, sessionTime])

  return {
    showPopup,
    dismissAd,
    sessionTime,
    adCount,
    isPaused,
    reportTypingActivity,
  }
}

export { COUNTDOWN_DURATION }
