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

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status}`)
  }
  return res.json()
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
  })

  // Apply replacements to text using greedy longest-match algorithm
  // This is essential for Khmer which has no spaces between words - 
  // we must prevent shorter rules from matching inside longer correct words
  const applyReplacements = useCallback(
    (text: string): string => {
      if (!data?.combined || Object.keys(data.combined).length === 0) {
        return text
      }

      const rules = data.combined
      const ruleKeys = Object.keys(rules)
      
      // Sort keys by length (longest first) for greedy matching
      const sortedKeys = ruleKeys.sort((a, b) => b.length - a.length)
      
      // Build result by processing text position by position
      // At each position, find the longest matching rule and apply it
      // This prevents shorter rules from corrupting parts of correct words
      let result = ""
      let pos = 0
      
      while (pos < text.length) {
        let matched = false
        
        // Try to match the longest rule first at current position
        for (const incorrect of sortedKeys) {
          // Check if text at current position starts with this incorrect pattern
          if (text.substring(pos, pos + incorrect.length) === incorrect) {
            const { correct_word } = rules[incorrect]
            
            // Handle case where correct_word extends incorrect (e.g., ព្រះយេស៊ូ → ព្រះយេស៊ូវ)
            // Don't replace if the suffix is already there
            if (correct_word.startsWith(incorrect) && correct_word.length > incorrect.length) {
              const suffix = correct_word.slice(incorrect.length)
              const textAfterMatch = text.substring(pos + incorrect.length, pos + correct_word.length)
              if (textAfterMatch === suffix) {
                // The correct form is already there, skip this rule
                continue
              }
            }
            
            // Apply the replacement
            result += correct_word
            pos += incorrect.length
            matched = true
            break // Move to next position after replacement
          }
        }
        
        // If no rule matched at this position, copy the character as-is
        if (!matched) {
          result += text[pos]
          pos++
        }
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
