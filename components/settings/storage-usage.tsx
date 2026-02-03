"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { Progress } from "@/components/ui/progress"
import { HardDrive, AlertTriangle, CheckCircle2 } from "lucide-react"

interface StorageData {
  used: number
  limit: number
  usedFormatted: string
  limitFormatted: string
  percentage: number
}

export function StorageUsage() {
  const t = useTranslations('settings.storage')
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
      <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700/50 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-slate-200 dark:bg-slate-700 rounded-xl" />
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4" />
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
            </div>
          </div>
          <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full" />
        </div>
      </div>
    )
  }

  if (!storage) {
    return null
  }

  const isWarning = storage.percentage >= 80
  const isCritical = storage.percentage >= 95

  const StatusIcon = isCritical || isWarning ? AlertTriangle : CheckCircle2

  return (
    <div
      className={`
        bg-white dark:bg-slate-800/50 rounded-2xl p-6 border shadow-sm
        transition-all duration-300
        ${isCritical
          ? "border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20"
          : isWarning
            ? "border-orange-200 dark:border-orange-900/50 bg-orange-50/50 dark:bg-orange-950/20"
            : "border-slate-200/80 dark:border-slate-700/50"
        }
      `}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className={`
            p-2.5 rounded-xl flex-shrink-0
            ${isCritical
              ? "bg-red-100 dark:bg-red-900/30"
              : isWarning
                ? "bg-orange-100 dark:bg-orange-900/30"
                : "bg-slate-100 dark:bg-slate-700/50"
            }
          `}
        >
          <HardDrive
            className={`
              h-5 w-5
              ${isCritical
                ? "text-red-600 dark:text-red-400"
                : isWarning
                  ? "text-orange-600 dark:text-orange-400"
                  : "text-slate-600 dark:text-slate-400"
              }
            `}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              {t('title')}
            </h3>
            <div className="flex items-center gap-1.5">
              <StatusIcon
                className={`
                  h-4 w-4
                  ${isCritical
                    ? "text-red-500"
                    : isWarning
                      ? "text-orange-500"
                      : "text-emerald-500"
                  }
                `}
              />
              <span
                className={`
                  text-sm font-semibold
                  ${isCritical
                    ? "text-red-600 dark:text-red-400"
                    : isWarning
                      ? "text-orange-600 dark:text-orange-400"
                      : "text-slate-700 dark:text-slate-300"
                  }
                `}
              >
                {storage.percentage}%
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            {storage.usedFormatted} / {storage.limitFormatted}
          </p>

          {/* Progress bar */}
          <div className="relative">
            <Progress
              value={storage.percentage}
              className={`
                h-2 rounded-full
                ${isCritical
                  ? "[&>div]:bg-gradient-to-r [&>div]:from-red-500 [&>div]:to-red-600"
                  : isWarning
                    ? "[&>div]:bg-gradient-to-r [&>div]:from-orange-500 [&>div]:to-orange-600"
                    : "[&>div]:bg-gradient-to-r [&>div]:from-blue-500 [&>div]:to-blue-600"
                }
              `}
            />
          </div>

          {/* Warning messages */}
          {isCritical && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-3 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
              {t('almostOut')}
            </p>
          )}
          {isWarning && !isCritical && (
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-3 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
              {t('runningLow')}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
