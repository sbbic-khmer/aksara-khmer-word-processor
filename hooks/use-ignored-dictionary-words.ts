import useSWR from 'swr'

interface IgnoredWord {
  id: string
  word: string
  created_at: string
}

interface IgnoredWordsResponse {
  words: IgnoredWord[]
}

// Stable empty response to avoid creating new arrays on every render
const EMPTY_RESPONSE: IgnoredWordsResponse = { words: [] }

const fetcher = async (url: string): Promise<IgnoredWordsResponse> => {
  try {
    const res = await fetch(url)
    if (!res.ok) {
      // Return stable empty response if not authenticated or error
      return EMPTY_RESPONSE
    }
    const data = await res.json()
    return data
  } catch (error) {
    console.log('[v0] Error fetching ignored dictionary words:', error)
    // Return stable empty response on any error
    return EMPTY_RESPONSE
  }
}

export function useIgnoredDictionaryWords() {
  const { data, error, isLoading, mutate } = useSWR<IgnoredWordsResponse>(
    '/api/dictionary/user/ignored',
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

  return {
    ignoredWords: data?.words ?? EMPTY_RESPONSE.words,
    isLoading,
    isError: error,
    mutate,
  }
}
