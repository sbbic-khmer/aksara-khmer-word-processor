"use client"

import type React from "react"
import { useState, useCallback, useRef } from "react"
import { useTranslations } from "next-intl"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Plus, Trash2, Loader2, Info, Search, CheckCircle2, XCircle } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { usePagination, PaginationControls } from "./pagination-controls"

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
  const t = useTranslations('settings.spellCheckWords')
  const tc = useTranslations('common')
  const { data, error, isLoading, mutate } = useSWR<CustomWordsResponse>("/api/spell-check/custom-words", fetcher)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [newWord, setNewWord] = useState("")
  const [wordAction, setWordAction] = useState<"add" | "ignore">("add")
  const [isSaving, setIsSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [searchQueryAdded, setSearchQueryAdded] = useState("")
  const [searchQueryIgnored, setSearchQueryIgnored] = useState("")
  const [activeTab, setActiveTab] = useState("added")
  const tableRef = useRef<HTMLDivElement>(null)

  const addedWords = data?.added || []
  const ignoredWords = data?.ignored || []

  const wordSearchFilter = useCallback(
    (item: CustomWord, query: string) => item.word.toLowerCase().includes(query),
    []
  )

  const addedPagination = usePagination({
    items: addedWords,
    searchQuery: searchQueryAdded,
    searchFilter: wordSearchFilter,
  })

  const ignoredPagination = usePagination({
    items: ignoredWords,
    searchQuery: searchQueryIgnored,
    searchFilter: wordSearchFilter,
  })

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
      <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/50 shadow-sm p-8">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-red-200 dark:border-red-900/50 shadow-sm p-8">
        <p className="text-center text-red-500">{t('loadError')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Info Alert */}
      <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-4 border border-blue-200/50 dark:border-blue-900/50">
              <div className="flex gap-3">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {t('info')}
                </p>
              </div>
            </div>

      {/* Main Card */}
      <div ref={tableRef} className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/50 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200/80 dark:border-slate-700/50">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            {t('title')}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('description')}
          </p>
        </div>

        {/* Tabs */}
        <div className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-1 mb-6">
              <TabsList className="w-full grid grid-cols-2 gap-1 bg-transparent h-auto p-0">
                <TabsTrigger
                  value="added"
                  className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200
                    data-[state=inactive]:text-slate-600 data-[state=inactive]:dark:text-slate-400
                    data-[state=inactive]:hover:text-slate-900 data-[state=inactive]:dark:hover:text-white
                    data-[state=inactive]:hover:bg-white/50 data-[state=inactive]:dark:hover:bg-slate-700/50
                    data-[state=active]:bg-white data-[state=active]:dark:bg-slate-700
                    data-[state=active]:text-emerald-600 data-[state=active]:dark:text-emerald-400
                    data-[state=active]:shadow-sm"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {t('addedTab', { count: addedWords.length })}
                </TabsTrigger>
                <TabsTrigger
                  value="ignored"
                  className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200
                    data-[state=inactive]:text-slate-600 data-[state=inactive]:dark:text-slate-400
                    data-[state=inactive]:hover:text-slate-900 data-[state=inactive]:dark:hover:text-white
                    data-[state=inactive]:hover:bg-white/50 data-[state=inactive]:dark:hover:bg-slate-700/50
                    data-[state=active]:bg-white data-[state=active]:dark:bg-slate-700
                    data-[state=active]:text-orange-600 data-[state=active]:dark:text-orange-400
                    data-[state=active]:shadow-sm"
                >
                  <XCircle className="h-4 w-4" />
                  {t('ignoredTab', { count: ignoredWords.length })}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="added" className="mt-0">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {t('addedDescription')}
                  </p>
                  <Dialog open={isAddOpen && wordAction === "add"} onOpenChange={(open) => {
                    if (open) openAdd("add")
                    else setIsAddOpen(false)
                  }}>
                    <DialogTrigger asChild>
                      <Button onClick={() => openAdd("add")} className="gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-lg shadow-emerald-500/25">
                        <Plus className="h-4 w-4" />
                        {tc('addWord')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>{t('addToDict')}</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                        <div className="space-y-2">
                          <Label htmlFor="word-add">{tc('word')}</Label>
                          <Input
                            id="word-add"
                            value={newWord}
                            onChange={(e) => setNewWord(e.target.value)}
                            placeholder={tc('searchWords')}
                            required
                            className="text-lg h-12"
                            dir="auto"
                          />
                          <p className="text-sm text-slate-500">
                            {t('wordTreatedCorrect')}
                          </p>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                          <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                            {tc('cancel')}
                          </Button>
                          <Button
                            type="submit"
                            disabled={isSaving || !newWord.trim()}
                            className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
                          >
                            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {tc('addWord')}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                {addedWords.length > 0 && (
                  <div className="pt-2">
                    <div className="relative max-w-sm">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder={t('searchAdded')}
                        value={searchQueryAdded}
                        onChange={(e) => setSearchQueryAdded(e.target.value)}
                        className="pl-9 bg-slate-50 dark:bg-slate-800"
                      />
                    </div>
                    {(searchQueryAdded || addedWords.length > 10) && (
                      <p className="text-xs text-slate-500 mt-2">
                        {searchQueryAdded
                          ? `${tc('found')} ${addedPagination.totalItems} ${tc('of')} ${addedWords.length} ${tc('words')}`
                          : tc('wordsTotal', { count: addedWords.length })}
                      </p>
                    )}
                  </div>
                )}

                {addedPagination.paginatedItems.length > 0 ? (
                  <div className="space-y-4 pt-2">
                    {/* Word Grid */}
                    <div className="grid gap-2">
                      {addedPagination.paginatedItems.map((item) => (
                        <div
                          key={item.id}
                          className="group flex items-center justify-between p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/30 transition-colors border border-emerald-100 dark:border-emerald-900/30"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                            <span
                              className="text-lg font-medium text-slate-900 dark:text-white truncate"
                              dir="auto"
                              style={{ fontFamily: 'var(--font-noto-khmer), sans-serif' }}
                            >
                              {item.word}
                            </span>
                            <span className="text-xs text-slate-400 hidden sm:inline">
                              {new Date(item.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(item.id, "add")}
                            disabled={deleteId === item.id}
                            className="h-8 w-8 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            {deleteId === item.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                    <PaginationControls
                      currentPage={addedPagination.currentPage}
                      totalPages={addedPagination.totalPages}
                      pageSize={addedPagination.pageSize}
                      totalItems={addedPagination.totalItems}
                      onPageChange={addedPagination.setCurrentPage}
                      onPageSizeChange={addedPagination.setPageSize}
                      scrollTargetRef={tableRef}
                    />
                  </div>
                ) : searchQueryAdded ? (
                  <div className="text-center py-12">
                    <Search className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-500">{tc('noResults')}</p>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <CheckCircle2 className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-500">{t('addedEmpty')}</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="ignored" className="mt-0">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {t('ignoredDescription')}
                  </p>
                  <Dialog open={isAddOpen && wordAction === "ignore"} onOpenChange={(open) => {
                    if (open) openAdd("ignore")
                    else setIsAddOpen(false)
                  }}>
                    <DialogTrigger asChild>
                      <Button onClick={() => openAdd("ignore")} className="gap-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-lg shadow-orange-500/25">
                        <Plus className="h-4 w-4" />
                        {tc('addWord')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>{t('ignoreWord')}</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                        <div className="space-y-2">
                          <Label htmlFor="word-ignore">{tc('word')}</Label>
                          <Input
                            id="word-ignore"
                            value={newWord}
                            onChange={(e) => setNewWord(e.target.value)}
                            placeholder={tc('searchWords')}
                            required
                            className="text-lg h-12"
                            dir="auto"
                          />
                          <p className="text-sm text-slate-500">
                            {t('wordSkipped')}
                          </p>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                          <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                            {tc('cancel')}
                          </Button>
                          <Button
                            type="submit"
                            disabled={isSaving || !newWord.trim()}
                            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                          >
                            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {t('ignoreWord')}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                {ignoredWords.length > 0 && (
                  <div className="pt-2">
                    <div className="relative max-w-sm">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder={t('searchIgnored')}
                        value={searchQueryIgnored}
                        onChange={(e) => setSearchQueryIgnored(e.target.value)}
                        className="pl-9 bg-slate-50 dark:bg-slate-800"
                      />
                    </div>
                    {(searchQueryIgnored || ignoredWords.length > 10) && (
                      <p className="text-xs text-slate-500 mt-2">
                        {searchQueryIgnored
                          ? `${tc('found')} ${ignoredPagination.totalItems} ${tc('of')} ${ignoredWords.length} ${tc('words')}`
                          : tc('wordsTotal', { count: ignoredWords.length })}
                      </p>
                    )}
                  </div>
                )}

                {ignoredPagination.paginatedItems.length > 0 ? (
                  <div className="space-y-4 pt-2">
                    {/* Word Grid */}
                    <div className="grid gap-2">
                      {ignoredPagination.paginatedItems.map((item) => (
                        <div
                          key={item.id}
                          className="group flex items-center justify-between p-3 rounded-xl bg-orange-50/50 dark:bg-orange-950/20 hover:bg-orange-100/50 dark:hover:bg-orange-900/30 transition-colors border border-orange-100 dark:border-orange-900/30"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <XCircle className="h-4 w-4 text-orange-500 flex-shrink-0" />
                            <span
                              className="text-lg font-medium text-slate-900 dark:text-white truncate"
                              dir="auto"
                              style={{ fontFamily: 'var(--font-noto-khmer), sans-serif' }}
                            >
                              {item.word}
                            </span>
                            <span className="text-xs text-slate-400 hidden sm:inline">
                              {new Date(item.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(item.id, "ignore")}
                            disabled={deleteId === item.id}
                            className="h-8 w-8 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            {deleteId === item.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                    <PaginationControls
                      currentPage={ignoredPagination.currentPage}
                      totalPages={ignoredPagination.totalPages}
                      pageSize={ignoredPagination.pageSize}
                      totalItems={ignoredPagination.totalItems}
                      onPageChange={ignoredPagination.setCurrentPage}
                      onPageSizeChange={ignoredPagination.setPageSize}
                      scrollTargetRef={tableRef}
                    />
                  </div>
                ) : searchQueryIgnored ? (
                  <div className="text-center py-12">
                    <Search className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-500">{tc('noResults')}</p>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <XCircle className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-500">{t('ignoredEmpty')}</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
