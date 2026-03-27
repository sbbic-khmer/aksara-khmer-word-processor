"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import {
  ChevronUp,
  ChevronDown,
  X,
  CaseSensitive,
  Regex,
  Replace,
  ReplaceAll,
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface FindReplaceBarProps {
  isOpen: boolean
  showReplace: boolean
  onClose: () => void
  onToggleReplace: () => void
  findQuery: string
  onFindQueryChange: (query: string) => void
  replaceText: string
  onReplaceTextChange: (text: string) => void
  matchCase: boolean
  onToggleMatchCase: () => void
  useRegex: boolean
  onToggleRegex: () => void
  currentMatch: number
  totalMatches: number
  onNext: () => void
  onPrev: () => void
  onReplace: () => void
  onReplaceAll: () => void
}

function ToggleButton({
  pressed,
  onClick,
  tooltip,
  shortcut,
  children,
}: {
  pressed: boolean
  onClick: () => void
  tooltip: string
  shortcut?: string
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          role="switch"
          aria-checked={pressed}
          onClick={onClick}
          className={cn(
            "inline-flex items-center justify-center h-7 w-7 rounded-md transition-all duration-150",
            "hover:bg-slate-100 dark:hover:bg-slate-800",
            "focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 focus-visible:outline-none",
            pressed && "bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 shadow-sm"
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        {tooltip}
        {shortcut && <span className="ml-1 text-muted-foreground">({shortcut})</span>}
      </TooltipContent>
    </Tooltip>
  )
}

export function FindReplaceBar({
  isOpen,
  showReplace,
  onClose,
  onToggleReplace,
  findQuery,
  onFindQueryChange,
  replaceText,
  onReplaceTextChange,
  matchCase,
  onToggleMatchCase,
  useRegex,
  onToggleRegex,
  currentMatch,
  totalMatches,
  onNext,
  onPrev,
  onReplace,
  onReplaceAll,
}: FindReplaceBarProps) {
  const t = useTranslations("editor.findReplace")
  const findInputRef = useRef<HTMLInputElement>(null)
  const replaceInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Focus the find input when opening
  useEffect(() => {
    if (isOpen) {
      // Small delay to allow animation to start
      const timer = setTimeout(() => {
        findInputRef.current?.focus()
        findInputRef.current?.select()
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  const handleFindKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault()
        if (e.shiftKey) {
          onPrev()
        } else {
          onNext()
        }
      } else if (e.key === "Escape") {
        e.preventDefault()
        onClose()
      }
    },
    [onNext, onPrev, onClose]
  )

  const handleReplaceKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault()
        onReplace()
      } else if (e.key === "Escape") {
        e.preventDefault()
        onClose()
      }
    },
    [onReplace, onClose]
  )

  // Match counter text
  const matchCountText =
    totalMatches === 0
      ? findQuery
        ? t("noResults")
        : ""
      : `${currentMatch + 1} / ${totalMatches}`

  if (!isOpen) return null

  return (
    <TooltipProvider delayDuration={300}>
      <div
        ref={containerRef}
        className={cn(
          "border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900",
          "px-3 py-2 animate-in slide-in-from-top-2 fade-in duration-200"
        )}
        role="search"
        aria-label={t("findAndReplace")}
      >
        {/* Find row */}
        <div className="flex items-center gap-1.5">
          {/* Expand/collapse replace toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onToggleReplace}
                className={cn(
                  "inline-flex items-center justify-center h-7 w-7 rounded-md transition-all duration-150",
                  "hover:bg-slate-100 dark:hover:bg-slate-800",
                  "focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 focus-visible:outline-none",
                  showReplace && "rotate-90"
                )}
                aria-expanded={showReplace}
                aria-label={showReplace ? t("hideReplace") : t("showReplace")}
              >
                <ChevronDown className="h-4 w-4 transition-transform duration-150" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {showReplace ? t("hideReplace") : t("showReplace")}
              <span className="ml-1 text-muted-foreground">(⌘H)</span>
            </TooltipContent>
          </Tooltip>

          {/* Find input */}
          <div className="relative flex-1 max-w-md">
            <input
              ref={findInputRef}
              type="text"
              value={findQuery}
              onChange={(e) => onFindQueryChange(e.target.value)}
              onKeyDown={handleFindKeyDown}
              placeholder={t("findPlaceholder")}
              className={cn(
                "w-full h-8 px-3 pr-16 text-sm rounded-md border border-gray-200 dark:border-gray-700",
                "bg-white dark:bg-gray-800 text-foreground placeholder:text-muted-foreground",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                findQuery && totalMatches === 0 && "border-red-300 dark:border-red-700"
              )}
              aria-label={t("findLabel")}
            />
            {/* Match count inside input */}
            <span
              className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2 text-xs select-none pointer-events-none",
                totalMatches === 0 && findQuery
                  ? "text-red-500 dark:text-red-400"
                  : "text-muted-foreground"
              )}
            >
              {matchCountText}
            </span>
          </div>

          {/* Prev / Next */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onPrev}
                disabled={totalMatches === 0}
                className="inline-flex items-center justify-center h-7 w-7 rounded-md transition-all duration-150 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 focus-visible:outline-none"
                aria-label={t("previousMatch")}
              >
                <ChevronUp className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {t("previousMatch")}
              <span className="ml-1 text-muted-foreground">(⇧Enter)</span>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onNext}
                disabled={totalMatches === 0}
                className="inline-flex items-center justify-center h-7 w-7 rounded-md transition-all duration-150 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 focus-visible:outline-none"
                aria-label={t("nextMatch")}
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {t("nextMatch")}
              <span className="ml-1 text-muted-foreground">(Enter)</span>
            </TooltipContent>
          </Tooltip>

          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700" />

          {/* Toggle buttons */}
          <ToggleButton
            pressed={matchCase}
            onClick={onToggleMatchCase}
            tooltip={t("matchCase")}
            shortcut="⌘⌥C"
          >
            <CaseSensitive className="h-4 w-4" />
          </ToggleButton>

          <ToggleButton
            pressed={useRegex}
            onClick={onToggleRegex}
            tooltip={t("useRegex")}
            shortcut="⌘⌥R"
          >
            <Regex className="h-4 w-4" />
          </ToggleButton>

          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700" />

          {/* Close */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center h-7 w-7 rounded-md transition-all duration-150 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 focus-visible:outline-none"
                aria-label={t("close")}
              >
                <X className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {t("close")}
              <span className="ml-1 text-muted-foreground">(Esc)</span>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Replace row */}
        {showReplace && (
          <div className="flex items-center gap-1.5 mt-1.5 animate-in slide-in-from-top-1 fade-in duration-150">
            {/* Spacer to align with find input (matches the toggle chevron width) */}
            <div className="w-7 shrink-0" />

            {/* Replace input */}
            <div className="relative flex-1 max-w-md">
              <input
                ref={replaceInputRef}
                type="text"
                value={replaceText}
                onChange={(e) => onReplaceTextChange(e.target.value)}
                onKeyDown={handleReplaceKeyDown}
                placeholder={t("replacePlaceholder")}
                className={cn(
                  "w-full h-8 px-3 text-sm rounded-md border border-gray-200 dark:border-gray-700",
                  "bg-white dark:bg-gray-800 text-foreground placeholder:text-muted-foreground",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                )}
                aria-label={t("replaceLabel")}
              />
            </div>

            {/* Replace / Replace All */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onReplace}
                  disabled={totalMatches === 0}
                  className="inline-flex items-center justify-center h-7 w-7 rounded-md transition-all duration-150 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 focus-visible:outline-none"
                  aria-label={t("replace")}
                >
                  <Replace className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>{t("replace")}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onReplaceAll}
                  disabled={totalMatches === 0}
                  className="inline-flex items-center justify-center h-7 w-7 rounded-md transition-all duration-150 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 focus-visible:outline-none"
                  aria-label={t("replaceAll")}
                >
                  <ReplaceAll className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>{t("replaceAll")}</TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
