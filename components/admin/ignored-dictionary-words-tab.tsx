"use client"

import { useState, useMemo, useCallback, useRef } from "react"
import useSWR from "swr"
import { usePagination, PaginationControls } from "@/components/settings/pagination-controls"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, Search, Info, Check, X, ArrowUpCircle, Copy, CheckCircle2, ListChecks } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set())
  const [bulkPromoteDialogOpen, setBulkPromoteDialogOpen] = useState(false)
  const [tsRegexCopied, setTsRegexCopied] = useState(false)
  const [jsonRegexCopied, setJsonRegexCopied] = useState(false)
  const [isBulkPromoting, setIsBulkPromoting] = useState(false)
  const tableRef = useRef<HTMLDivElement>(null)

  const words = data?.words || []
  const unpromotedWords = useMemo(() => words.filter((w) => !w.promoted_at), [words])

  // First apply the promoted/not_promoted filter
  const statusFilteredWords = useMemo(() => {
    if (filter === "promoted") {
      return words.filter((item) => item.promoted_at)
    } else if (filter === "not_promoted") {
      return words.filter((item) => !item.promoted_at)
    }
    return words
  }, [words, filter])

  const searchFilter = useCallback(
    (item: IgnoredWord, query: string) => item.word.toLowerCase().includes(query),
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
    items: statusFilteredWords,
    searchQuery,
    searchFilter,
  })

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

  // Selection handlers
  const toggleWordSelection = (word: string) => {
    setSelectedWords((prev) => {
      const next = new Set(prev)
      if (next.has(word)) {
        next.delete(word)
      } else {
        next.add(word)
      }
      return next
    })
  }

  const selectAllUnpromoted = () => {
    setSelectedWords(new Set(unpromotedWords.map((w) => w.word)))
  }

  const clearSelection = () => {
    setSelectedWords(new Set())
  }

  // Generate regex to match frequency dictionary lines in .ts format (includes newline for clean removal)
  const generateTsRegex = useMemo(() => {
    if (selectedWords.size === 0) return ""
    const wordsArray = Array.from(selectedWords)
    // Escape special regex characters in words
    const escapedWords = wordsArray.map((w) =>
      w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    )
    // Generate regex that matches: { word: "WORD", frequency: NUMBER },
    // Includes (\r?\n|$) at end to remove the newline, preventing blank lines
    if (escapedWords.length === 1) {
      return `^\\s*\\{ word: "${escapedWords[0]}", frequency: \\d+ \\},?\\s*(\\r?\\n|$)`
    }
    return `^\\s*\\{ word: "(${escapedWords.join("|")})", frequency: \\d+ \\},?\\s*(\\r?\\n|$)`
  }, [selectedWords])

  // Generate regex to match frequency dictionary lines in .json format (includes newline for clean removal)
  const generateJsonRegex = useMemo(() => {
    if (selectedWords.size === 0) return ""
    const wordsArray = Array.from(selectedWords)
    // Escape special regex characters in words
    const escapedWords = wordsArray.map((w) =>
      w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    )
    // Generate regex that matches: "WORD": NUMBER,
    // Includes (\r?\n|$) at end to remove the newline, preventing blank lines
    if (escapedWords.length === 1) {
      return `^\\s*"${escapedWords[0]}":\\s*\\d+,?\\s*(\\r?\\n|$)`
    }
    return `^\\s*"(${escapedWords.join("|")})":\\s*\\d+,?\\s*(\\r?\\n|$)`
  }, [selectedWords])

  const copyTsRegex = async () => {
    try {
      await navigator.clipboard.writeText(generateTsRegex)
      setTsRegexCopied(true)
      setTimeout(() => setTsRegexCopied(false), 2000)
    } catch {
      // Clipboard API not available
    }
  }

  const copyJsonRegex = async () => {
    try {
      await navigator.clipboard.writeText(generateJsonRegex)
      setJsonRegexCopied(true)
      setTimeout(() => setJsonRegexCopied(false), 2000)
    } catch {
      // Clipboard API not available
    }
  }

  const handleBulkPromote = async () => {
    setIsBulkPromoting(true)
    try {
      // Promote each selected word
      const wordsToPromote = Array.from(selectedWords)
      for (const word of wordsToPromote) {
        await fetch("/api/admin/ignored-dictionary-words", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ word }),
        })
      }
      mutate()
      setSelectedWords(new Set())
      setBulkPromoteDialogOpen(false)
    } catch (error) {
      console.error("Error bulk promoting words:", error)
    } finally {
      setIsBulkPromoting(false)
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

      {/* Bulk Actions Bar */}
      {selectedWords.size > 0 && (
        <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-900 dark:text-blue-100">
                  {selectedWords.size} word{selectedWords.size !== 1 ? "s" : ""} selected
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={clearSelection}>
                  Clear Selection
                </Button>
                <Button
                  size="sm"
                  onClick={() => setBulkPromoteDialogOpen(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <ArrowUpCircle className="h-4 w-4 mr-2" />
                  Promote Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Promote Dialog */}
      <Dialog open={bulkPromoteDialogOpen} onOpenChange={setBulkPromoteDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Promote {selectedWords.size} Words</DialogTitle>
            <DialogDescription>
              Before marking these words as promoted, you need to remove them from the frequency dictionary file.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Step 1: Copy these regexes</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Use these regexes in your code editor (with multiline mode) to find and delete the matching lines.
              </p>

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    For <code className="bg-muted px-1 rounded">lib/khmer-dictionary-data.ts</code>:
                  </p>
                  <div className="relative">
                    <Textarea
                      readOnly
                      value={generateTsRegex}
                      className="font-mono text-sm pr-12 min-h-[60px]"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={copyTsRegex}
                    >
                      {tsRegexCopied ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    For <code className="bg-muted px-1 rounded">public/dictionaries/km_frequency_dictionary.json</code> (or similar JSON files):
                  </p>
                  <div className="relative">
                    <Textarea
                      readOnly
                      value={generateJsonRegex}
                      className="font-mono text-sm pr-12 min-h-[60px]"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={copyJsonRegex}
                    >
                      {jsonRegexCopied ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Step 2: Remove the lines</h4>
              <p className="text-sm text-muted-foreground">
                Open each dictionary file in your editor, use Find & Replace with regex mode enabled, and delete all matching lines.
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-2">Step 3: Confirm removal</h4>
              <p className="text-sm text-muted-foreground">
                Once you've removed the words from the dictionary file, click the button below to mark them as promoted.
              </p>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Words to be promoted:</strong>
                <div
                  className="mt-2 max-h-[100px] overflow-y-auto text-sm"
                  dir="auto"
                  style={{ fontFamily: '"Noto Sans Khmer", sans-serif' }}
                >
                  {Array.from(selectedWords).join("، ")}
                </div>
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setBulkPromoteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleBulkPromote}
              disabled={isBulkPromoting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isBulkPromoting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Promoting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  I've Removed These Words - Mark as Promoted
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div ref={tableRef}>
      <Card>
        <CardHeader>
          <CardTitle>Ignored Dictionary Words</CardTitle>
          <CardDescription>
            Words users have split that exist in the master frequency dictionary, ranked by number of users
          </CardDescription>
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
              {unpromotedWords.length > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAllUnpromoted}
                    disabled={selectedWords.size === unpromotedWords.length}
                  >
                    Select All Unpromoted ({unpromotedWords.length})
                  </Button>
                  {selectedWords.size > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {selectedWords.size} selected
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {(searchQuery || filter !== "all" || words.length > 10) && (
            <p className="text-sm text-gray-500 mb-4">
              {searchQuery || filter !== "all"
                ? `Found ${totalItems} of ${words.length} words`
                : `${words.length} words total`}
            </p>
          )}

          {paginatedItems.length > 0 ? (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead className="w-[60px]">Rank</TableHead>
                    <TableHead>Word</TableHead>
                    <TableHead className="text-right">Users</TableHead>
                    <TableHead>First Ignored</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.map((item, index) => (
                    <TableRow
                      key={item.word}
                      className={cn(
                        item.promoted_at && "bg-green-50/50 dark:bg-green-950/20",
                        selectedWords.has(item.word) && "bg-blue-50/50 dark:bg-blue-950/20"
                      )}
                    >
                      <TableCell>
                        {!item.promoted_at && (
                          <Checkbox
                            checked={selectedWords.has(item.word)}
                            onCheckedChange={() => toggleWordSelection(item.word)}
                          />
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-gray-500">
                        #{(currentPage - 1) * pageSize + index + 1}
                      </TableCell>
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
    </div>
  )
}
