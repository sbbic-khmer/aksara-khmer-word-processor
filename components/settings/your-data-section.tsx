"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import {
  Database,
  Download,
  FileText,
  BookOpen,
  SpellCheck,
  Mic,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Shield,
  ExternalLink,
} from "lucide-react"

interface DataSummary {
  documentCount: number
  dictionaryWordCount: number
  ignoredDictionaryWordCount: number
  spellCheckAddedCount: number
  spellCheckIgnoredCount: number
  replacementCount: number
  totalDictionaryWords: number
  totalSpellCheckWords: number
}

type ExportStatus = "idle" | "loading" | "success" | "error"

export function YourDataSection() {
  const t = useTranslations("settings.yourData")
  const [summary, setSummary] = useState<DataSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [exportStatus, setExportStatus] = useState<ExportStatus>("idle")
  const [errorMessage, setErrorMessage] = useState<string>("")

  useEffect(() => {
    fetch("/api/user/data-summary")
      .then((res) => res.json())
      .then((data) => {
        setSummary(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleExport = async () => {
    setExportStatus("loading")
    setErrorMessage("")

    try {
      const response = await fetch("/api/user/export", {
        method: "POST",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Export failed")
      }

      // Get the blob and trigger download
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url

      // Extract filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get("Content-Disposition")
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/)
      a.download = filenameMatch?.[1] || `aksara-export-${new Date().toISOString().split("T")[0]}.zip`

      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setExportStatus("success")

      // Reset success state after 3 seconds
      setTimeout(() => setExportStatus("idle"), 3000)
    } catch (error) {
      setExportStatus("error")
      setErrorMessage(error instanceof Error ? error.message : "Export failed")

      // Reset error state after 5 seconds
      setTimeout(() => {
        setExportStatus("idle")
        setErrorMessage("")
      }, 5000)
    }
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700/50 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-slate-200 dark:bg-slate-700 rounded-xl" />
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4" />
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-slate-200 dark:bg-slate-700 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700/50 shadow-sm">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex-shrink-0">
          <Database className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            {t("title")}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t("subtitle")}
          </p>
        </div>
      </div>

      {/* Data Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <DataCard
            icon={FileText}
            label={t("documents")}
            count={summary.documentCount}
            color="blue"
          />
          <DataCard
            icon={BookOpen}
            label={t("dictionaryWords")}
            count={summary.totalDictionaryWords}
            color="emerald"
          />
          <DataCard
            icon={SpellCheck}
            label={t("spellCheckWords")}
            count={summary.totalSpellCheckWords}
            color="amber"
          />
          <DataCard
            icon={Mic}
            label={t("replacements")}
            count={summary.replacementCount}
            color="purple"
          />
        </div>
      )}

      {/* Security Notice */}
      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
            <p>{t("encryptionNotice")}</p>
            <p>
              {t("dictionaryNotice")}{" "}
              <a
                href="/privacy"
                className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
              >
                {t("privacyPolicy")}
                <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Export Section */}
      <div className="border-t border-slate-200/50 dark:border-slate-700/50 pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h4 className="text-sm font-medium text-slate-900 dark:text-white">
              {t("exportTitle")}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t("exportDescription")}
            </p>
          </div>
          <Button
            onClick={handleExport}
            disabled={exportStatus === "loading"}
            className={`
              gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200
              ${exportStatus === "success"
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : exportStatus === "error"
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40"
              }
            `}
          >
            {exportStatus === "loading" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("exporting")}
              </>
            ) : exportStatus === "success" ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                {t("exported")}
              </>
            ) : exportStatus === "error" ? (
              <>
                <AlertCircle className="h-4 w-4" />
                {t("exportFailed")}
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                {t("exportButton")}
              </>
            )}
          </Button>
        </div>

        {/* Error Message */}
        {exportStatus === "error" && errorMessage && (
          <div className="mt-3 text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            {errorMessage}
          </div>
        )}

        {/* Export Info */}
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
          {t("exportInfo")}
        </p>
      </div>
    </div>
  )
}

interface DataCardProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  count: number
  color: "blue" | "emerald" | "amber" | "purple"
}

function DataCard({ icon: Icon, label, count, color }: DataCardProps) {
  const colorClasses = {
    blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
    emerald: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400",
    amber: "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400",
    purple: "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400",
  }

  return (
    <div className={`rounded-xl p-3 ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-xs font-medium truncate">{label}</span>
      </div>
      <div className="text-2xl font-bold">{count}</div>
    </div>
  )
}
