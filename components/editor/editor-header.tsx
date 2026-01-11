"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sun, Moon, Loader2, Cloud } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { UserMenu } from "@/components/user-menu"
import { cn } from "@/lib/utils"

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

  const handleTitleSave = () => {
    const trimmed = editedTitle.trim()
    if (trimmed && trimmed !== documentTitle && onTitleChange) {
      onTitleChange(trimmed)
    } else {
      setEditedTitle(documentTitle || "Untitled")
    }
    setIsEditingTitle(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleTitleSave()
    } else if (e.key === "Escape") {
      setEditedTitle(documentTitle || "Untitled")
      setIsEditingTitle(false)
    }
  }

  const renderSaveStatus = () => {
    // Actively saving - show spinner
    if (saveStatus === "saving" || hasUnsavedChanges) {
      return (
        <span className="text-xs text-gray-400 flex items-center gap-1.5">
          <Loader2 className="h-3 w-3 animate-spin" />
          Saving...
        </span>
      )
    }

    // Error state
    if (saveStatus === "error") {
      return <span className="text-xs text-red-500">Unable to save</span>
    }

    // New unsaved document (no ID yet)
    if (!documentId) {
      if (hasUnsavedChanges) {
        return <span className="text-xs text-gray-400">Unsaved</span>
      }
      return null // New empty document
    }

    // Existing document - saved
    return (
      <span className="text-xs text-gray-400 flex items-center gap-1.5">
        <Cloud className="h-3 w-3" />
        Saved
      </span>
    )
  }

  return (
    <div className="flex items-center justify-between px-2 sm:px-4 py-2 border-b border-gray-100 dark:border-gray-800">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-3">
          {/* Minimal abstract icon - stylized pen/writing mark */}
          <div className="relative w-10 h-10 sm:w-11 sm:h-11">
            {/* Background with subtle gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg shadow-blue-500/25" />
            {/* Glass overlay effect */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 via-transparent to-black/5" />
            {/* Inner border for depth */}
            <div className="absolute inset-[1px] rounded-[14px] border border-white/20" />
            {/* Stylized អ character */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white text-2xl sm:text-[26px] font-bold leading-none translate-y-[-1.5px]">អ</span>
            </div>
          </div>

          {/* Text lockup */}
          <div className="flex flex-col gap-0">
            <div className="flex items-baseline gap-1.5">
              <h1
                className="text-[22px] sm:text-[26px] leading-none text-gray-900 dark:text-white tracking-tight"
                style={{ fontFamily: "var(--font-moul), serif" }}
              >
                អក្សរា
              </h1>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] sm:text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-[0.15em] hidden sm:block">
                Smart Khmer Writing
              </span>
            </div>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 ml-4 pl-4 border-l border-gray-200 dark:border-gray-700">
          {isEditingTitle ? (
            <Input
              ref={inputRef}
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={handleKeyDown}
              className="h-7 w-[200px] text-sm"
              placeholder="Document title"
            />
          ) : (
            <button
              onClick={handleTitleClick}
              className={cn(
                "text-sm text-gray-600 dark:text-gray-300 max-w-[200px] truncate",
                "hover:text-gray-900 dark:hover:text-white hover:underline",
                "transition-colors cursor-pointer text-left",
                !onTitleChange && "cursor-default hover:no-underline",
              )}
              title={onTitleChange ? "Click to rename" : undefined}
            >
              {documentTitle || "Untitled"}
            </button>
          )}

          <div className="flex items-center min-w-[80px]">{renderSaveStatus()}</div>
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        {/* Theme toggle */}
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
  )
}
