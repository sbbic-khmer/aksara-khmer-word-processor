"use client"

import { useState, useCallback, useRef } from "react"
import useSWR from "swr"
import { usePagination, PaginationControls } from "@/components/settings/pagination-controls"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Loader2, Search, Info } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface IgnoredWord {
  word: string
  user_count: number
  first_added: string
  last_added: string
}

interface AdminSpellCheckResponse {
  added: any[]
  ignored: IgnoredWord[]
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function SpellCheckIgnoredWordsTab() {
  const { data, error, isLoading } = useSWR<AdminSpellCheckResponse>(
    "/api/admin/spell-check/custom-words",
    fetcher,
    { refreshInterval: 30000 }
  )

  const [searchQuery, setSearchQuery] = useState("")
  const tableRef = useRef<HTMLDivElement>(null)

  const ignoredWords = data?.ignored || []

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
    items: ignoredWords,
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
          Failed to load spell check ignored words
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          These words have been marked as "ignored" in user spell check settings. Words with high user counts may
          indicate terms that are frequently flagged incorrectly or specialized vocabulary that should be reviewed
          for potential addition to the master dictionary.
        </AlertDescription>
      </Alert>

      <div ref={tableRef}>
      <Card>
        <CardHeader>
          <CardTitle>Spell Check Ignored Words</CardTitle>
          <CardDescription>
            Aggregated view of words users have chosen to ignore during spell checking, ranked by frequency
          </CardDescription>
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
                    <TableHead className="w-[60px]">Rank</TableHead>
                    <TableHead>Word</TableHead>
                    <TableHead className="text-right">Users</TableHead>
                    <TableHead>First Ignored</TableHead>
                    <TableHead>Last Ignored</TableHead>
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
                        <span className="inline-flex items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900 px-2.5 py-0.5 text-sm font-medium text-amber-800 dark:text-amber-200">
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
              No spell check ignored words yet
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  )
}
