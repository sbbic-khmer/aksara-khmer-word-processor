"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface SplitWordDialogProps {
  isOpen: boolean
  onClose: () => void
  initialWord: string
  initialCursorPosition: number
  onConfirm: (word1: string, word2: string) => void
}

export function SplitWordDialog({
  isOpen,
  onClose,
  initialWord,
  initialCursorPosition,
  onConfirm,
}: SplitWordDialogProps) {
  const [cursorPosition, setCursorPosition] = useState(initialCursorPosition)
  const [isSaving, setIsSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset cursor position when dialog opens with new word
  useEffect(() => {
    setCursorPosition(initialCursorPosition)
  }, [initialCursorPosition, isOpen])

  // Focus input and set cursor position when dialog opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Use setTimeout to ensure this runs after the input is fully rendered and focused
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.setSelectionRange(cursorPosition, cursorPosition)
        }
      }, 0)
      inputRef.current.focus()
    }
  }, [isOpen, cursorPosition])

  // Prevent text selection on focus, maintain cursor position
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Prevent default selection behavior
    e.preventDefault()
    // Set cursor to the current position
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.setSelectionRange(cursorPosition, cursorPosition)
      }
    }, 0)
  }

  // Track cursor position changes
  const handleCursorChange = () => {
    if (inputRef.current) {
      setCursorPosition(inputRef.current.selectionStart || 0)
    }
  }

  // Prevent any text editing while allowing cursor movement
  const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
    e.preventDefault()
    // Reset value to prevent any changes
    if (inputRef.current) {
      inputRef.current.value = initialWord
      // Restore cursor position after preventing input
      inputRef.current.setSelectionRange(cursorPosition, cursorPosition)
    }
  }

  // Prevent paste, cut, drop operations
  const handlePreventEdit = (e: React.ClipboardEvent | React.DragEvent) => {
    e.preventDefault()
  }

  // Split the word at cursor position
  const word1 = initialWord.slice(0, cursorPosition)
  const word2 = initialWord.slice(cursorPosition)

  // Check if split is valid (both parts non-empty)
  const isValidSplit = word1.length > 0 && word2.length > 0

  const handleConfirm = async () => {
    if (!isValidSplit) return

    setIsSaving(true)
    try {
      await onConfirm(word1, word2)
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && isValidSplit) {
      e.preventDefault()
      handleConfirm()
    } else if (e.key === "Escape") {
      e.preventDefault()
      onClose()
    } else if (
      // Allow cursor movement keys
      !["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)
    ) {
      // Prevent all other keyboard input (typing)
      if (e.key.length === 1 || e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault()
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Split Word</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Move cursor to set split position:
            </label>
            <input
              ref={inputRef}
              type="text"
              value={initialWord}
              onFocus={handleFocus}
              onClick={handleCursorChange}
              onKeyUp={handleCursorChange}
              onKeyDown={handleKeyDown}
              onInput={handleInput}
              onPaste={handlePreventEdit}
              onCut={handlePreventEdit}
              onDrop={handlePreventEdit}
              className="w-full px-3 py-2 text-lg border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ fontFamily: '"Noto Sans Khmer", sans-serif' }}
              dir="auto"
            />
            <p className="text-xs text-gray-500">
              Click or use arrow keys to position cursor where you want to split
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Preview:</label>
            <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
              {isValidSplit ? (
                <>
                  <span
                    className="text-lg font-medium text-blue-600 dark:text-blue-400"
                    style={{ fontFamily: '"Noto Sans Khmer", sans-serif' }}
                    dir="auto"
                  >
                    {word1}
                  </span>
                  <span className="text-gray-400">+</span>
                  <span
                    className="text-lg font-medium text-blue-600 dark:text-blue-400"
                    style={{ fontFamily: '"Noto Sans Khmer", sans-serif' }}
                    dir="auto"
                  >
                    {word2}
                  </span>
                </>
              ) : (
                <span className="text-sm text-red-500">
                  Invalid split position - both parts must be non-empty
                </span>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={!isValidSplit || isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Split Word
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
