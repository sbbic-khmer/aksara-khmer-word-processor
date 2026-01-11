"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sun, Moon, Loader2, Cloud, CloudOff, FileText } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { UserMenu } from "@/components/user-menu"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

interface EditorHeaderProps {
  theme: string | undefined
  setTheme: (theme: string) => void
  mounted: boolean
  documentTitle?: string
  documentId?: string | null
  hasUnsavedChanges?: boolean
  saveStatus?: "idle" | "saving" | "saved" | "error"
  onTitleChange?: (title: string) => void
}

export function EditorHeader({
  theme,
  setTheme,
  mounted,
  documentTitle,
  documentId,
  hasUnsavedChanges,
  saveStatus = "idle",
  onTitleChange,
}: EditorHeaderProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [isMobileDialogOpen, setIsMobileDialogOpen] = useState(false)
  const [editedTitle, setEditedTitle] = useState(documentTitle || "Untitled")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setEditedTitle(documentTitle || "Untitled")
  }, [documentTitle])

  useEffect(() => {
    if (isEditingTitle && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditingTitle])

  const handleTitleClick = () => {
    if (onTitleChange) {
      setIsEditingTitle(true)
    }
  }

  const handleMobileTitleClick = () => {
    if (onTitleChange) {
      setEditedTitle(documentTitle || "Untitled")
      setIsMobileDialogOpen(true)
    }
  }

  const handleTitleSave = () => {
    const trimmed = editedTitle.trim()
    if (trimmed && trimmed !== documentTitle && onTitleChange) {
      onTitleChange(trimmed)
    } else {
      setEditedTitle(documentTitle || "Untitled")
    }
    setIsEditingTitle(false)
  }

  const handleMobileTitleSave = () => {
    const trimmed = editedTitle.trim()
    if (trimmed && onTitleChange) {
      onTitleChange(trimmed)
    }
    setIsMobileDialogOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleTitleSave()
    } else if (e.key === "Escape") {
      setEditedTitle(documentTitle || "Untitled")
      setIsEditingTitle(false)
    }
  }

  const renderSaveStatus = (compact = false) => {
    if (saveStatus === "saving" || hasUnsavedChanges) {
      return (
        <span className="text-xs text-gray-400 flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          {!compact && <span className="hidden sm:inline">Saving...</span>}
        </span>
      )
    }

    if (saveStatus === "error") {
      return <span className="text-xs text-red-500">!</span>
    }

    if (!documentId) {
      return (
        <span className="text-xs text-gray-400 flex items-center gap-1">
          <CloudOff className="h-3 w-3" />
          {!compact && <span className="hidden sm:inline">Not saved</span>}
        </span>
      )
    }

    return (
      <span className="text-xs text-gray-400 flex items-center gap-1">
        <Cloud className="h-3 w-3" />
        {!compact && <span className="hidden sm:inline">Saved</span>}
      </span>
    )
  }

  const renderDesktopTitle = () => {
    if (isEditingTitle) {
      return (
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
          <Input
            ref={inputRef}
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={handleKeyDown}
            className="h-8 w-[250px] text-lg"
            placeholder="Document title"
          />
        </div>
      )
    }

    return (
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
        <button
          onClick={handleTitleClick}
          className={cn(
            "text-md font-medium text-gray-700 dark:text-gray-200 truncate max-w-[300px]",
            "hover:text-gray-900 dark:hover:text-white",
            "transition-colors cursor-pointer text-left",
            !onTitleChange && "cursor-default",
          )}
          title={onTitleChange ? "Click to rename" : undefined}
        >
          {documentTitle || "Untitled"}
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="border-b border-gray-100 dark:border-gray-800">
        {/* Main header row */}
        <div className="flex items-center justify-between px-2 sm:px-4 py-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-3">
              {/* Logo icon */}
              <div className="relative w-10 h-10 sm:w-11 sm:h-11">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg shadow-blue-500/25" />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 via-transparent to-black/5" />
                <div className="absolute inset-[1px] rounded-[14px] border border-white/20" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white text-2xl sm:text-[26px] font-bold leading-none translate-y-[-1.5px]">
                    អ
                  </span>
                </div>
              </div>

              {/* Mobile: Title next to logo */}
              <div className="flex sm:hidden items-center gap-2 min-w-0 flex-1">
                <FileText className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                <button
                  onClick={handleMobileTitleClick}
                  className={cn(
                    "text-base font-medium text-gray-900 dark:text-white truncate text-left max-w-[180px]",
                    "active:text-blue-600 dark:active:text-blue-400",
                    !onTitleChange && "pointer-events-none",
                  )}
                >
                  {documentTitle || "Untitled"}
                </button>
                {renderSaveStatus(true)}
              </div>

              {/* Desktop: Brand text */}
              <div className="hidden sm:flex flex-col gap-0">
                <div className="flex items-baseline gap-1.5">
                  <h1
  className="flex items-baseline gap-1 text-[22px] sm:text-[26px] leading-none tracking-tight text-gray-900 dark:text-white"
  style={{ fontFamily: "var(--font-moul), serif" }}
>
  អក្សរា
  <span
    className="text-[22px] sm:text-[26px]  text-foreground"
    style={{ fontFamily: "var(--font-geist-sans), sans" }}
  >
    Pro
  </span>
</h1>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] sm:text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-[0.15em]">
                    Smart Khmer Writing
                  </span>
                </div>
              </div>
            </div>

            {/* Desktop title section */}
            <div className="hidden sm:flex items-center gap-2 ml-4 pl-4 border-l border-gray-200 dark:border-gray-700">
              {renderDesktopTitle()}
              <div className="flex items-center min-w-[80px]">{renderSaveStatus()}</div>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <TooltipProvider>
              {mounted && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                      className="h-8 w-8 p-0"
                    >
                      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}</TooltipContent>
                </Tooltip>
              )}
            </TooltipProvider>
            <UserMenu />
          </div>
        </div>
      </div>

      <Dialog open={isMobileDialogOpen} onOpenChange={setIsMobileDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename document</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              placeholder="Document title"
              className="w-full"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleMobileTitleSave()
                }
              }}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsMobileDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleMobileTitleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
