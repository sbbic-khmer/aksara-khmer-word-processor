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
    // Revalidate on focus so that when user adds replacements in settings and comes back,
    // the editor will pick up the new replacements
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    // Keep the data fresh but don't refetch too often
    dedupingInterval: 5000,
    onSuccess: (data) => {
      // Debug: Check what data we received
      const keys = Object.keys(data?.combined || {})
      console.log("[v0] useReplacements: Received", keys.length, "replacement rules from API")
      
      // Check if ជីវឹត rule exists in received data
      const targetWord = "ជីវឹត"
      const hasTarget = keys.includes(targetWord)
      console.log("[v0] useReplacements: Has 'ជីវឹត' rule in received data?", hasTarget)
      
      // Check for any ជីវ rules
      const jeevitRules = keys.filter(k => k.includes('ជីវ'))
      console.log("[v0] useReplacements: Rules containing 'ជីវ':", jeevitRules)
    }
  })

  // Apply replacements to text
  const applyReplacements = useCallback(
    (text: string): string => {
      if (!data?.combined || Object.keys(data.combined).length === 0) {
        console.log("[v0] applyReplacements: No replacements data available")
        return text
      }

      let result = text

      // Sort by length (longest first) to handle overlapping replacements
      const sortedIncorrect = Object.keys(data.combined).sort((a, b) => b.length - a.length)

      console.log("[v0] applyReplacements: Processing text:", JSON.stringify(text))
      console.log("[v0] applyReplacements: Text codepoints:", [...text].map(c => c.codePointAt(0)?.toString(16)).join(' '))
      console.log("[v0] applyReplacements: Number of replacement rules:", sortedIncorrect.length)
      
      // Check if ជីវឹត rule exists - target codepoints: 1787 17b8 179c 17b9 178f
      const targetWord = "ជីវឹត"
      const targetCodepoints = [...targetWord].map(c => c.codePointAt(0)?.toString(16)).join(' ')
      console.log("[v0] applyReplacements: Looking for target word codepoints:", targetCodepoints)
      
      // Check if exact match exists
      const hasExactRule = sortedIncorrect.includes(targetWord)
      console.log("[v0] applyReplacements: Has exact 'ជីវឹត' rule?", hasExactRule)
      
      // Check for any rules containing ជីវ
      const hasJeevitRule = sortedIncorrect.some(r => r.includes('ជីវ'))
      console.log("[v0] applyReplacements: Has any ជីវ rule?", hasJeevitRule)
      if (hasJeevitRule) {
        const jeevitRules = sortedIncorrect.filter(r => r.includes('ជីវ'))
        console.log("[v0] applyReplacements: ជីវ rules found:", jeevitRules.map(r => {
          const codepoints = [...r].map(c => c.codePointAt(0)?.toString(16)).join(' ')
          return `${r} (${codepoints}) -> ${data.combined[r].correct_word}`
        }))
      }
      
      // Check if text contains the target word
      if (text.includes('ជីវ')) {
        console.log("[v0] applyReplacements: Text contains ជីវ, checking for exact match...")
        console.log("[v0] applyReplacements: Text includes targetWord?", text.includes(targetWord))
      }

      for (const incorrect of sortedIncorrect) {
        const { correct_word } = data.combined[incorrect]
        
        // Debug: Check if this is our target word
        if (incorrect.includes('ជីវ') || text.includes('ជីវ')) {
          console.log("[v0] applyReplacements: Checking rule:", JSON.stringify(incorrect), "->", JSON.stringify(correct_word))
          console.log("[v0] applyReplacements: Incorrect codepoints:", [...incorrect].map(c => c.codePointAt(0)?.toString(16)).join(' '))
          console.log("[v0] applyReplacements: Text includes incorrect?", text.includes(incorrect))
        }
        
        // Build a smart regex that avoids double-replacement
        // If correct_word extends incorrect (e.g., ព្រះយេស៊ូ → ព្រះយេស៊ូវ),
        // use negative lookahead to skip if the suffix is already there
        let pattern = escapeRegex(incorrect)
        
        if (correct_word.startsWith(incorrect) && correct_word.length > incorrect.length) {
          // The correct word is the incorrect word + a suffix
          // Use negative lookahead to not match if suffix already present
          const suffix = correct_word.slice(incorrect.length)
          pattern = escapeRegex(incorrect) + `(?!${escapeRegex(suffix)})`
        }
        
        const regex = new RegExp(pattern, "g")
        const beforeReplace = result
        result = result.replace(regex, correct_word)
        
        if (beforeReplace !== result) {
          console.log("[v0] applyReplacements: Made replacement!", incorrect, "->", correct_word)
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
