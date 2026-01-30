"use client"

import useSWR from "swr"
import { useCallback, useMemo } from "react"

interface DictionaryWord {
  id: string
  word: string
  created_at: string
}

interface UserDictionaryResponse {
  words: DictionaryWord[]
}

// Stable empty response to avoid creating new arrays on every render
const EMPTY_RESPONSE: UserDictionaryResponse = { words: [] }

const fetcher = async (url: string): Promise<UserDictionaryResponse> => {
  try {
    const res = await fetch(url)
    if (!res.ok) {
      // Return stable empty response if not authenticated or error
      return EMPTY_RESPONSE
    }
    const data = await res.json()
    return data
  } catch (error) {
    console.log("[v0] Error fetching user dictionary:", error)
    // Return stable empty response on any error
    return EMPTY_RESPONSE
  }
}

/**
 * Hook to fetch and manage user dictionary words.
 * Returns the word list and a mutate function to refresh.
 */
export function useUserDictionary() {
  const { data, error, isLoading, mutate } = useSWR<UserDictionaryResponse>(
    "/api/dictionary/user",
    fetcher,
    {
      // Revalidate on focus to catch changes made in settings
      revalidateOnFocus: true,
      // Don't retry on error (user might not be logged in)
      shouldRetryOnError: false,
      // Provide stable fallback data
      fallbackData: EMPTY_RESPONSE,
    }
  )

  // Use data if available, otherwise use stable empty response
  const words = data?.words ?? EMPTY_RESPONSE.words

  // Extract just the word strings for the breaker
  // Memoize to prevent creating new arrays on every render (would cause infinite loop)
  const wordStrings = useMemo(() => words.map(w => w.word), [words])

  const refresh = useCallback(() => {
    mutate()
  }, [mutate])

  return {
    words,
    wordStrings,
    isLoading,
    error,
    refresh,
    mutate,
  }
}
