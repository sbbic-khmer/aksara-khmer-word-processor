"use client"

import { useState, useCallback, useRef } from "react"
import useSWR from "swr"
import { usePagination, PaginationControls } from "@/components/settings/pagination-controls"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Loader2, Search, TrendingUp } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface AddedWord {
  word: string
  user_count: number
  first_added: string
  last_added: string
}

interface AdminSpellCheckResponse {
  added: AddedWord[]
  ignored: any[]
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function SpellCheckAddedWordsTab() {
  const { data, error, isLoading } = useSWR<AdminSpellCheckResponse>(
    "/api/admin/spell-check/custom-words",
    fetcher,
    { refreshInterval: 30000 }
  )

  const [searchQuery, setSearchQuery] = useState("")
  const tableRef = useRef<HTMLDivElement>(null)

  const addedWords = data?.added || []

  const searchFilter = useCallback(
    (item: AddedWord, query: string) => item.word.toLowerCase().includes(query),
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
    items: addedWords,
    searchQuery,
    searchFilter,
  })

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
          Failed to load spell check added words
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Alert>
        <TrendingUp className="h-4 w-4" />
        <AlertDescription>
          These words have been added to user spell check dictionaries. Words with higher user counts may be candidates
          for inclusion in the master Khmer dictionary. Ranking shows how many users have added each word.
        </AlertDescription>
      </Alert>

      <div ref={tableRef}>
      <Card>
        <CardHeader>
          <CardTitle>Spell Check Added Words</CardTitle>
          <CardDescription>
            Aggregated view of words users have added to their spell check dictionaries, ranked by popularity
          </CardDescription>
        </CardHeader>
        <CardContent>
          {addedWords.length > 0 && (
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
              {(searchQuery || addedWords.length > 10) && (
                <p className="text-sm text-gray-500 mt-2">
                  {searchQuery
                    ? `Found ${totalItems} of ${addedWords.length} words`
                    : `${addedWords.length} words total`}
                </p>
              )}
            </div>
          )}

          {paginatedItems.length > 0 ? (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Rank</TableHead>
                    <TableHead>Word</TableHead>
                    <TableHead className="text-right">Users</TableHead>
                    <TableHead>First Added</TableHead>
                    <TableHead>Last Added</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.map((item, index) => (
                    <TableRow key={item.word}>
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
                        <span className="inline-flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900 px-2.5 py-0.5 text-sm font-medium text-blue-800 dark:text-blue-200">
                          {item.user_count}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-500 text-sm">
                        {new Date(item.first_added).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-gray-500 text-sm">
                        {new Date(item.last_added).toLocaleDateString()}
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
            <div className="text-center py-8 text-gray-500">
              No words found matching "{searchQuery}"
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No spell check added words yet
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  )
}
