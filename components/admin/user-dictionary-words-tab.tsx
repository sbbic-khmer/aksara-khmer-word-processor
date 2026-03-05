"use client"

import { useState, useMemo, useCallback, useRef } from "react"
import useSWR from "swr"
import { usePagination, PaginationControls } from "@/components/settings/pagination-controls"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Loader2, Search, Users, Copy, Check, BookOpen, Plus, Info, ArrowUpCircle, CheckCircle2, ListChecks, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
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

interface AggregatedWord {
  word: string
  user_count: number
  first_added: string
  last_added: string
  in_frequency_dictionary: boolean
  promoted_at: string | null
  promoted_frequency: number | null
  promoted_by_name: string | null
}

interface AdminDictionaryResponse {
  words: AggregatedWord[]
  stats: {
    total: number
    inDictionary: number
    notInDictionary: number
    promotedCount: number
  }
}

type DictionaryFilter = "all" | "in_dictionary" | "not_in_dictionary" | "promoted"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function UserDictionaryWordsTab() {
  const { data, error, isLoading, mutate } = useSWR<AdminDictionaryResponse>("/api/dictionary/admin", fetcher, {
    refreshInterval: 30000,
  })
  const [searchQuery, setSearchQuery] = useState("")
  const [copiedWord, setCopiedWord] = useState<string | null>(null)
  const [dictionaryFilter, setDictionaryFilter] = useState<DictionaryFilter>("all")
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set())
  const [bulkAddDialogOpen, setBulkAddDialogOpen] = useState(false)
  const [isBulkPromoting, setIsBulkPromoting] = useState(false)
  const [promotingWord, setPromotingWord] = useState<string | null>(null)
  const [tsCopied, setTsCopied] = useState(false)
  const [jsonCopied, setJsonCopied] = useState(false)
  const [tsvCopied, setTsvCopied] = useState(false)
  const tableRef = useRef<HTMLDivElement>(null)

  const words = data?.words || []
  const stats = data?.stats || { total: 0, inDictionary: 0, notInDictionary: 0, promotedCount: 0 }

  // Words that are "New" candidates: not in dictionary AND not promoted
  const unpromotedNewWords = useMemo(
    () => words.filter((w) => !w.in_frequency_dictionary && !w.promoted_at),
    [words]
  )

  // Apply dictionary filter first, then sort by user_count
  const filteredAndSortedWords = useMemo(() => {
    let filtered = words
    if (dictionaryFilter === "in_dictionary") {
      filtered = words.filter((w) => w.in_frequency_dictionary)
    } else if (dictionaryFilter === "not_in_dictionary") {
      filtered = words.filter((w) => !w.in_frequency_dictionary && !w.promoted_at)
    } else if (dictionaryFilter === "promoted") {
      filtered = words.filter((w) => w.promoted_at)
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

  // Promote / unpromote handlers
  const handlePromote = async (word: string) => {
    setPromotingWord(word)
    try {
      const response = await fetch("/api/admin/user-dictionary-words", {
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
      const response = await fetch(`/api/admin/user-dictionary-words?word=${encodeURIComponent(word)}`, {
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
    setSelectedWords(new Set(unpromotedNewWords.map((w) => w.word)))
  }

  const clearSelection = () => {
    setSelectedWords(new Set())
  }

  // Generate insertable text for dictionary files
  const generateTsLines = useMemo(() => {
    if (selectedWords.size === 0) return ""
    return Array.from(selectedWords)
      .map((w) => `  { word: "${w}", frequency: 100 },`)
      .join("\n")
  }, [selectedWords])

  const generateJsonLines = useMemo(() => {
    if (selectedWords.size === 0) return ""
    return Array.from(selectedWords)
      .map((w) => `  "${w}": 100,`)
      .join("\n")
  }, [selectedWords])

  const generateTsvLines = useMemo(() => {
    if (selectedWords.size === 0) return ""
    return Array.from(selectedWords)
      .map((w) => `${w}\t100`)
      .join("\n")
  }, [selectedWords])

  const copyTs = async () => {
    try {
      await navigator.clipboard.writeText(generateTsLines)
      setTsCopied(true)
      setTimeout(() => setTsCopied(false), 2000)
    } catch {}
  }

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(generateJsonLines)
      setJsonCopied(true)
      setTimeout(() => setJsonCopied(false), 2000)
    } catch {}
  }

  const copyTsv = async () => {
    try {
      await navigator.clipboard.writeText(generateTsvLines)
      setTsvCopied(true)
      setTimeout(() => setTsvCopied(false), 2000)
    } catch {}
  }

  const handleBulkPromote = async () => {
    setIsBulkPromoting(true)
    try {
      const wordsToPromote = Array.from(selectedWords)
      for (const word of wordsToPromote) {
        await fetch("/api/admin/user-dictionary-words", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ word }),
        })
      }
      mutate()
      setSelectedWords(new Set())
      setBulkAddDialogOpen(false)
    } catch (error) {
      console.error("Error bulk promoting words:", error)
    } finally {
      setIsBulkPromoting(false)
    }
  }

  // Calculate stats
  const multiUserNotInDict = words.filter((w) => w.user_count > 1 && !w.in_frequency_dictionary).length
  const newCandidatesCount = words.filter((w) => !w.in_frequency_dictionary && !w.promoted_at).length

  // Determine word status for display
  const getWordStatus = (item: AggregatedWord) => {
    if (item.in_frequency_dictionary) return "in_dict"
    if (item.promoted_at) return "added"
    return "new"
  }

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
          candidates for addition. Mark words as <strong>"Added"</strong> after inserting them into the dictionary files
          to track which ones have been addressed.
        </AlertDescription>
      </Alert>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
            <div className="text-2xl font-bold text-green-600">{newCandidatesCount}</div>
            <div className="text-sm text-muted-foreground">New Candidates</div>
            <div className="text-xs text-muted-foreground">Not in dictionary</div>
          </CardContent>
        </Card>
        <Card
          className={cn(
            "cursor-pointer transition-colors hover:border-teal-500/50",
            dictionaryFilter === "promoted" && "border-teal-500 ring-1 ring-teal-500/20"
          )}
          onClick={() => setDictionaryFilter("promoted")}
        >
          <CardContent className="py-4">
            <div className="text-2xl font-bold text-teal-600">{stats.promotedCount}</div>
            <div className="text-sm text-muted-foreground">Added</div>
            <div className="text-xs text-muted-foreground">Promoted to dict</div>
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

      {/* Bulk Actions Bar */}
      {selectedWords.size > 0 && (
        <Card className="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20">
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-900 dark:text-green-100">
                  {selectedWords.size} word{selectedWords.size !== 1 ? "s" : ""} selected
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={clearSelection}>
                  Clear Selection
                </Button>
                <Button
                  size="sm"
                  onClick={() => setBulkAddDialogOpen(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <ArrowUpCircle className="h-4 w-4 mr-2" />
                  Add to Dictionary
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Add Dialog */}
      <Dialog open={bulkAddDialogOpen} onOpenChange={setBulkAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Add {selectedWords.size} Words to Dictionary</DialogTitle>
            <DialogDescription>
              Copy the text below and paste it into the appropriate dictionary file. Then mark the words as added.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 min-h-0">
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  For <code className="bg-muted px-1 rounded">lib/khmer-dictionary-data.ts</code> — paste inside the array:
                </p>
                <div className="relative">
                  <Textarea
                    readOnly
                    value={generateTsLines}
                    className="font-mono text-sm pr-12 min-h-[80px]"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={copyTs}
                  >
                    {tsCopied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  For <code className="bg-muted px-1 rounded">public/dictionaries/km_frequency_dictionary.json</code> — paste inside the object:
                </p>
                <div className="relative">
                  <Textarea
                    readOnly
                    value={generateJsonLines}
                    className="font-mono text-sm pr-12 min-h-[80px]"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={copyJson}
                  >
                    {jsonCopied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  For <code className="bg-muted px-1 rounded">public/dictionaries/km_symspell_dictionary.txt</code> — append these lines:
                </p>
                <div className="relative">
                  <Textarea
                    readOnly
                    value={generateTsvLines}
                    className="font-mono text-sm pr-12 min-h-[80px]"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={copyTsv}
                  >
                    {tsvCopied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Words to be added ({selectedWords.size}):</strong>
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
            <Button variant="outline" onClick={() => setBulkAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleBulkPromote}
              disabled={isBulkPromoting}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {isBulkPromoting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Marking...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  I've Added These Words — Mark as Added
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                      variant={dictionaryFilter === "promoted" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDictionaryFilter("promoted")}
                      className={cn(
                        dictionaryFilter === "promoted" && "bg-teal-600 hover:bg-teal-700"
                      )}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Added
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
                {unpromotedNewWords.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={selectAllUnpromoted}
                      disabled={selectedWords.size === unpromotedNewWords.length}
                    >
                      Select All Unpromoted ({unpromotedNewWords.length})
                    </Button>
                    {selectedWords.size > 0 && (
                      <span className="text-sm text-muted-foreground">
                        {selectedWords.size} selected
                      </span>
                    )}
                  </div>
                )}
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
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>Word</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Users</TableHead>
                      <TableHead>First Added</TableHead>
                      <TableHead className="w-[100px]">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedItems.map((item) => {
                      const status = getWordStatus(item)
                      return (
                        <TableRow
                          key={item.word}
                          className={cn(
                            status === "new" && item.user_count > 1 && "bg-green-50/50 dark:bg-green-950/20",
                            status === "added" && "bg-teal-50/50 dark:bg-teal-950/20",
                            selectedWords.has(item.word) && "bg-blue-50/50 dark:bg-blue-950/20"
                          )}
                        >
                          <TableCell>
                            {status === "new" && (
                              <Checkbox
                                checked={selectedWords.has(item.word)}
                                onCheckedChange={() => toggleWordSelection(item.word)}
                              />
                            )}
                          </TableCell>
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
                                  {status === "in_dict" ? (
                                    <Badge variant="secondary" className="gap-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                      <BookOpen className="h-3 w-3" />
                                      In Dict
                                    </Badge>
                                  ) : status === "added" ? (
                                    <Badge className="gap-1 bg-teal-600 hover:bg-teal-700">
                                      <CheckCircle2 className="h-3 w-3" />
                                      Added
                                    </Badge>
                                  ) : (
                                    <Badge className="gap-1 bg-green-600 hover:bg-green-700">
                                      <Plus className="h-3 w-3" />
                                      New
                                    </Badge>
                                  )}
                                </TooltipTrigger>
                                <TooltipContent>
                                  {status === "in_dict"
                                    ? "This word already exists in the frequency dictionary"
                                    : status === "added"
                                      ? `Added to dictionary${item.promoted_by_name ? ` by ${item.promoted_by_name}` : ""} on ${new Date(item.promoted_at!).toLocaleDateString()}`
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
                            {status === "new" ? (
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
                            ) : status === "added" ? (
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
                                onClick={() => handleCopyWord(item.word)}
                                className="h-8 w-8 p-0"
                              >
                                {copiedWord === item.word ? (
                                  <Check className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
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
