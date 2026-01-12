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
} from "lexical"
import { useEffect, useRef } from "react"
import { $createKhmerBreakNode, $isKhmerBreakNode, type KhmerBreakNode } from "../nodes/khmer-break-node"
import type { KhmerBreaker } from "@/lib/khmer-breaker"

const ZWSP = "\u200B"

const isWhitespaceOnly = (str: string): boolean => /^\s+$/.test(str)

interface KhmerWordBreakPluginProps {
  breaker: KhmerBreaker
  showBreaks: boolean
}

export function KhmerWordBreakPlugin({ breaker, showBreaks }: KhmerWordBreakPluginProps) {
  const [editor] = useLexicalComposerContext()
  const processedNodesRef = useRef(new WeakSet<TextNode>())

  useEffect(() => {
    const processTextWithExistingZWSP = (textNode: TextNode): TextNode | KhmerBreakNode | null => {
      const text = textNode.getTextContent()

      // Split by ZWSP - keep all segments including empty ones to track positions
      const segments = text.split(ZWSP)

      // Filter out only truly empty segments (from consecutive ZWSPs)
      const validSegments = segments.filter((s) => s.length > 0)

      // If only one segment or no segments, nothing to do
      if (validSegments.length <= 1) return null

      // Get the parent to insert nodes
      const parent = textNode.getParent()
      if (!parent) return null

      // Get formatting from original node
      const format = textNode.getFormat()
      const style = textNode.getStyle()

      // Build replacement: text segments with break nodes between them
      const newNodes: (TextNode | KhmerBreakNode)[] = []
      let lastTextNode: TextNode | null = null

      validSegments.forEach((segment, i) => {
        const newTextNode = $createTextNode(segment)
        newTextNode.setFormat(format)
        newTextNode.setStyle(style)
        processedNodesRef.current.add(newTextNode)
        newNodes.push(newTextNode)
        lastTextNode = newTextNode

        // Real spaces are already word boundaries, so no need for break markers
        if (showBreaks && i < validSegments.length - 1) {
          const nextSegment = validSegments[i + 1]
          // Don't add break marker if current or next segment is whitespace-only
          if (!isWhitespaceOnly(segment) && !isWhitespaceOnly(nextSegment)) {
            const breakNode = $createKhmerBreakNode()
            newNodes.push(breakNode)
          }
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
        return lastTextNode
      }
      return null
    }

    const processTextNode = (textNode: TextNode): TextNode | KhmerBreakNode | null => {
      const text = textNode.getTextContent()

      // Skip if no text
      if (!text || text.length === 0) return null

      if (text.includes(ZWSP)) {
        return processTextWithExistingZWSP(textNode)
      }

      // Check if this node already has break nodes as siblings
      const nextSibling = textNode.getNextSibling()
      if (nextSibling && $isKhmerBreakNode(nextSibling)) return null

      // Get word segments using our Khmer breaker
      const segments = breaker.getSegments(text)

      // If only one segment, no breaks needed
      if (segments.length <= 1) return null

      // Get the parent to insert nodes
      const parent = textNode.getParent()
      if (!parent) return null

      // Get formatting from original node
      const format = textNode.getFormat()
      const style = textNode.getStyle()

      // Build replacement: text segments with optional break nodes between them
      const newNodes: (TextNode | KhmerBreakNode)[] = []

      segments.forEach((segment, i) => {
        const newTextNode = $createTextNode(segment)
        newTextNode.setFormat(format)
        newTextNode.setStyle(style)
        processedNodesRef.current.add(newTextNode)
        newNodes.push(newTextNode)

        // Real spaces are already word boundaries, so no need for break markers
        if (showBreaks && i < segments.length - 1) {
          const nextSegment = segments[i + 1]
          // Don't add break marker if current or next segment is whitespace-only
          if (!isWhitespaceOnly(segment) && !isWhitespaceOnly(nextSegment)) {
            newNodes.push($createKhmerBreakNode())
          }
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
        for (let i = newNodes.length - 1; i >= 0; i--) {
          if ($isTextNode(newNodes[i])) {
            return newNodes[i] as TextNode
          }
        }
      }
      return null
    }

    // Register a node transform that runs whenever text nodes change
    const removeTransform = editor.registerNodeTransform(TextNode, (textNode: TextNode) => {
      if (processedNodesRef.current.has(textNode)) {
        return
      }

      processedNodesRef.current.add(textNode)

      const selection = $getSelection()
      let cursorWasAtEnd = false

      if ($isRangeSelection(selection)) {
        const anchorNode = selection.anchor.getNode()
        if (anchorNode === textNode) {
          const textLength = textNode.getTextContentSize()
          cursorWasAtEnd = selection.anchor.offset === textLength
        }
      }

      const lastProcessedNode = processTextNode(textNode)

      if (lastProcessedNode && cursorWasAtEnd && $isTextNode(lastProcessedNode)) {
        const textLength = lastProcessedNode.getTextContentSize()
        lastProcessedNode.select(textLength, textLength)
      }
    })

    const removePasteCommand = editor.registerCommand(
      PASTE_COMMAND,
      (event) => {
        const clipboardEvent = event as ClipboardEvent
        if (clipboardEvent && clipboardEvent.clipboardData) {
          const pastedText = clipboardEvent.clipboardData.getData("text/plain")

          // If the pasted text contains ZWSP, handle it specially
          if (pastedText && pastedText.includes(ZWSP)) {
            // Prevent default paste
            event.preventDefault()

            editor.update(() => {
              const selection = $getSelection()
              if (!$isRangeSelection(selection)) return

              // Insert the text with ZWSP preserved
              selection.insertRawText(pastedText)
            })

            // Process the pasted text after insertion
            setTimeout(() => {
              editor.update(() => {
                processedNodesRef.current = new WeakSet()

                const root = $getRoot()
                const allTextNodes: TextNode[] = []

                const collectTextNodes = (node: any) => {
                  if ($isTextNode(node)) {
                    allTextNodes.push(node)
                  }
                  if (node.getChildren) {
                    node.getChildren().forEach(collectTextNodes)
                  }
                }

                collectTextNodes(root)

                for (const textNode of allTextNodes) {
                  const text = textNode.getTextContent()
                  if (text.includes(ZWSP)) {
                    processTextWithExistingZWSP(textNode)
                  }
                }

                const finalTextNodes: TextNode[] = []
                const collectFinalTextNodes = (node: any) => {
                  if ($isTextNode(node)) {
                    finalTextNodes.push(node)
                  }
                  if (node.getChildren) {
                    node.getChildren().forEach(collectFinalTextNodes)
                  }
                }
                collectFinalTextNodes(root)

                if (finalTextNodes.length > 0) {
                  const lastTextNode = finalTextNodes[finalTextNodes.length - 1]
                  const textLength = lastTextNode.getTextContentSize()
                  lastTextNode.select(textLength, textLength)
                }
              })
            }, 0)

            return true // Handled
          }
        }

        // For text without ZWSP, let default paste happen then process
        setTimeout(() => {
          editor.update(() => {
            processedNodesRef.current = new WeakSet()

            const root = $getRoot()
            const allTextNodes: TextNode[] = []

            const collectTextNodes = (node: any) => {
              if ($isTextNode(node)) {
                allTextNodes.push(node)
              }
              if (node.getChildren) {
                node.getChildren().forEach(collectTextNodes)
              }
            }

            collectTextNodes(root)

            for (const textNode of allTextNodes) {
              processTextNode(textNode)
            }

            const finalTextNodes: TextNode[] = []
            const collectFinalTextNodes = (node: any) => {
              if ($isTextNode(node)) {
                finalTextNodes.push(node)
              }
              if (node.getChildren) {
                node.getChildren().forEach(collectFinalTextNodes)
              }
            }
            collectFinalTextNodes(root)

            if (finalTextNodes.length > 0) {
              const lastTextNode = finalTextNodes[finalTextNodes.length - 1]
              const textLength = lastTextNode.getTextContentSize()
              lastTextNode.select(textLength, textLength)
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
