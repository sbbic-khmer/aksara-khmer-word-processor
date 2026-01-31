"use client"

import type React from "react"

import { useState, useCallback, useRef } from "react"
import useSWR from "swr"
import { usePagination, PaginationControls } from "@/components/settings/pagination-controls"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Plus, Pencil, Trash2, Loader2, Search } from "lucide-react"

interface MasterReplacement {
  id: string
  incorrect_word: string
  correct_word: string
  notes: string | null
  created_by_email: string | null
  created_at: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function MasterReplacementsTab() {
  const { data, error, isLoading, mutate } = useSWR<MasterReplacement[]>("/api/admin/replacements", fetcher)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<MasterReplacement | null>(null)
  const [formData, setFormData] = useState({
    incorrect_word: "",
    correct_word: "",
    notes: "",
  })
  const [isSaving, setIsSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const tableRef = useRef<HTMLDivElement>(null)

  const searchFilter = useCallback(
    (item: MasterReplacement, query: string) =>
      item.incorrect_word.toLowerCase().includes(query) ||
      item.correct_word.toLowerCase().includes(query) ||
      (item.notes && item.notes.toLowerCase().includes(query)) ||
      (item.created_by_email && item.created_by_email.toLowerCase().includes(query)),
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
    items: data || [],
    searchQuery,
    searchFilter,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const url = editingItem ? `/api/admin/replacements/${editingItem.id}` : "/api/admin/replacements"
      const method = editingItem ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        mutate()
        setIsAddOpen(false)
        setEditingItem(null)
        setFormData({ incorrect_word: "", correct_word: "", notes: "" })
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeleteId(id)
    try {
      const response = await fetch(`/api/admin/replacements/${id}`, {
        method: "DELETE",
      })
      if (response.ok) {
        mutate()
      }
    } finally {
      setDeleteId(null)
    }
  }

  const openEdit = (item: MasterReplacement) => {
    setEditingItem(item)
    setFormData({
      incorrect_word: item.incorrect_word,
      correct_word: item.correct_word,
      notes: item.notes || "",
    })
    setIsAddOpen(true)
  }

  const openAdd = () => {
    setEditingItem(null)
    setFormData({ incorrect_word: "", correct_word: "", notes: "" })
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
        <CardContent className="py-8 text-center text-red-500">Failed to load replacements</CardContent>
      </Card>
    )
  }

  return (
    <div ref={tableRef}>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Master Replacement Table</CardTitle>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAdd} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Replacement
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? "Edit Replacement" : "Add New Replacement"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="incorrect">Incorrect Word</Label>
                <Input
                  id="incorrect"
                  value={formData.incorrect_word}
                  onChange={(e) => setFormData({ ...formData, incorrect_word: e.target.value })}
                  placeholder="Enter incorrect spelling"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="correct">Correct Word</Label>
                <Input
                  id="correct"
                  value={formData.correct_word}
                  onChange={(e) => setFormData({ ...formData, correct_word: e.target.value })}
                  placeholder="Enter correct spelling"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Add any notes about this replacement"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingItem ? "Save Changes" : "Add Replacement"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {data && data.length > 0 && (
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search words, notes, or users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {(searchQuery || data.length > 10) && (
              <p className="text-sm text-gray-500 mt-2">
                {searchQuery
                  ? `Found ${totalItems} of ${data.length} replacements`
                  : `${data.length} replacements total`}
              </p>
            )}
          </div>
        )}
        {paginatedItems.length > 0 ? (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Incorrect</TableHead>
                  <TableHead>Correct</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Added By</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
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
                      {item.incorrect_word}
                    </TableCell>
                    <TableCell
                      className="text-lg"
                      dir="auto"
                      style={{ fontFamily: '"Noto Sans Khmer", sans-serif' }}
                    >
                      {item.correct_word}
                    </TableCell>
                    <TableCell className="text-gray-500 truncate max-w-[200px]">{item.notes || "-"}</TableCell>
                    <TableCell className="text-gray-500">{item.created_by_email || "System"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(item)} className="h-8 w-8 p-0">
                          <Pencil className="h-4 w-4" />
                        </Button>
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
                      </div>
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
          <div className="text-center py-8 text-gray-500">No replacements found matching "{searchQuery}"</div>
        ) : (
          <div className="text-center py-8 text-gray-500">No master replacements yet. Add one to get started.</div>
        )}
      </CardContent>
    </Card>
    </div>
  )
}
