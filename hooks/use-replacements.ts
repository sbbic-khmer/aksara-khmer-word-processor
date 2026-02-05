"use client"

import { useCallback } from "react"
import useSWR from "swr"
import { KhmerBreaker } from "@/lib/khmer-breaker"
import { KHMER_DICTIONARY } from "@/lib/khmer-dictionary-data"

interface Replacement {
  incorrect_word: string
  correct_word: string
}

interface ReplacementsData {
  combined: Record<string, { correct_word: string; source: string }>
}

// Stable empty response to avoid creating new objects on every render
const EMPTY_RESPONSE: ReplacementsData = { combined: {} }

const fetcher = async (url: string): Promise<ReplacementsData> => {
  try {
    const res = await fetch(url)
    if (!res.ok) {
      // Return stable empty response if not authenticated or error
      return EMPTY_RESPONSE
    }
    return res.json()
  } catch (error) {
    console.log("[v0] Error fetching replacements:", error)
    // Return stable empty response on any error
    return EMPTY_RESPONSE
  }
}

// Create a singleton breaker instance for word segmentation
let breakerInstance: KhmerBreaker | null = null
let fullDictionaryLoadStarted = false

function getBreaker(): KhmerBreaker {
  if (!breakerInstance) {
    breakerInstance = new KhmerBreaker(KHMER_DICTIONARY)
    // Trigger async load of full dictionary (non-blocking)
    if (!fullDictionaryLoadStarted) {
      fullDictionaryLoadStarted = true
      breakerInstance.loadFullDictionaryAsync().catch((err) => {
        console.error("Failed to load full dictionary:", err)
      })
    }
  }
  return breakerInstance
}

export function useReplacements() {
  const { data, error, isLoading, mutate } = useSWR<ReplacementsData>("/api/replacements", fetcher, {
    // Revalidate on focus so that when user adds replacements in settings and comes back,
    // the editor will pick up the new replacements
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    revalidateOnMount: true, // Always fetch fresh data on mount
    // Keep the data fresh but don't refetch too often
    dedupingInterval: 5000,
    // Don't retry on error (user might not be logged in)
    shouldRetryOnError: false,
    // Provide stable fallback data
    fallbackData: EMPTY_RESPONSE,
  })

  // Apply replacements to text using word-based matching
  // This segments the text into words first, then applies replacements to WHOLE words only
  // This prevents shorter rules from matching inside longer correct words
  // (e.g., prevents "វិត" -> "វឹត" from corrupting "ជីវិត")
  const applyReplacements = useCallback(
    (text: string): string => {
      if (!data?.combined || Object.keys(data.combined).length === 0) {
        return text
      }

      const rules = data.combined
      const breaker = getBreaker()
      
      // Segment the text into words
      const segments = breaker.getSegments(text)
      
      // Apply replacements to each segment (whole word matching)
      const replacedSegments = segments.map(segment => {
        // Check if this exact segment has a replacement rule
        if (rules[segment]) {
          const { correct_word } = rules[segment]
          return correct_word
        }
        return segment
      })
      
      // Join segments back together (no spaces - Khmer doesn't use spaces between words)
      return replacedSegments.join("")
    },
    [data?.combined],
  )

  // Add a new user replacement
  const addUserReplacement = useCallback(
    async (incorrect: string, correct: string, notes?: string) => {
      try {
        const response = await fetch("/api/replacements/user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            incorrect_word: incorrect,
            correct_word: correct,
            notes,
          }),
        })

        if (!response.ok) {
          throw new Error("Failed to add replacement")
        }

        // Revalidate the replacements data
        mutate()
        return true
      } catch (error) {
        console.error("Error adding replacement:", error)
        return false
      }
    },
    [mutate],
  )

  return {
    replacements: data?.combined ?? EMPTY_RESPONSE.combined,
    isLoading,
    error,
    applyReplacements,
    addUserReplacement,
    refresh: mutate,
  }
}
