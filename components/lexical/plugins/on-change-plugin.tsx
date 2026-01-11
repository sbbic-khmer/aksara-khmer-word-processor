"use client"

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { $getRoot, $isTextNode } from "lexical"
import { useEffect } from "react"
import { $isKhmerBreakNode } from "../nodes/khmer-break-node"

interface OnChangePluginProps {
  onChange: (text: string, wordCount: number, charCount: number) => void
}

const WJ = "\u2060"

export function OnChangePlugin({ onChange }: OnChangePluginProps) {
  const [editor] = useLexicalComposerContext()

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
      })
    })
  }, [editor, onChange])

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
