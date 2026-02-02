"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { HardDrive } from "lucide-react"

interface StorageErrorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  errorCode: "DOCUMENT_TOO_LARGE" | "STORAGE_QUOTA_EXCEEDED" | null
  errorMessage: string
  onClose: () => void
}

export function StorageErrorDialog({
  open,
  onOpenChange,
  errorCode,
  errorMessage,
  onClose,
}: StorageErrorDialogProps) {
  const title = errorCode === "DOCUMENT_TOO_LARGE"
    ? "Document Too Large"
    : "Storage Quota Exceeded"

  const suggestion = errorCode === "DOCUMENT_TOO_LARGE"
    ? "Try splitting your document into smaller parts, or remove some content to reduce the file size."
    : "Delete some existing documents to free up space, or contact support to increase your storage limit."

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <HardDrive className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription className="pt-2 space-y-3">
            <p>{errorMessage}</p>
            <p className="text-sm text-muted-foreground">{suggestion}</p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onClose} className="w-full">
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
