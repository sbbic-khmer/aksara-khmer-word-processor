"use client"

import { useState, useMemo } from "react"
import useSWR from "swr"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, Search, Info, Check, X, ArrowUpCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface IgnoredWord {
  word: string
  user_count: number
  first_ignored: string
  last_ignored: string
  promoted_at: string | null
  promoted_notes: string | null
  promoted_by_name: string | null
}

interface AdminIgnoredDictionaryResponse {
  words: IgnoredWord[]
  promotedCount: number
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function IgnoredDictionaryWordsTab() {
  const { data, error, isLoading, mutate } = useSWR<AdminIgnoredDictionaryResponse>(
    "/api/admin/ignored-dictionary-words",
    fetcher,
    { refreshInterval: 30000 }
  )

  const [searchQuery, setSearchQuery] = useState("")
  const [filter, setFilter] = useState<"all" | "promoted" | "not_promoted">("all")
  const [promotingWord, setPromotingWord] = useState<string | null>(null)

  const words = data?.words || []

  const filteredWords = useMemo(() => {
    let filtered = words

    // Apply promoted filter
    if (filter === "promoted") {
      filtered = filtered.filter((item) => item.promoted_at)
    } else if (filter === "not_promoted") {
      filtered = filtered.filter((item) => !item.promoted_at)
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter((item) => item.word.toLowerCase().includes(query))
    }

    return filtered
  }, [words, searchQuery, filter])

  const handlePromote = async (word: string) => {
    setPromotingWord(word)
    try {
      const response = await fetch("/api/admin/ignored-dictionary-words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word }),
      })
      if (response.ok) {
        mutate()
      }
    } catch (error) {
      console.error("Error promoting word:", error)
    } finally {
      setPromotingWord(null)
    }
  }

  const handleUnpromote = async (word: string) => {
    setPromotingWord(word)
    try {
      const response = await fetch(`/api/admin/ignored-dictionary-words?word=${encodeURIComponent(word)}`, {
        method: "DELETE",
      })
      if (response.ok) {
        mutate()
      }
    } catch (error) {
      console.error("Error unpromoting word:", error)
    } finally {
      setPromotingWord(null)
    }
  }

  const promotedCount = data?.promotedCount || 0
  const notPromotedCount = words.filter((w) => !w.promoted_at).length

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
        <CardContent className="py-8 text-center text-red-500">
          Failed to load ignored dictionary words
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          These words exist in the master frequency dictionary but users have chosen to ignore them (usually by splitting
          the word). Mark words as <strong>"Promoted"</strong> after you remove them from the master dictionary to track
          which ones have been addressed.
        </AlertDescription>
      </Alert>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:border-primary/50" onClick={() => setFilter("all")}>
          <CardContent className="py-4">
            <div className="text-2xl font-bold">{words.length}</div>
            <div className="text-sm text-muted-foreground">Total Words</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary/50" onClick={() => setFilter("not_promoted")}>
          <CardContent className="py-4">
            <div className="text-2xl font-bold text-amber-600">{notPromotedCount}</div>
            <div className="text-sm text-muted-foreground">Not Promoted</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary/50" onClick={() => setFilter("promoted")}>
          <CardContent className="py-4">
            <div className="text-2xl font-bold text-green-600">{promotedCount}</div>
            <div className="text-sm text-muted-foreground">Promoted</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ignored Dictionary Words</CardTitle>
          <CardDescription>
            Words users have split that exist in the master frequency dictionary, ranked by number of users
          </CardDescription>
        </CardHeader>
        <CardContent>
          {words.length > 0 && (
            <div className="mb-4 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search words..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={filter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("all")}
                >
                  All
                </Button>
                <Button
                  variant={filter === "not_promoted" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("not_promoted")}
                >
                  Not Promoted
                </Button>
                <Button
                  variant={filter === "promoted" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("promoted")}
                >
                  Promoted
                </Button>
              </div>
            </div>
          )}

          {(searchQuery || filter !== "all") && (
            <p className="text-sm text-gray-500 mb-4">
              Showing {filteredWords.length} of {words.length} words
            </p>
          )}

          {filteredWords.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">Rank</TableHead>
                  <TableHead>Word</TableHead>
                  <TableHead className="text-right">Users</TableHead>
                  <TableHead>First Ignored</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWords.map((item, index) => (
                  <TableRow
                    key={item.word}
                    className={cn(item.promoted_at && "bg-green-50/50 dark:bg-green-950/20")}
                  >
                    <TableCell className="font-medium text-gray-500">#{index + 1}</TableCell>
                    <TableCell
                      className="font-medium text-lg"
                      dir="auto"
                      style={{ fontFamily: '"Noto Sans Khmer", sans-serif' }}
                    >
                      {item.word}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={cn(
                          "inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-sm font-medium",
                          item.user_count >= 3
                            ? "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
                            : item.user_count >= 2
                              ? "bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                        )}
                      >
                        {item.user_count}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-500 text-sm">
                      {new Date(item.first_ignored).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {item.promoted_at ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                                <Check className="h-3 w-3 mr-1" />
                                Promoted
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                Promoted on {new Date(item.promoted_at).toLocaleDateString()}
                                {item.promoted_by_name && ` by ${item.promoted_by_name}`}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <Badge variant="outline" className="text-amber-600 border-amber-300">
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.promoted_at ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnpromote(item.word)}
                          disabled={promotingWord === item.word}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          {promotingWord === item.word ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePromote(item.word)}
                          disabled={promotingWord === item.word}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        >
                          {promotingWord === item.word ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ArrowUpCircle className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : searchQuery || filter !== "all" ? (
            <div className="text-center py-8 text-gray-500">
              No words found matching your criteria
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">No ignored dictionary words yet</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
