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
import { AlertTriangle } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface ConflictDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  serverUpdatedAt: string
  onOverwrite: () => void
  onReload: () => void
  onCancel: () => void
}

export function ConflictDialog({
  open,
  onOpenChange,
  serverUpdatedAt,
  onOverwrite,
  onReload,
  onCancel,
}: ConflictDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            Document Modified Elsewhere
          </DialogTitle>
          <DialogDescription className="pt-2">
            This document was modified on another device or browser tab{" "}
            <strong>{formatDistanceToNow(new Date(serverUpdatedAt), { addSuffix: true })}</strong>.
            <br />
            <br />
            What would you like to do?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button variant="destructive" onClick={onOverwrite} className="w-full">
            Overwrite with my changes
          </Button>
          <Button variant="outline" onClick={onReload} className="w-full bg-transparent">
            Reload the newer version (discard my changes)
          </Button>
          <Button variant="ghost" onClick={onCancel} className="w-full">
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
