"use client"

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import {
  TextNode,
  $getSelection,
  $isRangeSelection,
  $createTextNode,
  PASTE_COMMAND,
  COMMAND_PRIORITY_LOW,
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
const SPACE = " "

const isWhitespaceOnly = (str: string): boolean => /^\s+$/.test(str)

interface KhmerWordBreakPluginProps {
  breaker: KhmerBreaker
  showBreaks: boolean
}

export function KhmerWordBreakPlugin({ breaker, showBreaks }: KhmerWordBreakPluginProps) {
  const [editor] = useLexicalComposerContext()
  const processingParagraphRef = useRef(false)
  const processedNodesRef = useRef(new WeakSet<TextNode>()) // Track processed TextNodes instead of paragraphs

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
          // Don't add anything - we're reconstructing without breaks
        }
      }

      return { text, hasBreakNodes }
    }

    const resegmentParagraph = (paragraph: ElementNode, cursorOffset: number | null): void => {
      if (processingParagraphRef.current) return

      processingParagraphRef.current = true

      try {
        const { text, hasBreakNodes } = collectParagraphText(paragraph)

        // Skip empty paragraphs
        if (!text || text.length === 0) return

        // If text contains ZWSP, it's pre-segmented - convert to break nodes
        if (text.includes(ZWSP)) {
          resegmentWithExistingZWSP(paragraph, text, cursorOffset)
          return
        }

        // Regular spaces are explicit word boundaries
        const spaceSegments = text.split(SPACE)
        const allSegments: string[] = []

        spaceSegments.forEach((spaceSegment, index) => {
          if (spaceSegment.length === 0) {
            // Empty segment means consecutive spaces - preserve as single space
            if (index > 0) {
              allSegments.push(SPACE)
            }
          } else {
            // Apply word breaking to this space-separated segment
            const wordSegments = breaker.getSegments(spaceSegment)

            if (isWordBreakerDebugEnabled()) {
              console.log(
                `[v0:wb] SPACE-SEGMENT getSegments("${spaceSegment}") => [${wordSegments.map((s) => `"${s}"`).join(", ")}]`,
              )
            }

            allSegments.push(...wordSegments)
          }

          // Add space back between segments (except after last)
          if (index < spaceSegments.length - 1 && spaceSegment.length > 0) {
            allSegments.push(SPACE)
          }
        })

        const segments = allSegments

        if (isWordBreakerDebugEnabled()) {
          console.log(`[v0:wb] FINAL SEGMENTS for "${text}" => [${segments.map((s) => `"${s}"`).join(", ")}]`)
        }

        // If only one segment and no existing break nodes, nothing to do
        if (segments.length <= 1 && !hasBreakNodes) return

        // Check if current segmentation matches what we need
        const currentSegments = getCurrentSegments(paragraph)
        if (segmentsMatch(currentSegments, segments) && hasBreakNodes === showBreaks) {
          return // Already correctly segmented
        }

        // Get formatting from first text node
        let format = 0
        let style = ""
        const firstTextNode = paragraph.getChildren().find($isTextNode)
        if (firstTextNode) {
          format = firstTextNode.getFormat()
          style = firstTextNode.getStyle()
        }

        // Build new nodes
        const newNodes: LexicalNode[] = []

        segments.forEach((segment, i) => {
          const newTextNode = $createTextNode(segment)
          newTextNode.setFormat(format)
          newTextNode.setStyle(style)
          processedNodesRef.current.add(newTextNode)
          newNodes.push(newTextNode)

          // Add break markers between non-whitespace segments
          if (showBreaks && i < segments.length - 1) {
            const nextSegment = segments[i + 1]
            if (
              !isWhitespaceOnly(segment) &&
              !isWhitespaceOnly(nextSegment) &&
              segment !== SPACE &&
              nextSegment !== SPACE
            ) {
              newNodes.push($createKhmerBreakNode())
            }
          }
        })

        // Clear paragraph and add new nodes
        paragraph.clear()
        newNodes.forEach((node) => paragraph.append(node))

        // Restore cursor position
        if (cursorOffset !== null) {
          // Find which text node the cursor should be in
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

        // Mark paragraph as processed
        processedNodesRef.current.add(paragraph as TextNode)
      } finally {
        processingParagraphRef.current = false
      }
    }

    const getCurrentSegments = (paragraph: ElementNode): string[] => {
      const segments: string[] = []
      const children = paragraph.getChildren()

      for (const child of children) {
        if ($isTextNode(child)) {
          segments.push(child.getTextContent())
        }
      }

      return segments
    }

    const segmentsMatch = (a: string[], b: string[]): boolean => {
      if (a.length !== b.length) return false
      return a.every((seg, i) => seg === b[i])
    }

    const resegmentWithExistingZWSP = (paragraph: ElementNode, text: string, cursorOffset: number | null): void => {
      const segments = text.split(ZWSP).filter((s) => s.length > 0)

      if (segments.length <= 1) return

      // Get formatting from first text node
      let format = 0
      let style = ""
      const firstTextNode = paragraph.getChildren().find($isTextNode)
      if (firstTextNode) {
        format = firstTextNode.getFormat()
        style = firstTextNode.getStyle()
      }

      // Build new nodes
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

      // Clear paragraph and add new nodes
      paragraph.clear()
      newNodes.forEach((node) => paragraph.append(node))

      // Restore cursor at end
      if (cursorOffset !== null) {
        const lastTextNode = newNodes.filter($isTextNode).pop() as TextNode | undefined
        if (lastTextNode) {
          const len = lastTextNode.getTextContentSize()
          lastTextNode.select(len, len)
        }
      }
    }

    // Register a node transform that runs whenever text nodes change
    const removeTransform = editor.registerNodeTransform(TextNode, (textNode: TextNode) => {
      if (processedNodesRef.current.has(textNode)) return

      if (processingParagraphRef.current) return

      const parent = textNode.getParent()
      if (!parent || !$isParagraphNode(parent)) return

      // Get cursor position relative to full paragraph text
      let cursorOffset: number | null = null
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        const anchorNode = selection.anchor.getNode()
        if ($isTextNode(anchorNode)) {
          // Calculate cursor offset in full paragraph
          let offset = 0
          const children = parent.getChildren()
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

      // Re-segment the entire paragraph
      resegmentParagraph(parent, cursorOffset)
    })

    const removePasteCommand = editor.registerCommand(
      PASTE_COMMAND,
      (event) => {
        processedNodesRef.current = new WeakSet()

        const clipboardEvent = event as ClipboardEvent
        if (clipboardEvent && clipboardEvent.clipboardData) {
          const pastedText = clipboardEvent.clipboardData.getData("text/plain")

          // If the pasted text contains ZWSP, handle it specially
          if (pastedText && pastedText.includes(ZWSP)) {
            event.preventDefault()

            editor.update(() => {
              const selection = $getSelection()
              if (!$isRangeSelection(selection)) return
              selection.insertRawText(pastedText)
            })

            setTimeout(() => {
              editor.update(() => {
                processingParagraphRef.current = false

                const root = $getRoot()
                const paragraphs: ElementNode[] = []

                root.getChildren().forEach((child) => {
                  if ($isParagraphNode(child)) {
                    paragraphs.push(child)
                  }
                })

                for (const para of paragraphs) {
                  resegmentParagraph(para, null)
                }

                // Place cursor at end
                const lastPara = paragraphs[paragraphs.length - 1]
                if (lastPara) {
                  const lastTextNode = lastPara.getChildren().filter($isTextNode).pop() as TextNode | undefined
                  if (lastTextNode) {
                    const len = lastTextNode.getTextContentSize()
                    lastTextNode.select(len, len)
                  }
                }
              })
            }, 0)

            return true
          }
        }

        // For text without ZWSP, let default paste happen then process
        setTimeout(() => {
          editor.update(() => {
            processingParagraphRef.current = false

            const root = $getRoot()
            const paragraphs: ElementNode[] = []

            root.getChildren().forEach((child) => {
              if ($isParagraphNode(child)) {
                paragraphs.push(child)
              }
            })

            for (const para of paragraphs) {
              resegmentParagraph(para, null)
            }

            // Place cursor at end
            const lastPara = paragraphs[paragraphs.length - 1]
            if (lastPara) {
              const lastTextNode = lastPara.getChildren().filter($isTextNode).pop() as TextNode | undefined
              if (lastTextNode) {
                const len = lastTextNode.getTextContentSize()
                lastTextNode.select(len, len)
              }
            }
          })
        }, 0)

        return false
      },
      COMMAND_PRIORITY_LOW,
    )

    return () => {
      removeTransform()
      removePasteCommand()
    }
  }, [editor, breaker, showBreaks])

  return null
}
