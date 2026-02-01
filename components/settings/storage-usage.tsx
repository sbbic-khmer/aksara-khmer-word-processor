"use client"

import { useEffect, useState } from "react"
import { Progress } from "@/components/ui/progress"

interface StorageData {
  used: number
  limit: number
  usedFormatted: string
  limitFormatted: string
  percentage: number
}

export function StorageUsage() {
  const [storage, setStorage] = useState<StorageData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/user/storage")
      .then((res) => res.json())
      .then((data) => {
        setStorage(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    )
  }

  if (!storage) {
    return null
  }

  const isWarning = storage.percentage >= 80
  const isCritical = storage.percentage >= 95

  return (
    <div className="space-y-2 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">Storage Used</span>
        <span
          className={`text-sm font-medium ${
            isCritical
              ? "text-red-600 dark:text-red-400"
              : isWarning
                ? "text-orange-600 dark:text-orange-400"
                : "text-gray-600 dark:text-gray-400"
          }`}
        >
          {storage.usedFormatted} / {storage.limitFormatted} ({storage.percentage}%)
        </span>
      </div>
      <Progress
        value={storage.percentage}
        className={
          isCritical
            ? "[&>div]:bg-red-500"
            : isWarning
              ? "[&>div]:bg-orange-500"
              : ""
        }
      />
      {isCritical && (
        <p className="text-xs text-red-600 dark:text-red-400">
          You&apos;re almost out of storage! Delete some documents to free up space.
        </p>
      )}
      {isWarning && !isCritical && (
        <p className="text-xs text-orange-600 dark:text-orange-400">
          You&apos;re running low on storage. Consider deleting unused documents.
        </p>
      )}
    </div>
  )
}
