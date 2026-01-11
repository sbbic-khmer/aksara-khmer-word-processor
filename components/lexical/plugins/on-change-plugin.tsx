"use client"

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { $getRoot, $isTextNode } from "lexical"
import { useEffect, useRef } from "react"
import { $isKhmerBreakNode } from "../nodes/khmer-break-node"

interface OnChangePluginProps {
  onChange: (text: string, wordCount: number, charCount: number) => void
  onContentChange?: () => void
}

const WJ = "\u2060"

export function OnChangePlugin({ onChange, onContentChange }: OnChangePluginProps) {
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

        // Remove Word Joiners for counting
        const textWithoutWJ = text.replace(new RegExp(WJ, "g"), "")

        // Count words (split by whitespace and filter empty)
        const words = textWithoutWJ
          .trim()
          .split(/\s+/)
          .filter((w) => w.length > 0)
        const wordCount = words.length
        const charCount = textWithoutWJ.length

        onChange(text, wordCount, charCount)

        // Use null as initial state to ensure first change after load is detected
        const hasActualChange = previousTextRef.current !== null && textWithoutWJ !== previousTextRef.current

        if (hasActualChange && onContentChange) {
          onContentChange()
        }

        // Always update the previous text ref
        previousTextRef.current = textWithoutWJ
      })
    })
  }, [editor, onChange, onContentChange])

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
