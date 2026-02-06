"use client"

import useSWR from "swr"
import { useCallback, useRef, useMemo } from "react"
import { useAuth } from "@/components/auth-provider"

export interface UserPreferences {
  vad_silence_threshold: number
  vad_threshold: number
  preferred_mic_device_id: string | null
  show_breaks: boolean
  theme: string
  stt_provider: string | null
  last_opened_document_id: string | null
  zoom_level: number
}

const DEFAULT_PREFERENCES: UserPreferences = {
  vad_silence_threshold: 1.0,
  vad_threshold: 0.4,
  preferred_mic_device_id: null,
  show_breaks: true,
  theme: "light",
  stt_provider: null,
  last_opened_document_id: null,
  zoom_level: 100,
}

const fetcher = async (url: string) => {
  // Use cache: 'no-store' to bypass service worker and browser caching
  const res = await fetch(url, {
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache',
    },
  })
  if (!res.ok) {
    // Return null if not authenticated - this signals we should wait
    if (res.status === 401) {
      return null
    }
    throw new Error("Failed to fetch preferences")
  }
  return await res.json()
}

export function usePreferences() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()

  // Only fetch when authenticated - include auth state in key to refetch when it changes
  // When not authenticated, SWR returns undefined and we use defaults
  const swrKey = isAuthenticated ? "/api/preferences" : null

  const { data, error, isLoading: swrLoading, mutate } = useSWR<UserPreferences | null>(swrKey, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  })

  // Loading if auth is loading OR SWR is loading (but only when we have a key)
  // Also loading if authenticated but no data yet (SWR hasn't started fetching)
  // CRITICAL: Check for data being truthy with actual content, not just defined
  // This prevents race conditions where loading becomes false before real data arrives
  const hasRealData = data !== undefined && data !== null
  const isLoading = authLoading || (isAuthenticated && (swrLoading || !hasRealData))

  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const dataLoadedRef = useRef(false)

  // Track when real server data first arrives
  if (!swrLoading && data !== undefined && data !== null) {
    dataLoadedRef.current = true
  }

  const updatePreference = useCallback(
    async <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
      // Only optimistically update SWR cache if initial data has loaded from server.
      // If the initial fetch is still in-flight, calling mutate() with revalidate:false
      // causes SWR to discard the in-flight result, losing real server values
      // (e.g., stt_provider: "browser" gets overwritten by the default null).
      if (dataLoadedRef.current) {
        mutate((current) => ({ ...DEFAULT_PREFERENCES, ...current, [key]: value }), false)
      }

      // Debounce API calls
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }

      debounceRef.current = setTimeout(async () => {
        try {
          const res = await fetch("/api/preferences", {
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

  const preferences = useMemo(
    () => ({ ...DEFAULT_PREFERENCES, ...data }),
    [data],
  )

  return {
    preferences,
    isLoading,
    error,
    updatePreference,
    refetch: mutate,
  }
}
