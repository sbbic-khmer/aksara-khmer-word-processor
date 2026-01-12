"use client"

import type React from "react"
import { useState, useMemo } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Plus, Pencil, Trash2, Loader2, Info, Search } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface UserReplacement {
  id: string
  incorrect_word: string
  correct_word: string
  notes: string | null
  created_at: string
  promoted_to_master: boolean
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function UserReplacementsManager() {
  const { data, error, isLoading, mutate } = useSWR<UserReplacement[]>("/api/replacements/user", fetcher)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<UserReplacement | null>(null)
  const [formData, setFormData] = useState({
    incorrect_word: "",
    correct_word: "",
    notes: "",
  })
  const [isSaving, setIsSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const filteredData = useMemo(() => {
    if (!data || !searchQuery.trim()) return data
    const query = searchQuery.toLowerCase().trim()
    return data.filter(
      (item) =>
        item.incorrect_word.toLowerCase().includes(query) ||
        item.correct_word.toLowerCase().includes(query) ||
        (item.notes && item.notes.toLowerCase().includes(query)),
    )
  }, [data, searchQuery])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const url = editingItem ? `/api/replacements/user/${editingItem.id}` : "/api/replacements/user"
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
      const response = await fetch(`/api/replacements/user/${id}`, {
        method: "DELETE",
      })
      if (response.ok) {
        mutate()
      }
    } finally {
      setDeleteId(null)
    }
  }

  const openEdit = (item: UserReplacement) => {
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
        <CardContent className="py-8 text-center text-red-500">Failed to load your replacements</CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Your personal replacements override the master replacements when there are duplicates. This allows you to
          customize word corrections for your own writing style.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>My Word Replacements</CardTitle>
            <CardDescription>
              Add custom word replacements that will be applied when you use voice-to-text
            </CardDescription>
          </div>
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
                    placeholder="Enter word to replace"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="correct">Correct Word</Label>
                  <Input
                    id="correct"
                    value={formData.correct_word}
                    onChange={(e) => setFormData({ ...formData, correct_word: e.target.value })}
                    placeholder="Enter replacement word"
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
                  placeholder="Search words or notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              {searchQuery && (
                <p className="text-sm text-gray-500 mt-2">
                  Showing {filteredData?.length || 0} of {data.length} replacements
                </p>
              )}
            </div>
          )}
          {filteredData && filteredData.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Incorrect</TableHead>
                  <TableHead>Correct</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.incorrect_word}</TableCell>
                    <TableCell>{item.correct_word}</TableCell>
                    <TableCell className="text-gray-500 truncate max-w-[200px]">{item.notes || "-"}</TableCell>
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
          ) : searchQuery ? (
            <div className="text-center py-8 text-gray-500">No replacements found matching "{searchQuery}"</div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No personal replacements yet. Add one to customize word corrections for your writing.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
