"use client"

import type React from "react"
import { useState, useCallback, useRef } from "react"
import { useTranslations } from "next-intl"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Plus, Trash2, Loader2, Info, Search, BookOpen } from "lucide-react"
import { usePagination, PaginationControls } from "./pagination-controls"

interface DictionaryWord {
  id: string
  word: string
  created_at: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function UserDictionaryManager() {
  const t = useTranslations('settings.dictionary')
  const tc = useTranslations('common')
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
    totalPages,
    totalItems,
    currentPage,
    pageSize,
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                <BookOpen className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  {t('title')}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t('description')}
                </p>
              </div>
            </div>
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button onClick={openAdd} className="gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-lg shadow-emerald-500/25">
                  <Plus className="h-4 w-4" />
                  {tc('addWord')}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{t('addTitle')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="word">{t('wordLabel')}</Label>
                    <Input
                      id="word"
                      value={newWord}
                      onChange={(e) => setNewWord(e.target.value)}
                      placeholder={t('wordPlaceholder')}
                      required
                      className="text-lg h-12"
                      dir="auto"
                    />
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
        </div>

        {/* Search */}
        {words.length > 0 && (
          <div className="px-6 py-4 border-b border-slate-200/80 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder={tc('searchWords')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white dark:bg-slate-800"
              />
            </div>
            {(searchQuery || words.length > 10) && (
              <p className="text-xs text-slate-500 mt-2">
                {searchQuery
                  ? `${tc('found')} ${totalItems} ${tc('of')} ${words.length} ${tc('words')}`
                  : tc('wordsTotal', { count: words.length })}
              </p>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          {paginatedItems.length > 0 ? (
            <div className="space-y-4">
              {/* Word Grid */}
              <div className="grid gap-2">
                {paginatedItems.map((item) => (
                  <div
                    key={item.id}
                    className="group flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
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
                      onClick={() => handleDelete(item.id)}
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
            <div className="text-center py-12">
              <Search className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-slate-500">{t('noMatch', { query: searchQuery })}</p>
            </div>
          ) : (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-slate-500 max-w-sm mx-auto">
                {t('emptyState')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
