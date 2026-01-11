"use client"

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { TextNode, $getSelection, $isRangeSelection, $createTextNode } from "lexical"
import { useEffect, useRef } from "react"
import { $createKhmerBreakNode, $isKhmerBreakNode } from "../nodes/khmer-break-node"
import type { KhmerBreaker } from "@/lib/khmer-breaker"

const ZWSP = "\u200B"

interface KhmerWordBreakPluginProps {
  breaker: KhmerBreaker
  showBreaks: boolean
}

export function KhmerWordBreakPlugin({ breaker, showBreaks }: KhmerWordBreakPluginProps) {
  const [editor] = useLexicalComposerContext()
  const isProcessingRef = useRef(false)

  useEffect(() => {
    // Register a node transform that runs whenever text nodes change
    const removeTransform = editor.registerNodeTransform(TextNode, (textNode: TextNode) => {
      // Prevent infinite loops
      if (isProcessingRef.current) return

      const text = textNode.getTextContent()

      // Skip if no text, already processed, or contains ZWSP markers
      if (!text || text.length === 0 || text.includes(ZWSP)) return

      // Check if this node already has break nodes as siblings
      const nextSibling = textNode.getNextSibling()
      if (nextSibling && $isKhmerBreakNode(nextSibling)) return

      // Get word segments using our Khmer breaker
      const segments = breaker.getSegments(text)

      // If only one segment, no breaks needed
      if (segments.length <= 1) return

      isProcessingRef.current = true

      try {
        // Get the parent to insert nodes
        const parent = textNode.getParent()
        if (!parent) return

        // Save selection state
        const selection = $getSelection()
        let savedAnchorOffset = 0
        let savedFocusOffset = 0
        let wasSelected = false

        if ($isRangeSelection(selection)) {
          const anchorNode = selection.anchor.getNode()
          const focusNode = selection.focus.getNode()
          if (anchorNode === textNode || focusNode === textNode) {
            wasSelected = true
            savedAnchorOffset = selection.anchor.offset
            savedFocusOffset = selection.focus.offset
          }
        }

        // Get formatting from original node
        const format = textNode.getFormat()
        const style = textNode.getStyle()

        // Build replacement: text segments with optional break nodes between them
        const newNodes: (TextNode | ReturnType<typeof $createKhmerBreakNode>)[] = []

        segments.forEach((segment, i) => {
          const newTextNode = $createTextNode(segment)
          newTextNode.setFormat(format)
          newTextNode.setStyle(style)
          newNodes.push(newTextNode)

          // Add break marker after segment (except last)
          if (showBreaks && i < segments.length - 1) {
            newNodes.push($createKhmerBreakNode())
          }
        })

        // Replace the original text node
        if (newNodes.length > 0) {
          textNode.replace(newNodes[0])
          let prevNode = newNodes[0]
          for (let i = 1; i < newNodes.length; i++) {
            prevNode.insertAfter(newNodes[i])
            prevNode = newNodes[i]
          }

          // Restore cursor position in the appropriate text node
          if (wasSelected && $isRangeSelection(selection)) {
            let charCount = 0
            for (const node of newNodes) {
              if (node instanceof TextNode) {
                const nodeLength = node.getTextContentSize()
                if (charCount + nodeLength >= savedAnchorOffset) {
                  const offsetInNode = savedAnchorOffset - charCount
                  node.select(offsetInNode, offsetInNode)
                  break
                }
                charCount += nodeLength
              }
            }
          }
        }
      } finally {
        isProcessingRef.current = false
      }
    })

    return () => {
      removeTransform()
    }
  }, [editor, breaker, showBreaks])

  return null
}
