"use client"

import useSWR from "swr"
import { useCallback, useRef } from "react"

export interface UserPreferences {
  vad_silence_threshold: number
  vad_threshold: number
  preferred_mic_device_id: string | null
  show_breaks: boolean
  theme: string
}

const DEFAULT_PREFERENCES: UserPreferences = {
  vad_silence_threshold: 1.0,
  vad_threshold: 0.4,
  preferred_mic_device_id: null,
  show_breaks: true,
  theme: "light",
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    // Return defaults if not authenticated or error
    if (res.status === 401) {
      return DEFAULT_PREFERENCES
    }
    throw new Error("Failed to fetch preferences")
  }
  return res.json()
}

export function usePreferences() {
  const { data, error, isLoading, mutate } = useSWR<UserPreferences>("/api/preferences", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  })

  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const updatePreference = useCallback(
    async <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
      // Optimistically update local state
      mutate((current) => ({ ...DEFAULT_PREFERENCES, ...current, [key]: value }), false)

      // Debounce API calls
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }

      debounceRef.current = setTimeout(async () => {
        try {
          await fetch("/api/preferences", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ [key]: value }),
          })
        } catch (err) {
          console.error("Failed to save preference:", err)
          // Revalidate to get server state on error
          mutate()
        }
      }, 500)
    },
    [mutate],
  )

  return {
    preferences: { ...DEFAULT_PREFERENCES, ...data },
    isLoading,
    error,
    updatePreference,
    refetch: mutate,
  }
}
