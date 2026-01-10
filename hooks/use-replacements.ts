"use client"

import { useCallback } from "react"
import useSWR from "swr"

interface Replacement {
  incorrect_word: string
  correct_word: string
}

interface ReplacementsData {
  combined: Record<string, { correct_word: string; source: string }>
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function useReplacements() {
  const { data, error, isLoading, mutate } = useSWR<ReplacementsData>("/api/replacements", fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  })

  // Apply replacements to text
  const applyReplacements = useCallback(
    (text: string): string => {
      if (!data?.combined || Object.keys(data.combined).length === 0) {
        return text
      }

      let result = text

      // Sort by length (longest first) to handle overlapping replacements
      const sortedIncorrect = Object.keys(data.combined).sort((a, b) => b.length - a.length)

      for (const incorrect of sortedIncorrect) {
        const { correct_word } = data.combined[incorrect]
        // Use word boundary-aware replacement for Khmer
        // Since Khmer doesn't use spaces between words, we do simple replacement
        const regex = new RegExp(escapeRegex(incorrect), "g")
        result = result.replace(regex, correct_word)
      }

      return result
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
    replacements: data?.combined || {},
    isLoading,
    error,
    applyReplacements,
    addUserReplacement,
    refresh: mutate,
  }
}

// Helper to escape special regex characters
function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
