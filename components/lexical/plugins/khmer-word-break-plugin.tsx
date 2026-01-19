"use client"

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import {
  TextNode,
  $getSelection,
  $isRangeSelection,
  $createTextNode,
  $createParagraphNode,
  PASTE_COMMAND,
  COMMAND_PRIORITY_HIGH,
  $getRoot,
  $isTextNode,
  $isParagraphNode,
  type LexicalNode,
  type ElementNode,
} from "lexical"
import { useEffect, useRef } from "react"
import { $createKhmerBreakNode, $isKhmerBreakNode } from "../nodes/khmer-break-node"
import type { KhmerBreaker } from "@/lib/khmer-breaker"
import { isWordBreakerDebugEnabled } from "@/lib/debug"

const ZWSP = "\u200B"
const ZWJ = "\u200D"  // Zero-width joiner
const ZWNJ = "\u200C" // Zero-width non-joiner

// All zero-width characters that indicate user-defined breaks
const USER_BREAK_CHARS = [ZWSP, ZWJ, ZWNJ]
const USER_BREAK_REGEX = /[\u200B\u200C\u200D]/

const containsWhitespace = (str: string): boolean => /\s/.test(str)
const isWhitespaceOnly = (str: string): boolean => /^\s+$/.test(str)
const containsUserBreaks = (str: string): boolean => USER_BREAK_REGEX.test(str)

interface KhmerWordBreakPluginProps {
  breaker: KhmerBreaker
  showBreaks: boolean
}

export function KhmerWordBreakPlugin({ breaker, showBreaks }: KhmerWordBreakPluginProps) {
  const [editor] = useLexicalComposerContext()
  const processingParagraphRef = useRef(false)
  const processedNodesRef = useRef(new WeakSet<TextNode>())
  const processedParagraphKeysRef = useRef(new Set<string>())

  useEffect(() => {
    const collectParagraphText = (paragraph: ElementNode): { text: string; hasBreakNodes: boolean } => {
      let text = ""
      let hasBreakNodes = false
      const children = paragraph.getChildren()

      for (const child of children) {
        if ($isTextNode(child)) {
          text += child.getTextContent()
        } else if ($isKhmerBreakNode(child)) {
          hasBreakNodes = true
        }
      }

      return { text, hasBreakNodes }
    }

    const createSegmentedNodes = (text: string, format: number, style: string): LexicalNode[] => {
      if (!text || text.length === 0) return []

      const segments = breaker.getSegments(text)
      const newNodes: LexicalNode[] = []

      segments.forEach((segment, i) => {
        const newTextNode = $createTextNode(segment)
        newTextNode.setFormat(format)
        newTextNode.setStyle(style)
        processedNodesRef.current.add(newTextNode)
        newNodes.push(newTextNode)

        if (showBreaks && i < segments.length - 1) {
          const nextSegment = segments[i + 1]

          const skipBreak =
            isWhitespaceOnly(segment) ||
            isWhitespaceOnly(nextSegment) ||
            containsWhitespace(segment.slice(-1)) ||
            containsWhitespace(nextSegment.slice(0, 1))

          if (!skipBreak) {
            newNodes.push($createKhmerBreakNode())
          }
        }
      })

      return newNodes
    }

    const resegmentParagraph = (paragraph: ElementNode, cursorOffset: number | null): void => {
      if (processingParagraphRef.current) return

      const paragraphKey = paragraph.getKey()
      if (processedParagraphKeysRef.current.has(paragraphKey)) {
        return
      }

      processingParagraphRef.current = true
      processedParagraphKeysRef.current.add(paragraphKey)

      try {
        const { text, hasBreakNodes } = collectParagraphText(paragraph)

        if (!text || text.length === 0) return

        // Check for any user-defined break characters (ZWSP, ZWJ, ZWNJ)
        if (containsUserBreaks(text)) {
          if (isWordBreakerDebugEnabled()) {
            console.log(`[v0:wb] Text contains user break chars, using resegmentWithUserBreaks`)
          }
          resegmentWithUserBreaks(paragraph, text, cursorOffset)
          return
        }

        const segments = breaker.getSegments(text)

        if (segments.length <= 1 && !hasBreakNodes) {
          if (isWordBreakerDebugEnabled()) {
            console.log(`[v0:wb] Skipping - only ${segments.length} segments and hasBreakNodes=${hasBreakNodes}`)
          }
          return
        }

        let format = 0
        let style = ""
        const firstTextNode = paragraph.getChildren().find($isTextNode)
        if (firstTextNode) {
          format = firstTextNode.getFormat()
          style = firstTextNode.getStyle()
        }

        const newNodes = createSegmentedNodes(text, format, style)

        paragraph.clear()
        newNodes.forEach((node) => paragraph.append(node))

        if (cursorOffset !== null) {
          let charCount = 0
          for (const node of newNodes) {
            if ($isTextNode(node)) {
              const nodeLength = node.getTextContentSize()
              if (charCount + nodeLength >= cursorOffset) {
                const offsetInNode = cursorOffset - charCount
                node.select(offsetInNode, offsetInNode)
                break
              }
              charCount += nodeLength
            }
          }
        }
      } finally {
        processingParagraphRef.current = false
        queueMicrotask(() => {
          processedParagraphKeysRef.current.clear()
        })
      }
    }

    const resegmentWithUserBreaks = (paragraph: ElementNode, text: string, cursorOffset: number | null): void => {
      // Split on any user break character (ZWSP, ZWJ, ZWNJ) while preserving what was used
      const segments = text.split(USER_BREAK_REGEX).filter((s) => s.length > 0)

      if (segments.length <= 1) return

      let format = 0
      let style = ""
      const firstTextNode = paragraph.getChildren().find($isTextNode)
      if (firstTextNode) {
        format = firstTextNode.getFormat()
        style = firstTextNode.getStyle()
      }

      const newNodes: LexicalNode[] = []

      segments.forEach((segment, i) => {
        const newTextNode = $createTextNode(segment)
        newTextNode.setFormat(format)
        newTextNode.setStyle(style)
        processedNodesRef.current.add(newTextNode)
        newNodes.push(newTextNode)

        if (showBreaks && i < segments.length - 1) {
          const nextSegment = segments[i + 1]
          if (!isWhitespaceOnly(segment) && !isWhitespaceOnly(nextSegment)) {
            newNodes.push($createKhmerBreakNode())
          }
        }
      })

      paragraph.clear()
      newNodes.forEach((node) => paragraph.append(node))

      // Restore cursor position properly - account for removed break characters
      if (cursorOffset !== null) {
        // Calculate position in the original text (with break chars)
        // We need to find where that maps to in the new segments
        let originalCharCount = 0
        let targetNode: TextNode | null = null
        let targetOffset = 0

        // Walk through original text to find where cursor was
        // Use the same regex we used for splitting
        const originalParts = text.split(USER_BREAK_REGEX)
        for (let i = 0; i < originalParts.length; i++) {
          const part = originalParts[i]
          const partEnd = originalCharCount + part.length + (i < originalParts.length - 1 ? 1 : 0) // +1 for break char

          if (cursorOffset <= partEnd) {
            // Cursor is in this part
            const offsetInPart = Math.min(cursorOffset - originalCharCount, part.length)
            // Find corresponding text node (skip empty parts that were filtered out)
            let nodeIndex = 0
            let partIndex = 0
            for (const node of newNodes) {
              if ($isTextNode(node)) {
                // Find the part index that corresponds to this node
                while (partIndex < originalParts.length && originalParts[partIndex].length === 0) {
                  partIndex++
                }
                if (partIndex === i) {
                  targetNode = node
                  targetOffset = offsetInPart
                  break
                }
                nodeIndex++
                partIndex++
              }
            }
            break
          }
          originalCharCount = partEnd
        }

        if (targetNode) {
          targetNode.select(targetOffset, targetOffset)
        } else {
          // Fallback: position at end
          const lastTextNode = newNodes.filter($isTextNode).pop() as TextNode | undefined
          if (lastTextNode) {
            const len = lastTextNode.getTextContentSize()
            lastTextNode.select(len, len)
          }
        }
      }
    }

    const removeTransform = editor.registerNodeTransform(TextNode, (textNode: TextNode) => {
      if (processedNodesRef.current.has(textNode)) return

      if (processingParagraphRef.current) return

      const parent = textNode.getParent()
      if (!parent || !$isParagraphNode(parent)) return

      if (processedParagraphKeysRef.current.has(parent.getKey())) {
        return
      }

      // Get current text content
      const textContent = textNode.getTextContent()
      
      // Skip if the text node is just whitespace - don't re-segment for space typing
      if (isWhitespaceOnly(textContent)) {
        processedNodesRef.current.add(textNode)
        return
      }
      
      // Check if paragraph already has proper segmentation with break nodes
      const children = parent.getChildren()
      const hasBreakNodes = children.some($isKhmerBreakNode)
      
      // If paragraph has break nodes and text doesn't contain ZWSP that needs processing,
      // we may not need to re-segment on every keystroke
      const { text } = collectParagraphText(parent)
      
      // If the text only contains characters that don't need Khmer word breaking, skip
      const hasKhmerChars = [...text].some(c => {
        const code = c.charCodeAt(0)
        return code >= 0x1780 && code <= 0x17FF
      })
      
      if (!hasKhmerChars && !containsUserBreaks(text)) {
        processedNodesRef.current.add(textNode)
        return
      }

      let cursorOffset: number | null = null
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        const anchorNode = selection.anchor.getNode()
        if ($isTextNode(anchorNode)) {
          let offset = 0
          for (const child of children) {
            if (child === anchorNode) {
              cursorOffset = offset + selection.anchor.offset
              break
            }
            if ($isTextNode(child)) {
              offset += child.getTextContentSize()
            }
          }
        }
      }

      resegmentParagraph(parent, cursorOffset)
    })

    const removePasteCommand = editor.registerCommand(
      PASTE_COMMAND,
      (event) => {
        const clipboardEvent = event as ClipboardEvent
        if (!clipboardEvent || !clipboardEvent.clipboardData) {
          return false // Let default handler run
        }

        const pastedText = clipboardEvent.clipboardData.getData("text/plain")
        if (!pastedText) {
          return false // Let default handler run
        }

        if (isWordBreakerDebugEnabled()) {
          console.log(`[v0:wb] PASTE intercepted - text: "${pastedText}"`)
        }

        // Prevent default paste handling
        clipboardEvent.preventDefault()

        // Reset processing state for the paste
        processedNodesRef.current = new WeakSet()
        processedParagraphKeysRef.current.clear()

        editor.update(() => {
          const selection = $getSelection()
          if (!$isRangeSelection(selection)) return

          // Get format from current selection
          let format = 0
          let style = ""
          const anchorNode = selection.anchor.getNode()
          if ($isTextNode(anchorNode)) {
            format = anchorNode.getFormat()
            style = anchorNode.getStyle()
          }

          // Delete any selected content first
          if (!selection.isCollapsed()) {
            selection.removeText()
          }

          // Split pasted text by newlines to handle multiple paragraphs
          const lines = pastedText.split(/\r?\n/)

          if (lines.length === 1) {
            // Single line - use insertNodes with our segmented text
            const nodes = createSegmentedNodes(pastedText, format, style)
            if (nodes.length > 0) {
              selection.insertNodes(nodes)
            }
          } else {
            // Multi-line paste
            let currentParagraph = anchorNode.getParent()

            lines.forEach((line, index) => {
              if (index === 0) {
                // First line - insert at current position
                const nodes = createSegmentedNodes(line, format, style)
                if (nodes.length > 0) {
                  selection.insertNodes(nodes)
                }
              } else {
                // Subsequent lines - create new paragraphs
                const newPara = $createParagraphNode()
                const nodes = createSegmentedNodes(line, format, style)
                nodes.forEach((node) => newPara.append(node))

                // Insert the new paragraph
                if (currentParagraph && $isParagraphNode(currentParagraph)) {
                  currentParagraph.insertAfter(newPara)
                  currentParagraph = newPara
                } else {
                  $getRoot().append(newPara)
                  currentParagraph = newPara
                }
              }
            })

            // Position cursor at end of last paragraph
            if (currentParagraph && $isParagraphNode(currentParagraph)) {
              const lastTextNode = currentParagraph.getChildren().filter($isTextNode).pop() as TextNode | undefined
              if (lastTextNode) {
                const len = lastTextNode.getTextContentSize()
                lastTextNode.select(len, len)
              }
            }
          }
        })

        return true // We handled the paste
      },
      COMMAND_PRIORITY_HIGH,
    )

    return () => {
      removeTransform()
      removePasteCommand()
    }
  }, [editor, breaker, showBreaks])

  return null
}
