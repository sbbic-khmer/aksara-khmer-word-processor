"use client"

import type React from "react"
import { useState, useCallback, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Trash2, Loader2, Plus, Info, Search } from "lucide-react"
import { useIgnoredDictionaryWords } from "@/hooks/use-ignored-dictionary-words"
import { usePagination, PaginationControls } from "./pagination-controls"

interface IgnoredWord {
  id: string
  word: string
  created_at: string
}

export function IgnoredDictionaryWordsManager() {
  const { ignoredWords, isLoading, mutate } = useIgnoredDictionaryWords()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [newWord, setNewWord] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const tableRef = useRef<HTMLDivElement>(null)

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
    items: ignoredWords as IgnoredWord[],
    searchQuery,
    searchFilter,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newWord.trim()) return

    setIsSaving(true)

    try {
      const response = await fetch("/api/dictionary/user/ignored", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: newWord.trim() }),
      })

      if (response.ok) {
        mutate()
        setIsAddOpen(false)
        setNewWord("")
      }
    } catch (error) {
      console.error("Error adding ignored word:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      const response = await fetch(`/api/dictionary/user/ignored?id=${id}`, {
        method: "DELETE",
      })
      if (response.ok) {
        mutate()
      }
    } catch (error) {
      console.error("Error deleting ignored word:", error)
    } finally {
      setDeletingId(null)
    }
  }

  const openAdd = () => {
    setNewWord("")
    setIsAddOpen(true)
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ignored Dictionary Words</CardTitle>
          <CardDescription>
            Words that are ignored from the master dictionary during word breaking
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Ignored words are excluded from word breaking. When a compound word is ignored, the word breaker will split it into its component parts.
          For example, ignoring "មានន័យថា" will cause it to split as "មាន ន័យ ថា". Words are automatically added when you use "Split word" in the editor, or you can add them manually here.
        </AlertDescription>
      </Alert>

      <div ref={tableRef}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Ignored Dictionary Words</CardTitle>
            <CardDescription>
              Compound words that should be split into their component parts
            </CardDescription>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAdd} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Word
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Ignored Word</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="word">Word</Label>
                  <Input
                    id="word"
                    value={newWord}
                    onChange={(e) => setNewWord(e.target.value)}
                    placeholder="Enter a compound word to ignore (e.g., មានន័យថា)"
                    required
                    className="text-lg"
                    dir="auto"
                  />
                  <p className="text-sm text-gray-500">
                    This word will be split into its component parts when you type it in the editor.
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSaving || !newWord.trim()}>
                    {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Add Word
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {ignoredWords.length > 0 && (
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search words..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              {(searchQuery || ignoredWords.length > 10) && (
                <p className="text-sm text-gray-500 mt-2">
                  {searchQuery
                    ? `Found ${totalItems} of ${ignoredWords.length} words`
                    : `${ignoredWords.length} words total`}
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
                    <TableHead>Added</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.map((word) => (
                    <TableRow key={word.id}>
                      <TableCell
                        className="font-medium text-lg"
                        dir="auto"
                        style={{ fontFamily: '"Noto Sans Khmer", sans-serif' }}
                      >
                        {word.word}
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {new Date(word.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(word.id)}
                          disabled={deletingId === word.id}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                        >
                          {deletingId === word.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
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
          ) : searchQuery ? (
            <div className="text-center py-8 text-gray-500">No words found matching "{searchQuery}"</div>
          ) : (
            <div className="text-center py-8 text-sm text-gray-500">
              No ignored words yet. Use "Split word" in the editor or add words manually here.
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  )
}
