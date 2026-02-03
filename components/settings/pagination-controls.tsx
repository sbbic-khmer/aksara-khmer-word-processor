"use client"

import { useMemo, useState, useCallback, useEffect, useRef, type RefObject } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const
const DEFAULT_PAGE_SIZE = 25

interface UsePaginationOptions<T> {
  items: T[]
  searchQuery?: string
  searchFilter?: (item: T, query: string) => boolean
}

interface UsePaginationResult<T> {
  paginatedItems: T[]
  filteredItems: T[]
  currentPage: number
  pageSize: number
  totalPages: number
  totalItems: number
  setCurrentPage: (page: number) => void
  setPageSize: (size: number) => void
  goToFirstPage: () => void
  goToLastPage: () => void
  goToNextPage: () => void
  goToPreviousPage: () => void
}

export function usePagination<T>({
  items,
  searchQuery = "",
  searchFilter,
}: UsePaginationOptions<T>): UsePaginationResult<T> {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  // Ensure items is always an array (API might return error object)
  const safeItems = Array.isArray(items) ? items : []

  // Track previous values to detect changes
  const prevSearchQueryRef = useRef(searchQuery)
  const prevItemsLengthRef = useRef(safeItems.length)

  // Filter items based on search
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim() || !searchFilter) return safeItems
    const query = searchQuery.toLowerCase().trim()
    return safeItems.filter((item) => searchFilter(item, query))
  }, [safeItems, searchQuery, searchFilter])

  // Calculate total pages
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize))

  // Reset to page 1 when search query changes or items change significantly
  useEffect(() => {
    const searchChanged = prevSearchQueryRef.current !== searchQuery
    const itemsChanged = prevItemsLengthRef.current !== safeItems.length

    if (searchChanged || itemsChanged) {
      setCurrentPage(1)
    }

    prevSearchQueryRef.current = searchQuery
    prevItemsLengthRef.current = safeItems.length
  }, [searchQuery, safeItems.length])

  // Ensure current page doesn't exceed total pages
  const safeCurrentPage = Math.min(currentPage, totalPages)

  // Sync state if safeCurrentPage differs from currentPage
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  // Get paginated items
  const paginatedItems = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize
    return filteredItems.slice(startIndex, startIndex + pageSize)
  }, [filteredItems, safeCurrentPage, pageSize])

  const goToFirstPage = useCallback(() => setCurrentPage(1), [])
  const goToLastPage = useCallback(() => setCurrentPage(totalPages), [totalPages])
  const goToNextPage = useCallback(
    () => setCurrentPage((p) => Math.min(p + 1, totalPages)),
    [totalPages]
  )
  const goToPreviousPage = useCallback(
    () => setCurrentPage((p) => Math.max(p - 1, 1)),
    []
  )

  const handleSetPageSize = useCallback((size: number) => {
    setPageSize(size)
    setCurrentPage(1)
  }, [])

  // Wrap setCurrentPage to ensure it stays within bounds
  const handleSetCurrentPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }, [totalPages])

  return {
    paginatedItems,
    filteredItems,
    currentPage: safeCurrentPage,
    pageSize,
    totalPages,
    totalItems: filteredItems.length,
    setCurrentPage: handleSetCurrentPage,
    setPageSize: handleSetPageSize,
    goToFirstPage,
    goToLastPage,
    goToNextPage,
    goToPreviousPage,
  }
}

interface PaginationControlsProps {
  currentPage: number
  totalPages: number
  pageSize: number
  totalItems: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  scrollTargetRef?: RefObject<HTMLElement | null>
}

export function PaginationControls({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  scrollTargetRef,
}: PaginationControlsProps) {
  // Don't show pagination if there's only one page
  if (totalItems <= PAGE_SIZE_OPTIONS[0]) {
    return null
  }

  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalItems)

  const handlePageChange = (page: number) => {
    onPageChange(page)
    // Scroll to the target element after React re-renders
    if (scrollTargetRef?.current) {
      const element = scrollTargetRef.current
      // Use requestAnimationFrame to ensure scroll happens after DOM update
      requestAnimationFrame(() => {
        const headerOffset = 80 // Account for any fixed headers
        const elementPosition = element.getBoundingClientRect().top
        const offsetPosition = elementPosition + window.scrollY - headerOffset

        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth"
        })
      })
    }
  }

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = []
    const maxVisiblePages = 5

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      pages.push(1)

      if (currentPage > 3) {
        pages.push("ellipsis")
      }

      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      if (currentPage < totalPages - 2) {
        pages.push("ellipsis")
      }

      pages.push(totalPages)
    }

    return pages
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-5 mt-2 border-t border-slate-200/80 dark:border-slate-700/50">
      {/* Left side: showing count + per page selector */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-slate-500 dark:text-slate-400">
          <span className="font-medium text-slate-700 dark:text-slate-300">{startItem}-{endItem}</span>
          {" "}of{" "}
          <span className="font-medium text-slate-700 dark:text-slate-300">{totalItems}</span>
        </span>
        <div className="flex items-center gap-2">
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => onPageSizeChange(parseInt(value))}
          >
            <SelectTrigger className="w-[72px] h-8 text-sm bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-slate-400 dark:text-slate-500 hidden sm:inline">per page</span>
        </div>
      </div>

      {/* Right side: page navigation */}
      <div className="flex items-center gap-1">
        {/* Previous button */}
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`
            flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
            ${currentPage === 1
              ? "text-slate-300 dark:text-slate-600 cursor-not-allowed"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            }
          `}
          aria-label="Go to previous page"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span className="hidden sm:inline">Prev</span>
        </button>

        {/* Page numbers - hidden on mobile */}
        <div className="hidden sm:flex items-center gap-1">
          {getPageNumbers().map((page, index) =>
            page === "ellipsis" ? (
              <span
                key={`ellipsis-${index}`}
                className="w-9 h-9 flex items-center justify-center text-slate-400 dark:text-slate-500"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="6" cy="12" r="1.5" />
                  <circle cx="12" cy="12" r="1.5" />
                  <circle cx="18" cy="12" r="1.5" />
                </svg>
              </span>
            ) : (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`
                  w-9 h-9 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer
                  ${currentPage === page
                    ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/25"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                  }
                `}
                aria-current={currentPage === page ? "page" : undefined}
              >
                {page}
              </button>
            )
          )}
        </div>

        {/* Mobile: page indicator */}
        <div className="flex sm:hidden items-center px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{currentPage}</span>
          <span className="text-sm text-slate-400 dark:text-slate-500 mx-1">/</span>
          <span className="text-sm text-slate-500 dark:text-slate-400">{totalPages}</span>
        </div>

        {/* Next button */}
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`
            flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
            ${currentPage === totalPages
              ? "text-slate-300 dark:text-slate-600 cursor-not-allowed"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            }
          `}
          aria-label="Go to next page"
        >
          <span className="hidden sm:inline">Next</span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  )
}
