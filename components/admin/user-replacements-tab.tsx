"use client"

import { useState, useCallback, useRef } from "react"
import useSWR from "swr"
import { usePagination, PaginationControls } from "@/components/settings/pagination-controls"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ArrowUp, Loader2, Check, Search } from "lucide-react"

interface UserReplacement {
  id: string
  user_id: string
  incorrect_word: string
  correct_word: string
  notes: string | null
  promoted_to_master: boolean
  user_email: string
  user_name: string | null
  created_at: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function UserReplacementsTab() {
  const { data, error, isLoading, mutate } = useSWR<UserReplacement[]>("/api/admin/user-replacements", fetcher)
  const [promotingId, setPromotingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const tableRef = useRef<HTMLDivElement>(null)

  const searchFilter = useCallback(
    (item: UserReplacement, query: string) =>
      item.incorrect_word.toLowerCase().includes(query) ||
      item.correct_word.toLowerCase().includes(query) ||
      (item.notes && item.notes.toLowerCase().includes(query)) ||
      item.user_email.toLowerCase().includes(query) ||
      (item.user_name && item.user_name.toLowerCase().includes(query)),
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

  const handlePromote = async (id: string) => {
    setPromotingId(id)
    try {
      const response = await fetch("/api/admin/replacements/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_replacement_id: id }),
      })
      if (response.ok) {
        mutate()
      }
    } finally {
      setPromotingId(null)
    }
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
        <CardContent className="py-8 text-center text-red-500">Failed to load user replacements</CardContent>
      </Card>
    )
  }

  return (
    <div ref={tableRef}>
    <Card>
      <CardHeader>
        <CardTitle>User Submitted Replacements</CardTitle>
        <p className="text-sm text-gray-500">Review and promote user submissions to the master table</p>
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
                  ? `Found ${totalItems} of ${data.length} submissions`
                  : `${data.length} submissions total`}
              </p>
            )}
          </div>
        )}
        {paginatedItems.length > 0 ? (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Incorrect</TableHead>
                  <TableHead>Correct</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.user_name || "Unknown"}</div>
                        <div className="text-sm text-gray-500">{item.user_email}</div>
                      </div>
                    </TableCell>
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
                    <TableCell>
                      {item.promoted_to_master ? (
                        <Badge variant="secondary" className="gap-1">
                          <Check className="h-3 w-3" />
                          Promoted
                        </Badge>
                      ) : (
                        <Badge variant="outline">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {!item.promoted_to_master && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePromote(item.id)}
                          disabled={promotingId === item.id}
                          className="gap-1"
                        >
                          {promotingId === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ArrowUp className="h-4 w-4" />
                          )}
                          Promote
                        </Button>
                      )}
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
          <div className="text-center py-8 text-gray-500">No submissions found matching "{searchQuery}"</div>
        ) : (
          <div className="text-center py-8 text-gray-500">No user submissions yet.</div>
        )}
      </CardContent>
    </Card>
    </div>
  )
}
