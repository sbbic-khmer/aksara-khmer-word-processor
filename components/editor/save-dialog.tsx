"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useTranslations } from "next-intl"

interface SaveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (title: string) => void
  defaultTitle?: string
}

export function SaveDialog({ open, onOpenChange, onSave, defaultTitle = "" }: SaveDialogProps) {
  const t = useTranslations("editor")
  const tc = useTranslations("common")
  const [title, setTitle] = useState(defaultTitle)

  const handleSave = () => {
    if (title.trim()) {
      onSave(title.trim())
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("saveDialog.title")}</DialogTitle>
          <DialogDescription>{t("saveDialog.description")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">{t("saveDialog.documentName")}</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("header.untitled")}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSave()
                }
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={!title.trim()}>
            {tc("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
