"use client"

import type React from "react"
import { useState, useMemo } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Plus, Trash2, Loader2, Info, Search } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface CustomWord {
  id: string
  word: string
  created_at: string
}

interface CustomWordsResponse {
  added: CustomWord[]
  ignored: CustomWord[]
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function SpellCheckCustomWordsManager() {
  const { data, error, isLoading, mutate } = useSWR<CustomWordsResponse>("/api/spell-check/custom-words", fetcher)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [newWord, setNewWord] = useState("")
  const [wordAction, setWordAction] = useState<"add" | "ignore">("add")
  const [isSaving, setIsSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [searchQueryAdded, setSearchQueryAdded] = useState("")
  const [searchQueryIgnored, setSearchQueryIgnored] = useState("")
  const [activeTab, setActiveTab] = useState("added")

  const addedWords = data?.added || []
  const ignoredWords = data?.ignored || []

  const filteredAddedWords = useMemo(() => {
    if (!addedWords || !searchQueryAdded.trim()) return addedWords
    const query = searchQueryAdded.toLowerCase().trim()
    return addedWords.filter((item) => item.word.toLowerCase().includes(query))
  }, [addedWords, searchQueryAdded])

  const filteredIgnoredWords = useMemo(() => {
    if (!ignoredWords || !searchQueryIgnored.trim()) return ignoredWords
    const query = searchQueryIgnored.toLowerCase().trim()
    return ignoredWords.filter((item) => item.word.toLowerCase().includes(query))
  }, [ignoredWords, searchQueryIgnored])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newWord.trim()) return

    setIsSaving(true)

    try {
      const response = await fetch("/api/spell-check/custom-words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: newWord.trim(), action: wordAction }),
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

  const handleDelete = async (id: string, action: "add" | "ignore") => {
    setDeleteId(id)
    try {
      const response = await fetch(`/api/spell-check/custom-words?id=${id}&action=${action}`, {
        method: "DELETE",
      })
      if (response.ok) {
        mutate()
      }
    } finally {
      setDeleteId(null)
    }
  }

  const openAdd = (action: "add" | "ignore") => {
    setWordAction(action)
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
        <CardContent className="py-8 text-center text-red-500">Failed to load your spell check custom words</CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Manage your personal spell check dictionary. <strong>Added words</strong> are treated as correct spellings.
          <strong> Ignored words</strong> are skipped during spell checking. Words are automatically added when you
          right-click a misspelled word in the editor and choose "Add to dictionary" or "Ignore".
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Spell Check Custom Words</CardTitle>
          <CardDescription>
            Words you've added to your personal spell check dictionary or chosen to ignore
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="added">
                Added Words ({addedWords.length})
              </TabsTrigger>
              <TabsTrigger value="ignored">
                Ignored Words ({ignoredWords.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="added">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-500">
                    These words are treated as correct by the spell checker
                  </p>
                  <Dialog open={isAddOpen && wordAction === "add"} onOpenChange={(open) => {
                    if (open) openAdd("add")
                    else setIsAddOpen(false)
                  }}>
                    <DialogTrigger asChild>
                      <Button onClick={() => openAdd("add")} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Add Word
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Word to Dictionary</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="word-add">Word</Label>
                          <Input
                            id="word-add"
                            value={newWord}
                            onChange={(e) => setNewWord(e.target.value)}
                            placeholder="Enter a Khmer word"
                            required
                            className="text-lg"
                            dir="auto"
                          />
                          <p className="text-sm text-gray-500">
                            This word will be treated as correctly spelled
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
                </div>

                {addedWords.length > 0 && (
                  <div className="mb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search added words..."
                        value={searchQueryAdded}
                        onChange={(e) => setSearchQueryAdded(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    {searchQueryAdded && (
                      <p className="text-sm text-gray-500 mt-2">
                        Showing {filteredAddedWords.length} of {addedWords.length} words
                      </p>
                    )}
                  </div>
                )}

                {filteredAddedWords.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Word</TableHead>
                        <TableHead>Added</TableHead>
                        <TableHead className="w-[80px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAddedWords.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium text-lg" dir="auto">{item.word}</TableCell>
                          <TableCell className="text-gray-500">
                            {new Date(item.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(item.id, "add")}
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
                ) : searchQueryAdded ? (
                  <div className="text-center py-8 text-gray-500">
                    No words found matching "{searchQueryAdded}"
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No added words yet. Right-click a misspelled word in the editor and choose "Add to dictionary",
                    or add words manually here.
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="ignored">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-500">
                    These words are skipped during spell checking
                  </p>
                  <Dialog open={isAddOpen && wordAction === "ignore"} onOpenChange={(open) => {
                    if (open) openAdd("ignore")
                    else setIsAddOpen(false)
                  }}>
                    <DialogTrigger asChild>
                      <Button onClick={() => openAdd("ignore")} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Add Word
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Ignore Word</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="word-ignore">Word</Label>
                          <Input
                            id="word-ignore"
                            value={newWord}
                            onChange={(e) => setNewWord(e.target.value)}
                            placeholder="Enter a Khmer word"
                            required
                            className="text-lg"
                            dir="auto"
                          />
                          <p className="text-sm text-gray-500">
                            Spell checking will be skipped for this word
                          </p>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={isSaving || !newWord.trim()}>
                            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Ignore Word
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                {ignoredWords.length > 0 && (
                  <div className="mb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search ignored words..."
                        value={searchQueryIgnored}
                        onChange={(e) => setSearchQueryIgnored(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    {searchQueryIgnored && (
                      <p className="text-sm text-gray-500 mt-2">
                        Showing {filteredIgnoredWords.length} of {ignoredWords.length} words
                      </p>
                    )}
                  </div>
                )}

                {filteredIgnoredWords.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Word</TableHead>
                        <TableHead>Added</TableHead>
                        <TableHead className="w-[80px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredIgnoredWords.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium text-lg" dir="auto">{item.word}</TableCell>
                          <TableCell className="text-gray-500">
                            {new Date(item.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(item.id, "ignore")}
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
                ) : searchQueryIgnored ? (
                  <div className="text-center py-8 text-gray-500">
                    No words found matching "{searchQueryIgnored}"
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No ignored words yet. Right-click a misspelled word in the editor and choose "Ignore",
                    or add words manually here.
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
