"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Lock, BookOpen, Shield, ExternalLink } from "lucide-react"

interface DataTransparencyNoticeProps {
  hasSeenNotice: boolean
  onDismiss: () => void
}

export function DataTransparencyNotice({
  hasSeenNotice,
  onDismiss,
}: DataTransparencyNoticeProps) {
  const t = useTranslations("dataNotice")
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    // Show the notice if user hasn't seen it
    if (!hasSeenNotice) {
      // Small delay to let the page load first
      const timer = setTimeout(() => setIsOpen(true), 500)
      return () => clearTimeout(timer)
    }
  }, [hasSeenNotice])

  const handleDismiss = async () => {
    setIsSubmitting(true)
    try {
      // Update preferences to mark notice as seen
      await fetch("/api/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ has_seen_data_notice: true }),
      })
      setIsOpen(false)
      onDismiss()
    } catch (error) {
      console.error("Failed to save notice acknowledgment:", error)
      // Still close the dialog even if save fails
      setIsOpen(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (hasSeenNotice) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>{t("subtitle")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Documents are private */}
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex-shrink-0">
              <Lock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {t("documentsPrivate.title")}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t("documentsPrivate.description")}
              </p>
            </div>
          </div>

          {/* Dictionary helps improve Aksara */}
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex-shrink-0">
              <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {t("dictionaryHelps.title")}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t("dictionaryHelps.description")}
              </p>
            </div>
          </div>

          {/* We never share */}
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 mt-4">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {t("neverShare")}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            asChild
            className="gap-1.5"
          >
            <a href="/privacy" target="_blank" rel="noopener noreferrer">
              {t("readPolicy")}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
          <Button
            onClick={handleDismiss}
            disabled={isSubmitting}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
          >
            {isSubmitting ? t("saving") : t("gotIt")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
