"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertTriangle,
  Trash2,
  Loader2,
  FileText,
  BookOpen,
  Settings,
  Download,
} from "lucide-react"
import { signOut } from "@/lib/auth-client"

interface DataSummary {
  documentCount: number
  totalDictionaryWords: number
  totalSpellCheckWords: number
  replacementCount: number
}

type DeleteStatus = "idle" | "loading" | "error"

export function DangerZoneSection() {
  const t = useTranslations("settings.dangerZone")
  const router = useRouter()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [confirmation, setConfirmation] = useState("")
  const [deleteStatus, setDeleteStatus] = useState<DeleteStatus>("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const [dataSummary, setDataSummary] = useState<DataSummary | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(false)

  const handleOpenDialog = async () => {
    setConfirmation("")
    setDeleteStatus("idle")
    setErrorMessage("")
    setIsDialogOpen(true)

    // Fetch data summary to show what will be deleted
    setLoadingSummary(true)
    try {
      const response = await fetch("/api/user/data-summary")
      if (response.ok) {
        const data = await response.json()
        setDataSummary(data)
      }
    } catch {
      // Ignore - summary is not critical
    } finally {
      setLoadingSummary(false)
    }
  }

  const handleDelete = async () => {
    if (confirmation !== "DELETE") return

    setDeleteStatus("loading")
    setErrorMessage("")

    try {
      const response = await fetch("/api/user/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "DELETE" }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Deletion failed")
      }

      // Sign out and redirect to home
      await signOut()
      router.push("/")
    } catch (error) {
      setDeleteStatus("error")
      setErrorMessage(error instanceof Error ? error.message : "Deletion failed")
    }
  }

  const isDeleteEnabled = confirmation === "DELETE" && deleteStatus !== "loading"

  return (
    <>
      <div className="bg-red-50/50 dark:bg-red-950/20 rounded-2xl p-6 border border-red-200/80 dark:border-red-900/50">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div className="p-2.5 rounded-xl bg-red-100 dark:bg-red-900/30 flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-red-900 dark:text-red-100">
              {t("title")}
            </h3>
            <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
              {t("subtitle")}
            </p>
          </div>
        </div>

        {/* Warning text */}
        <div className="bg-white/50 dark:bg-slate-900/50 rounded-xl p-4 mb-4">
          <p className="text-sm text-red-800 dark:text-red-200">
            {t("warning")}
          </p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-2 flex items-center gap-1.5">
            <Download className="h-3.5 w-3.5 flex-shrink-0" />
            {t("exportFirst")}
          </p>
        </div>

        {/* Delete button */}
        <Button
          variant="destructive"
          onClick={handleOpenDialog}
          className="gap-2 bg-red-600 hover:bg-red-700 text-white"
        >
          <Trash2 className="h-4 w-4" />
          {t("deleteButton")}
        </Button>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
              {t("modal.title")}
            </DialogTitle>
            <DialogDescription className="text-left">
              {t("modal.description")}
            </DialogDescription>
          </DialogHeader>

          {/* What will be deleted */}
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              {t("modal.willDelete")}
            </p>
            <ul className="space-y-1.5 text-sm text-slate-600 dark:text-slate-400">
              <li className="flex items-center gap-2">
                <Settings className="h-3.5 w-3.5 text-slate-400" />
                {t("modal.account")}
              </li>
              <li className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-slate-400" />
                {loadingSummary ? (
                  <span className="text-slate-400">{t("modal.loadingCount")}</span>
                ) : (
                  t("modal.documents", { count: dataSummary?.documentCount ?? 0 })
                )}
              </li>
              <li className="flex items-center gap-2">
                <BookOpen className="h-3.5 w-3.5 text-slate-400" />
                {t("modal.dictionaryData")}
              </li>
              <li className="flex items-center gap-2">
                <Settings className="h-3.5 w-3.5 text-slate-400" />
                {t("modal.preferences")}
              </li>
            </ul>
          </div>

          {/* Confirmation input */}
          <div className="space-y-2">
            <label
              htmlFor="confirmation"
              className="text-sm font-medium text-slate-900 dark:text-white"
            >
              {t("modal.typeDelete")}
            </label>
            <Input
              id="confirmation"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder="DELETE"
              className="font-mono"
              disabled={deleteStatus === "loading"}
            />
          </div>

          {/* Error message */}
          {deleteStatus === "error" && errorMessage && (
            <div className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
              {errorMessage}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={deleteStatus === "loading"}
            >
              {t("modal.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={!isDeleteEnabled}
              className="gap-2"
            >
              {deleteStatus === "loading" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("modal.deleting")}
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  {t("modal.deleteButton")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
