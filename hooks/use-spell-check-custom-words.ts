"use client"

import useSWR from "swr"
import { useCallback } from "react"

interface CustomWord {
  id: string
  word: string
  created_at: string
}

interface SpellCheckCustomWordsResponse {
  added: CustomWord[]
  ignored: CustomWord[]
}

const fetcher = async (url: string): Promise<SpellCheckCustomWordsResponse> => {
  try {
    const res = await fetch(url)
    if (!res.ok) {
      // Return empty arrays if not authenticated or error
      return { added: [], ignored: [] }
    }
    const data = await res.json()
    return data
  } catch (error) {
    console.log("[v0] Error fetching spell check custom words:", error)
    // Return empty arrays on any error
    return { added: [], ignored: [] }
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
    }
  )

  const addedWords = data?.added || []
  const ignoredWords = data?.ignored || []

  // Extract just the word strings for spell checking
  const addedWordStrings = addedWords.map(w => w.word)
  const ignoredWordStrings = ignoredWords.map(w => w.word)

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
