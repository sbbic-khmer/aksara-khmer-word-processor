"use client"

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { $getRoot, $isTextNode } from "lexical"
import { useEffect, useRef } from "react"
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

export function OnChangePlugin({ onChange, onContentChange, breaker }: OnChangePluginProps) {
  const [editor] = useLexicalComposerContext()
  const previousTextRef = useRef<string | null>(null)

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

        let wordCount = 0
        if (breaker && textWithoutWJ.trim()) {
          // Use the Khmer breaker to segment text into words
          const segments = breaker.getSegments(textWithoutWJ)
          // Filter out whitespace-only segments and count actual words
          wordCount = segments.filter((s) => s.trim() && !/^\s+$/.test(s)).length
        } else if (textWithoutWJ.trim()) {
          // Fallback to whitespace splitting for non-Khmer text
          const words = textWithoutWJ
            .trim()
            .split(/\s+/)
            .filter((w) => w.length > 0)
          wordCount = words.length
        }

        const charCount = textWithoutWJ.length

        onChange(text, wordCount, charCount)

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
  }, [editor, onChange, onContentChange, breaker])

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
