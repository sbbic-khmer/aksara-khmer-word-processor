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
  console.log("[v0] useReplacements fetcher: Starting fetch...")
  const res = await fetch(url)
  if (!res.ok) {
    console.log("[v0] useReplacements fetcher: Fetch failed with status", res.status)
    throw new Error(`Fetch failed: ${res.status}`)
  }
  const json = await res.json()
  console.log("[v0] useReplacements fetcher: Received response, combined keys:", Object.keys(json?.combined || {}).length)
  
  // Check if ជីវឹត rule exists in fetched data
  const keys = Object.keys(json?.combined || {})
  const jeevitRules = keys.filter((k: string) => k.includes('ជីវ'))
  console.log("[v0] useReplacements fetcher: Rules containing 'ជីវ':", jeevitRules)
  
  return json
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

  // Apply replacements to text - using efficient substring matching
  const applyReplacements = useCallback(
    (text: string): string => {
      if (!data?.combined || Object.keys(data.combined).length === 0) {
        console.log("[v0] applyReplacements: No replacements data available")
        return text
      }

      const rules = data.combined
      const ruleKeys = Object.keys(rules)
      
      console.log("[v0] applyReplacements: Processing text:", JSON.stringify(text))
      console.log("[v0] applyReplacements: Number of rules available:", ruleKeys.length)
      
      // Debug: Check for ជីវឹត rule specifically
      const targetWord = "ជីវឹត"
      const hasTarget = ruleKeys.includes(targetWord)
      console.log("[v0] applyReplacements: Has 'ជីវឹត' rule?", hasTarget)
      if (hasTarget) {
        console.log("[v0] applyReplacements: ជីវឹត rule:", rules[targetWord])
      }
      
      // Check if text contains the target
      if (text.includes(targetWord)) {
        console.log("[v0] applyReplacements: Text CONTAINS 'ជីវឹត'!")
      }

      // Sort keys by length (longest first) to handle overlapping replacements correctly
      // e.g., "ព្រះយេស៊ូវគ្រិស្ត" should be checked before "ព្រះយេស៊ូ"
      const sortedKeys = ruleKeys.sort((a, b) => b.length - a.length)
      
      let result = text
      
      // For each rule, check if it exists in the text and replace
      for (const incorrect of sortedKeys) {
        if (!result.includes(incorrect)) {
          continue // Skip if this pattern isn't in the text - O(n) but fast
        }
        
        const { correct_word } = rules[incorrect]
        
        // Build pattern - handle case where correct extends incorrect
        let pattern = escapeRegex(incorrect)
        if (correct_word.startsWith(incorrect) && correct_word.length > incorrect.length) {
          const suffix = correct_word.slice(incorrect.length)
          pattern = escapeRegex(incorrect) + `(?!${escapeRegex(suffix)})`
        }
        
        const regex = new RegExp(pattern, "g")
        const before = result
        result = result.replace(regex, correct_word)
        
        if (before !== result) {
          console.log("[v0] applyReplacements: Replaced", JSON.stringify(incorrect), "->", JSON.stringify(correct_word))
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
