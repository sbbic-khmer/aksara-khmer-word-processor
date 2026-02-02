"use client"

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { $getRoot, $isTextNode } from "lexical"
import { useEffect, useRef, useCallback } from "react"
import { $isKhmerBreakNode } from "../nodes/khmer-break-node"
import type { KhmerBreaker } from "@/lib/khmer-breaker"
import { isDebugEnabled } from "@/lib/debug"

interface OnChangePluginProps {
  onChange: (text: string, wordCount: number, charCount: number) => void
  onContentChange?: () => void
  breaker?: KhmerBreaker
}

const WJ = "\u2060"
const ZWSP = "\u200B"

// Debounce delay for word count calculation (expensive beam search)
const WORD_COUNT_DEBOUNCE_MS = 500

// Simple approximation of Khmer word count without beam search
// Counts text nodes (which correspond to words after segmentation)
function approximateWordCount(root: ReturnType<typeof $getRoot>): number {
  let count = 0
  const children = root.getChildren()
  for (const paragraph of children) {
    if (paragraph.getChildren) {
      for (const node of paragraph.getChildren()) {
        if ($isTextNode(node)) {
          const text = node.getTextContent().trim()
          if (text && !/^\s+$/.test(text)) {
            count++
          }
        }
      }
    }
  }
  return count
}

export function OnChangePlugin({ onChange, onContentChange, breaker }: OnChangePluginProps) {
  const [editor] = useLexicalComposerContext()
  const previousTextRef = useRef<string | null>(null)
  const wordCountTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastWordCountRef = useRef<number>(0)
  const onChangeRef = useRef(onChange)

  // Keep onChange ref up to date
  onChangeRef.current = onChange

  // Debounced word count calculation using beam search
  const scheduleWordCount = useCallback((text: string, charCount: number) => {
    if (wordCountTimerRef.current) {
      clearTimeout(wordCountTimerRef.current)
    }

    wordCountTimerRef.current = setTimeout(() => {
      wordCountTimerRef.current = null

      // Run beam search for accurate word count
      if (breaker && text.trim()) {
        const segments = breaker.getSegments(text)
        const wordCount = segments.filter((s) => s.trim() && !/^\s+$/.test(s)).length
        lastWordCountRef.current = wordCount
        onChangeRef.current(text, wordCount, charCount)
      }
    }, WORD_COUNT_DEBOUNCE_MS)
  }, [breaker])

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const root = $getRoot()
        let text = ""

        // Walk through all nodes to build plain text
        const children = root.getChildren()
        children.forEach((node, index) => {
          const nodeText = extractTextFromNode(node)
          text += nodeText
          // Add newline between paragraphs
          if (index < children.length - 1) {
            text += "\n"
          }
        })

        // Remove Word Joiners and ZWSP for counting
        const textWithoutWJ = text.replace(new RegExp(WJ, "g"), "").replace(new RegExp(ZWSP, "g"), "")

        const charCount = textWithoutWJ.length

        // Use fast approximate word count for immediate feedback
        // The accurate count will be calculated after debounce
        const approximateCount = approximateWordCount(root)

        // Use the last accurate count if available, otherwise use approximate
        const wordCount = lastWordCountRef.current > 0 ? lastWordCountRef.current : approximateCount

        onChange(text, wordCount, charCount)

        // Schedule accurate word count calculation (debounced)
        scheduleWordCount(textWithoutWJ, charCount)

        // Use null as initial state to ensure first change after load is detected
        const hasActualChange = previousTextRef.current !== null && textWithoutWJ !== previousTextRef.current

        if (isDebugEnabled()) {
          console.log("[OnChangePlugin] Update listener fired:", {
            previousTextLength: previousTextRef.current?.length ?? "null",
            currentTextLength: textWithoutWJ.length,
            hasActualChange,
            willTriggerContentChange: hasActualChange && !!onContentChange,
          })
        }

        if (hasActualChange && onContentChange) {
          if (isDebugEnabled()) {
            console.log("[OnChangePlugin] Calling onContentChange()")
          }
          onContentChange()
        }

        // Always update the previous text ref
        previousTextRef.current = textWithoutWJ
      })
    })
  }, [editor, onChange, onContentChange, breaker, scheduleWordCount])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (wordCountTimerRef.current) {
        clearTimeout(wordCountTimerRef.current)
      }
    }
  }, [])

  return null
}

function extractTextFromNode(node: any): string {
  if ($isTextNode(node)) {
    return node.getTextContent()
  }

  if ($isKhmerBreakNode(node)) {
    return "" // Break markers don't contribute to text
  }

  // Recursively get text from children
  if (node.getChildren) {
    return node
      .getChildren()
      .map((child: any) => extractTextFromNode(child))
      .join("")
  }

  return ""
}
