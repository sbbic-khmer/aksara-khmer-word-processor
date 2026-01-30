"use client"

import useSWR from "swr"
import { useCallback, useMemo } from "react"

interface CustomWord {
  id: string
  word: string
  created_at: string
}

interface SpellCheckCustomWordsResponse {
  added: CustomWord[]
  ignored: CustomWord[]
}

// Stable empty response to avoid creating new arrays on every render
const EMPTY_RESPONSE: SpellCheckCustomWordsResponse = { added: [], ignored: [] }

const fetcher = async (url: string): Promise<SpellCheckCustomWordsResponse> => {
  try {
    const res = await fetch(url)
    if (!res.ok) {
      // Return stable empty response if not authenticated or error
      return EMPTY_RESPONSE
    }
    const data = await res.json()
    return data
  } catch (error) {
    console.log("[v0] Error fetching spell check custom words:", error)
    // Return stable empty response on any error
    return EMPTY_RESPONSE
  }
}

/**
 * Hook to fetch and manage spell check custom words (added and ignored).
 * Returns the word lists and a mutate function to refresh.
 */
export function useSpellCheckCustomWords() {
  const { data, error, isLoading, mutate } = useSWR<SpellCheckCustomWordsResponse>(
    "/api/spell-check/custom-words",
    fetcher,
    {
      // Revalidate on focus to catch changes made in settings or context menu
      revalidateOnFocus: true,
      // Don't retry on error (user might not be logged in)
      shouldRetryOnError: false,
      // Provide stable fallback data
      fallbackData: EMPTY_RESPONSE,
    }
  )

  // Use data if available, otherwise use stable empty response
  const addedWords = data?.added ?? EMPTY_RESPONSE.added
  const ignoredWords = data?.ignored ?? EMPTY_RESPONSE.ignored

  // Extract just the word strings for spell checking
  // Memoize to prevent creating new arrays on every render (would cause infinite loop)
  const addedWordStrings = useMemo(() => addedWords.map(w => w.word), [addedWords])
  const ignoredWordStrings = useMemo(() => ignoredWords.map(w => w.word), [ignoredWords])

  const refresh = useCallback(() => {
    mutate()
  }, [mutate])

  return {
    addedWords,
    ignoredWords,
    addedWordStrings,
    ignoredWordStrings,
    isLoading,
    error,
    refresh,
    mutate,
  }
}
