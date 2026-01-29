"use client"

import useSWR from "swr"
import { useCallback } from "react"

interface DictionaryWord {
  id: string
  word: string
  created_at: string
}

interface UserDictionaryResponse {
  words: DictionaryWord[]
}

const fetcher = async (url: string): Promise<UserDictionaryResponse> => {
  const res = await fetch(url)
  if (!res.ok) {
    // Return empty array if not authenticated or error
    return { words: [] }
  }
  return res.json()
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
    }
  )

  const words = data?.words || []
  
  // Extract just the word strings for the breaker
  const wordStrings = words.map(w => w.word)

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
