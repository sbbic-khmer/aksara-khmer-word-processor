"use client"

import type React from "react"
import { useState, useCallback, useRef } from "react"
import { useTranslations } from "next-intl"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Plus, Pencil, Trash2, Loader2, Info, Search, ArrowRight, RefreshCw } from "lucide-react"
import { usePagination, PaginationControls } from "./pagination-controls"

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
  const t = useTranslations('settings.replacements')
  const tc = useTranslations('common')
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
  const tableRef = useRef<HTMLDivElement>(null)

  const replacements = data || []

  const searchFilter = useCallback(
    (item: UserReplacement, query: string) =>
      item.incorrect_word.toLowerCase().includes(query) ||
      item.correct_word.toLowerCase().includes(query) ||
      (item.notes && item.notes.toLowerCase().includes(query)),
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
    items: replacements,
    searchQuery,
    searchFilter,
  })

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
              <div className="p-2 rounded-xl bg-violet-100 dark:bg-violet-900/30">
                <RefreshCw className="h-5 w-5 text-violet-600 dark:text-violet-400" />
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
                <Button onClick={openAdd} className="gap-2 bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700 shadow-lg shadow-violet-500/25">
                  <Plus className="h-4 w-4" />
                  {t('addButton')}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingItem ? t('editTitle') : t('addTitle')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="incorrect">{t('incorrectWord')}</Label>
                    <Input
                      id="incorrect"
                      value={formData.incorrect_word}
                      onChange={(e) => setFormData({ ...formData, incorrect_word: e.target.value })}
                      placeholder={t('incorrectPlaceholder')}
                      required
                      className="text-lg h-12"
                      dir="auto"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="correct">{t('correctWord')}</Label>
                    <Input
                      id="correct"
                      value={formData.correct_word}
                      onChange={(e) => setFormData({ ...formData, correct_word: e.target.value })}
                      placeholder={t('correctPlaceholder')}
                      required
                      className="text-lg h-12"
                      dir="auto"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">{t('notesLabel')}</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder={t('notesPlaceholder')}
                      rows={3}
                      className="resize-none"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                      {tc('cancel')}
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSaving}
                      className="bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700"
                    >
                      {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {editingItem ? tc('saveChanges') : t('addButton')}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search */}
        {replacements.length > 0 && (
          <div className="px-6 py-4 border-b border-slate-200/80 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder={t('searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white dark:bg-slate-800"
              />
            </div>
            {(searchQuery || replacements.length > 10) && (
              <p className="text-xs text-slate-500 mt-2">
                {searchQuery
                  ? `${tc('found')} ${totalItems} ${tc('of')} ${replacements.length}`
                  : `${replacements.length} ${tc('total')}`}
              </p>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          {paginatedItems.length > 0 ? (
            <div className="space-y-4">
              {/* Replacement Grid */}
              <div className="grid gap-3">
                {paginatedItems.map((item) => (
                  <div
                    key={item.id}
                    className="group p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Incorrect word */}
                        <div className="flex-1 min-w-0">
                          <span
                            className="text-lg font-medium text-red-600 dark:text-red-400 line-through decoration-red-400/50"
                            dir="auto"
                            style={{ fontFamily: 'var(--font-noto-khmer), sans-serif' }}
                          >
                            {item.incorrect_word}
                          </span>
                        </div>

                        {/* Arrow */}
                        <ArrowRight className="h-4 w-4 text-slate-400 flex-shrink-0" />

                        {/* Correct word */}
                        <div className="flex-1 min-w-0">
                          <span
                            className="text-lg font-medium text-emerald-600 dark:text-emerald-400"
                            dir="auto"
                            style={{ fontFamily: 'var(--font-noto-khmer), sans-serif' }}
                          >
                            {item.correct_word}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(item)}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                          disabled={deleteId === item.id}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          {deleteId === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Notes (if any) */}
                    {item.notes && (
                      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 truncate">
                        {item.notes}
                      </p>
                    )}
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
              <RefreshCw className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
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
