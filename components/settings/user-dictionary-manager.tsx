"use client"

import type React from "react"
import { useState, useCallback, useRef } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Plus, Trash2, Loader2, Info, Search } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { usePagination, PaginationControls } from "./pagination-controls"

interface DictionaryWord {
  id: string
  word: string
  created_at: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function UserDictionaryManager() {
  const { data, error, isLoading, mutate } = useSWR<{ words: DictionaryWord[] }>("/api/dictionary/user", fetcher)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [newWord, setNewWord] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const tableRef = useRef<HTMLDivElement>(null)

  const words = data?.words || []

  const searchFilter = useCallback(
    (item: DictionaryWord, query: string) => item.word.toLowerCase().includes(query),
    []
  )

  const {
    paginatedItems,
    filteredItems,
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    setCurrentPage,
    setPageSize,
  } = usePagination({
    items: words,
    searchQuery,
    searchFilter,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newWord.trim()) return
    
    setIsSaving(true)

    try {
      const response = await fetch("/api/dictionary/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: newWord.trim() }),
      })

      if (response.ok) {
        mutate()
        setIsAddOpen(false)
        setNewWord("")
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeleteId(id)
    try {
      const response = await fetch(`/api/dictionary/user?id=${id}`, {
        method: "DELETE",
      })
      if (response.ok) {
        mutate()
      }
    } finally {
      setDeleteId(null)
    }
  }

  const openAdd = () => {
    setNewWord("")
    setIsAddOpen(true)
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
        <CardContent className="py-8 text-center text-red-500">Failed to load your dictionary</CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Your personal dictionary contains words that the word breaker will keep together. Words are automatically
          added when you use "Join selected words" in the editor. You can also add words manually here.
        </AlertDescription>
      </Alert>

      <div ref={tableRef}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>My Dictionary</CardTitle>
            <CardDescription>
              Custom words that will be recognized by the Khmer word breaker
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
                <DialogTitle>Add New Word</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="word">Word</Label>
                  <Input
                    id="word"
                    value={newWord}
                    onChange={(e) => setNewWord(e.target.value)}
                    placeholder="Enter a Khmer word"
                    required
                    className="text-lg"
                    dir="auto"
                  />
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
          {words.length > 0 && (
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
              {(searchQuery || words.length > 10) && (
                <p className="text-sm text-gray-500 mt-2">
                  {searchQuery
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
                    <TableHead>Added</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell
                      className="font-medium text-lg"
                      dir="auto"
                      style={{ fontFamily: '"Noto Sans Khmer", sans-serif' }}
                    >
                      {item.word}
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {new Date(item.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(item.id)}
                        disabled={deleteId === item.id}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                      >
                        {deleteId === item.id ? (
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
            <div className="text-center py-8 text-gray-500">
              No dictionary words yet. Use "Join selected words" in the editor or add words manually here.
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  )
}
