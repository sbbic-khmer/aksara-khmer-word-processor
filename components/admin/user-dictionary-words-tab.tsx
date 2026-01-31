"use client"

import { useState, useMemo, useCallback, useRef } from "react"
import useSWR from "swr"
import { usePagination, PaginationControls } from "@/components/settings/pagination-controls"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Loader2, Search, Users, Copy, Check, BookOpen, Plus, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface AggregatedWord {
  word: string
  user_count: number
  first_added: string
  last_added: string
  in_frequency_dictionary: boolean
}

interface AdminDictionaryResponse {
  words: AggregatedWord[]
  stats: {
    total: number
    inDictionary: number
    notInDictionary: number
  }
}

type DictionaryFilter = "all" | "in_dictionary" | "not_in_dictionary"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function UserDictionaryWordsTab() {
  const { data, error, isLoading } = useSWR<AdminDictionaryResponse>("/api/dictionary/admin", fetcher)
  const [searchQuery, setSearchQuery] = useState("")
  const [copiedWord, setCopiedWord] = useState<string | null>(null)
  const [dictionaryFilter, setDictionaryFilter] = useState<DictionaryFilter>("all")
  const tableRef = useRef<HTMLDivElement>(null)

  const words = data?.words || []
  const stats = data?.stats || { total: 0, inDictionary: 0, notInDictionary: 0 }

  // Apply dictionary filter first, then sort by user_count
  const filteredAndSortedWords = useMemo(() => {
    let filtered = words
    if (dictionaryFilter === "in_dictionary") {
      filtered = words.filter((w) => w.in_frequency_dictionary)
    } else if (dictionaryFilter === "not_in_dictionary") {
      filtered = words.filter((w) => !w.in_frequency_dictionary)
    }
    return [...filtered].sort((a, b) => b.user_count - a.user_count)
  }, [words, dictionaryFilter])

  const searchFilter = useCallback(
    (item: AggregatedWord, query: string) => item.word.toLowerCase().includes(query),
    []
  )

  const {
    paginatedItems,
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    setCurrentPage,
    setPageSize,
  } = usePagination({
    items: filteredAndSortedWords,
    searchQuery,
    searchFilter,
  })

  const handleCopyWord = async (word: string) => {
    try {
      await navigator.clipboard.writeText(word)
      setCopiedWord(word)
      setTimeout(() => setCopiedWord(null), 2000)
    } catch {
      // Clipboard API not available
    }
  }

  // Calculate multi-user stats
  const multiUserWords = words.filter((w) => w.user_count > 1).length
  const multiUserNotInDict = words.filter((w) => w.user_count > 1 && !w.in_frequency_dictionary).length

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

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          This view shows words users have added via "Join selected words". Words{" "}
          <span className="font-medium text-green-700 dark:text-green-400">not in the frequency dictionary</span> are
          candidates for addition. Words{" "}
          <span className="font-medium text-blue-700 dark:text-blue-400">already in the dictionary</span> may indicate
          word-breaking issues worth investigating.
        </AlertDescription>
      </Alert>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card
          className={cn(
            "cursor-pointer transition-colors hover:border-primary/50",
            dictionaryFilter === "all" && "border-primary ring-1 ring-primary/20"
          )}
          onClick={() => setDictionaryFilter("all")}
        >
          <CardContent className="py-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total Words</div>
          </CardContent>
        </Card>
        <Card
          className={cn(
            "cursor-pointer transition-colors hover:border-green-500/50",
            dictionaryFilter === "not_in_dictionary" && "border-green-500 ring-1 ring-green-500/20"
          )}
          onClick={() => setDictionaryFilter("not_in_dictionary")}
        >
          <CardContent className="py-4">
            <div className="text-2xl font-bold text-green-600">{stats.notInDictionary}</div>
            <div className="text-sm text-muted-foreground">New Candidates</div>
            <div className="text-xs text-muted-foreground">Not in dictionary</div>
          </CardContent>
        </Card>
        <Card
          className={cn(
            "cursor-pointer transition-colors hover:border-blue-500/50",
            dictionaryFilter === "in_dictionary" && "border-blue-500 ring-1 ring-blue-500/20"
          )}
          onClick={() => setDictionaryFilter("in_dictionary")}
        >
          <CardContent className="py-4">
            <div className="text-2xl font-bold text-blue-600">{stats.inDictionary}</div>
            <div className="text-sm text-muted-foreground">Already Exists</div>
            <div className="text-xs text-muted-foreground">In dictionary</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="text-2xl font-bold text-amber-600">{multiUserNotInDict}</div>
            <div className="text-sm text-muted-foreground">High Priority</div>
            <div className="text-xs text-muted-foreground">2+ users, not in dict</div>
          </CardContent>
        </Card>
      </div>

      <div ref={tableRef}>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>User Dictionary Words</CardTitle>
              <CardDescription>
                Words added by users, sorted by popularity. Click stats cards to filter by dictionary status.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {words.length > 0 && (
              <div className="mb-4 space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
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
                      variant={dictionaryFilter === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDictionaryFilter("all")}
                    >
                      All
                    </Button>
                    <Button
                      variant={dictionaryFilter === "not_in_dictionary" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDictionaryFilter("not_in_dictionary")}
                      className={cn(
                        dictionaryFilter === "not_in_dictionary" && "bg-green-600 hover:bg-green-700"
                      )}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      New
                    </Button>
                    <Button
                      variant={dictionaryFilter === "in_dictionary" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDictionaryFilter("in_dictionary")}
                      className={cn(
                        dictionaryFilter === "in_dictionary" && "bg-blue-600 hover:bg-blue-700"
                      )}
                    >
                      <BookOpen className="h-4 w-4 mr-1" />
                      Exists
                    </Button>
                  </div>
                </div>
                {(searchQuery || dictionaryFilter !== "all" || words.length > 10) && (
                  <p className="text-sm text-gray-500">
                    {searchQuery || dictionaryFilter !== "all"
                      ? `Found ${totalItems} of ${words.length} words`
                      : `${words.length} words total`}
                  </p>
                )}
              </div>
            )}
            {paginatedItems.length > 0 ? (
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Word</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Users</TableHead>
                      <TableHead>First Added</TableHead>
                      <TableHead className="w-[80px]">Copy</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedItems.map((item) => (
                      <TableRow
                        key={item.word}
                        className={cn(
                          !item.in_frequency_dictionary && item.user_count > 1 && "bg-green-50/50 dark:bg-green-950/20"
                        )}
                      >
                        <TableCell
                          className="font-medium text-lg"
                          dir="auto"
                          style={{ fontFamily: '"Noto Sans Khmer", sans-serif' }}
                        >
                          {item.word}
                        </TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                {item.in_frequency_dictionary ? (
                                  <Badge variant="secondary" className="gap-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                    <BookOpen className="h-3 w-3" />
                                    In Dict
                                  </Badge>
                                ) : (
                                  <Badge className="gap-1 bg-green-600 hover:bg-green-700">
                                    <Plus className="h-3 w-3" />
                                    New
                                  </Badge>
                                )}
                              </TooltipTrigger>
                              <TooltipContent>
                                {item.in_frequency_dictionary
                                  ? "This word already exists in the frequency dictionary"
                                  : "This word is not in the frequency dictionary - candidate for addition"}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
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
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={totalItems}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                  scrollTargetRef={tableRef}
                />
              </div>
            ) : searchQuery || dictionaryFilter !== "all" ? (
              <div className="text-center py-8 text-gray-500">No words found matching your criteria</div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No user dictionary words yet. Words will appear here when users join words in the editor.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
