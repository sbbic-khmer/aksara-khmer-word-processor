"use client"

import { useState, useMemo } from "react"
import useSWR from "swr"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Loader2, Search, Users, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface AggregatedWord {
  word: string
  user_count: number
  first_added: string
  last_added: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function UserDictionaryWordsTab() {
  const { data, error, isLoading } = useSWR<{ words: AggregatedWord[] }>("/api/dictionary/admin", fetcher)
  const [searchQuery, setSearchQuery] = useState("")
  const [copiedWord, setCopiedWord] = useState<string | null>(null)

  const words = data?.words || []

  const filteredWords = useMemo(() => {
    if (!words || !searchQuery.trim()) return words
    const query = searchQuery.toLowerCase().trim()
    return words.filter((item) => 
      item.word.toLowerCase().includes(query)
    )
  }, [words, searchQuery])

  const handleCopyWord = async (word: string) => {
    try {
      await navigator.clipboard.writeText(word)
      setCopiedWord(word)
      setTimeout(() => setCopiedWord(null), 2000)
    } catch {
      // Clipboard API not available
    }
  }

  // Sort by user_count (popularity) descending
  const sortedWords = useMemo(() => {
    return [...filteredWords].sort((a, b) => b.user_count - a.user_count)
  }, [filteredWords])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-red-500">Failed to load dictionary words</CardContent>
      </Card>
    )
  }

  // Calculate statistics
  const totalWords = words.length
  const multiUserWords = words.filter(w => w.user_count > 1).length

  return (
    <div className="space-y-4">
      <Alert>
        <AlertDescription>
          This view shows all words that users have added to their personal dictionaries by using "Join selected words" 
          in the editor. Words with multiple users indicate popular additions that may be worth incorporating into the 
          main frequency dictionary. Copy words to add them to the dictionary file manually.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total User Words</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalWords}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Multi-User Words</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{multiUserWords}</p>
            <p className="text-xs text-gray-500">Added by 2+ users</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>User Dictionary Words</CardTitle>
            <CardDescription>
              Words added by users, sorted by popularity. Higher user count suggests stronger candidates for the main dictionary.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {words.length > 0 && (
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search words or users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              {searchQuery && (
                <p className="text-sm text-gray-500 mt-2">
                  Showing {filteredWords.length} of {words.length} words
                </p>
              )}
            </div>
          )}
          {sortedWords.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Word</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>First Added</TableHead>
                  <TableHead className="w-[80px]">Copy</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedWords.map((item) => (
                  <TableRow key={item.word}>
                    <TableCell
                      className="font-medium text-lg"
                      dir="auto"
                      style={{ fontFamily: '"Noto Sans Khmer", sans-serif' }}
                    >
                      {item.word}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={item.user_count > 2 ? "default" : item.user_count > 1 ? "secondary" : "outline"}
                        className="gap-1"
                      >
                        <Users className="h-3 w-3" />
                        {item.user_count}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {new Date(item.first_added).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyWord(item.word)}
                        className="h-8 w-8 p-0"
                      >
                        {copiedWord === item.word ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : searchQuery ? (
            <div className="text-center py-8 text-gray-500">No words found matching "{searchQuery}"</div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No user dictionary words yet. Words will appear here when users join words in the editor.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
