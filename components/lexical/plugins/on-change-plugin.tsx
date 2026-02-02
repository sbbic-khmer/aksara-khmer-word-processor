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

// Timeout for requestIdleCallback to ensure it eventually runs
const IDLE_CALLBACK_TIMEOUT_MS = 1000

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

// requestIdleCallback with fallback for Safari
const requestIdle =
  typeof requestIdleCallback !== "undefined"
    ? requestIdleCallback
    : (cb: IdleRequestCallback) => setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 50 } as IdleDeadline), 1)

const cancelIdle =
  typeof cancelIdleCallback !== "undefined"
    ? cancelIdleCallback
    : clearTimeout

export function OnChangePlugin({ onChange, onContentChange, breaker }: OnChangePluginProps) {
  const [editor] = useLexicalComposerContext()
  const previousTextRef = useRef<string | null>(null)
  const idleCallbackRef = useRef<number | ReturnType<typeof setTimeout> | null>(null)
  const lastWordCountRef = useRef<number>(0)
  const onChangeRef = useRef(onChange)

  // Cache word counts per paragraph to avoid recalculating unchanged paragraphs
  const paragraphWordCountCache = useRef<Map<string, number>>(new Map())

  // Keep onChange ref up to date
  onChangeRef.current = onChange

  // Calculate word count only for changed paragraphs using requestIdleCallback
  const scheduleWordCount = useCallback((paragraphs: string[], charCount: number, fullText: string) => {
    // Cancel any pending idle callback
    if (idleCallbackRef.current !== null) {
      cancelIdle(idleCallbackRef.current as number)
    }

    idleCallbackRef.current = requestIdle((deadline) => {
      idleCallbackRef.current = null

      if (!breaker) return

      let totalWordCount = 0
      const newCache = new Map<string, number>()

      for (const paragraph of paragraphs) {
        const trimmed = paragraph.trim()
        if (!trimmed) continue

        // Check if we have a cached count for this exact paragraph
        const cachedCount = paragraphWordCountCache.current.get(trimmed)

        if (cachedCount !== undefined) {
          // Use cached count
          totalWordCount += cachedCount
          newCache.set(trimmed, cachedCount)
        } else {
          // Calculate word count for this paragraph (only changed ones hit this path)
          const segments = breaker.getSegments(trimmed)
          const wordCount = segments.filter((s) => s.trim() && !/^\s+$/.test(s)).length
          totalWordCount += wordCount
          newCache.set(trimmed, wordCount)

          // If we're running out of idle time, schedule continuation
          if (deadline.timeRemaining() < 5 && !deadline.didTimeout) {
            // For simplicity, just continue - the work is chunked by paragraph
          }
        }
      }

      // Update cache with new paragraph contents
      paragraphWordCountCache.current = newCache

      lastWordCountRef.current = totalWordCount
      onChangeRef.current(fullText, totalWordCount, charCount)

      if (isDebugEnabled()) {
        console.log("[OnChangePlugin] Word count calculated:", {
          totalWordCount,
          paragraphsCached: newCache.size,
        })
      }
    }, { timeout: IDLE_CALLBACK_TIMEOUT_MS })
  }, [breaker])

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const root = $getRoot()
        const paragraphs: string[] = []
        let text = ""

        // Walk through all nodes to build plain text and collect paragraphs
        const children = root.getChildren()
        children.forEach((node, index) => {
          const nodeText = extractTextFromNode(node)
          // Clean paragraph text for caching (remove WJ and ZWSP)
          const cleanParagraph = nodeText.replace(new RegExp(WJ, "g"), "").replace(new RegExp(ZWSP, "g"), "")
          paragraphs.push(cleanParagraph)
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
        // The accurate count will be calculated during idle time
        const approximateCount = approximateWordCount(root)

        // Use the last accurate count if available, otherwise use approximate
        const wordCount = lastWordCountRef.current > 0 ? lastWordCountRef.current : approximateCount

        onChange(text, wordCount, charCount)

        // Schedule accurate word count calculation during idle time
        scheduleWordCount(paragraphs, charCount, text)

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

  // Cleanup idle callback on unmount
  useEffect(() => {
    return () => {
      if (idleCallbackRef.current !== null) {
        cancelIdle(idleCallbackRef.current as number)
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
