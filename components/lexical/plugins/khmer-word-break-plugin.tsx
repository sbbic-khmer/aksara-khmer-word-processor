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
import { isWordBreakerDebugEnabled, isCursorDebugEnabled, cursorDebugLog } from "@/lib/debug"

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
    // Store format info for each character position
    interface FormatRange {
      start: number
      end: number
      format: number
      style: string
    }

    const collectParagraphText = (paragraph: ElementNode): { text: string; hasBreakNodes: boolean; formatRanges: FormatRange[] } => {
      let text = ""
      let hasBreakNodes = false
      const formatRanges: FormatRange[] = []
      const children = paragraph.getChildren()

      for (const child of children) {
        if ($isTextNode(child)) {
          const content = child.getTextContent()
          const start = text.length
          text += content
          formatRanges.push({
            start,
            end: text.length,
            format: child.getFormat(),
            style: child.getStyle(),
          })
        } else if ($isKhmerBreakNode(child)) {
          hasBreakNodes = true
        }
      }

      return { text, hasBreakNodes, formatRanges }
    }

    // Get format and style for a given character position
    const getFormatAtPosition = (formatRanges: FormatRange[], position: number): { format: number; style: string } => {
      for (const range of formatRanges) {
        if (position >= range.start && position < range.end) {
          return { format: range.format, style: range.style }
        }
      }
      // Fallback to last format range if position is at the end
      if (formatRanges.length > 0) {
        const lastRange = formatRanges[formatRanges.length - 1]
        return { format: lastRange.format, style: lastRange.style }
      }
      return { format: 0, style: "" }
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
        const { text, hasBreakNodes, formatRanges } = collectParagraphText(paragraph)

        if (!text || text.length === 0) return

        // When showBreaks is false (auto-word-break disabled), don't segment at all.
        // Keep text as a single TextNode with any ZWSP characters preserved inline.
        // The spell checker will use ZWSP as word boundaries when checking.
        if (!showBreaks) {
          if (isWordBreakerDebugEnabled()) {
            console.log(`[v0:wb] Skipping all segmentation - showBreaks is false`)
          }
          return
        }

        // Check for any user-defined break characters (ZWSP, ZWJ, ZWNJ)
        const hasUserBreaks = containsUserBreaks(text)
        if (hasUserBreaks) {
          if (isWordBreakerDebugEnabled()) {
            console.log(`[v0:wb] Text contains user break chars, using resegmentWithUserBreaks`)
          }
          resegmentWithUserBreaks(paragraph, text, cursorOffset, formatRanges)
          return
        }

        const segments = breaker.getSegments(text)

        if (segments.length <= 1 && !hasBreakNodes) {
          if (isWordBreakerDebugEnabled()) {
            console.log(`[v0:wb] Skipping - only ${segments.length} segments and hasBreakNodes=${hasBreakNodes}`)
          }
          return
        }

        // Create nodes with proper formatting for each segment
        const newNodes: LexicalNode[] = []
        let charPos = 0
        
        segments.forEach((segment, i) => {
          // Get format at the start of this segment
          const { format, style } = getFormatAtPosition(formatRanges, charPos)
          
          const newTextNode = $createTextNode(segment)
          newTextNode.setFormat(format)
          newTextNode.setStyle(style)
          processedNodesRef.current.add(newTextNode)
          newNodes.push(newTextNode)
          
          charPos += segment.length

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

        paragraph.clear()
        newNodes.forEach((node) => paragraph.append(node))

        if (cursorOffset !== null) {
          if (isCursorDebugEnabled()) {
            cursorDebugLog("resegmentParagraph - RESTORING cursor", { cursorOffset, nodeCount: newNodes.length })
          }
          let charCount = 0
          let cursorRestored = false
          for (const node of newNodes) {
            if ($isTextNode(node)) {
              const nodeLength = node.getTextContentSize()
              if (charCount + nodeLength >= cursorOffset) {
                const offsetInNode = cursorOffset - charCount
                node.select(offsetInNode, offsetInNode)
                cursorRestored = true
                if (isCursorDebugEnabled()) {
                  cursorDebugLog("resegmentParagraph - Cursor restored", { offsetInNode, nodeText: node.getTextContent().slice(0, 20) })
                }
                break
              }
              charCount += nodeLength
            }
          }
          if (!cursorRestored && isCursorDebugEnabled()) {
            cursorDebugLog("resegmentParagraph - WARNING: Cursor NOT restored! charCount:", charCount, "cursorOffset:", cursorOffset)
          }
        } else {
          if (isCursorDebugEnabled()) {
            cursorDebugLog("resegmentParagraph - NO cursor restoration (cursorOffset is null)")
          }
        }
      } finally {
        processingParagraphRef.current = false
        queueMicrotask(() => {
          processedParagraphKeysRef.current.clear()
        })
      }
    }

    const resegmentWithUserBreaks = (paragraph: ElementNode, text: string, cursorOffset: number | null, formatRanges: FormatRange[]): void => {
      // Find positions of all user break characters - we'll preserve them in the output
      const userBreakPositions: number[] = []
      for (let i = 0; i < text.length; i++) {
        if (USER_BREAK_REGEX.test(text[i])) {
          userBreakPositions.push(i)
        }
      }
      
      if (isWordBreakerDebugEnabled()) {
        console.log(`[v0:wb] resegmentWithUserBreaks - text length: ${text.length}, user breaks at: ${userBreakPositions.join(',')}`)
      }

      // First, get auto word breaks for the text WITHOUT user break chars
      const textWithoutUserBreaks = text.replace(USER_BREAK_REGEX, '')
      const autoSegments = breaker.getSegments(textWithoutUserBreaks)
      
      // Calculate auto break positions (cumulative character positions)
      const autoBreakPositions: number[] = []
      let pos = 0
      for (let i = 0; i < autoSegments.length - 1; i++) {
        pos += autoSegments[i].length
        autoBreakPositions.push(pos)
      }
      
      // Now we need to map auto break positions back to original text positions
      // (accounting for user break chars that were removed)
      const adjustedAutoBreakPositions = autoBreakPositions.map(autoPos => {
        let adjustedPos = autoPos
        for (const userBreakPos of userBreakPositions) {
          // Count how many user breaks are before this auto position in original text
          const originalPosBeforeUserBreak = userBreakPos - userBreakPositions.filter(p => p < userBreakPos).length
          if (originalPosBeforeUserBreak < autoPos) {
            adjustedPos++
          }
        }
        return adjustedPos
      })
      
      // When showBreaks is true, combine user break positions and auto break positions
      // When showBreaks is false, ONLY use user break positions (no auto-segmentation)
      const allBreakPositions = showBreaks 
        ? [...new Set([...userBreakPositions, ...adjustedAutoBreakPositions])].sort((a, b) => a - b)
        : [...userBreakPositions].sort((a, b) => a - b)
      
      if (isWordBreakerDebugEnabled()) {
        console.log(`[v0:wb] Auto breaks: ${autoBreakPositions.join(',')}, Adjusted: ${adjustedAutoBreakPositions.join(',')}, All (showBreaks=${showBreaks}): ${allBreakPositions.join(',')}`)
      }
      
      // Now create text nodes, splitting at all break positions
      const newNodes: LexicalNode[] = []
      let lastPos = 0
      
      for (let i = 0; i <= allBreakPositions.length; i++) {
        const breakPos = i < allBreakPositions.length ? allBreakPositions[i] : text.length
        const isUserBreak = i < allBreakPositions.length && userBreakPositions.includes(breakPos)
        
        // When showBreaks is false, include the ZWSP character in the segment
        // so it's preserved in the text. When showBreaks is true, we split at
        // the ZWSP and show visual break markers instead.
        const endPos = (!showBreaks && isUserBreak) ? breakPos + 1 : breakPos
        const segment = text.slice(lastPos, endPos)
        
        if (segment.length > 0) {
          // Get format at the start of this segment
          const { format, style } = getFormatAtPosition(formatRanges, lastPos)
          
          const newTextNode = $createTextNode(segment)
          newTextNode.setFormat(format)
          newTextNode.setStyle(style)
          processedNodesRef.current.add(newTextNode)
          newNodes.push(newTextNode)
          
          // Add break node after this segment if there's more content and showBreaks is on
          if (showBreaks && i < allBreakPositions.length) {
            const nextEndPos = i + 1 < allBreakPositions.length ? allBreakPositions[i + 1] : text.length
            const nextSegment = text.slice(breakPos, nextEndPos)
            
            // Skip break if current or next segment is whitespace only
            const skipBreak =
              isWhitespaceOnly(segment.replace(USER_BREAK_REGEX, '')) ||
              isWhitespaceOnly(nextSegment.replace(USER_BREAK_REGEX, '')) ||
              containsWhitespace(segment.replace(USER_BREAK_REGEX, '').slice(-1)) ||
              containsWhitespace(nextSegment.replace(USER_BREAK_REGEX, '').slice(0, 1))
            
            if (!skipBreak) {
              newNodes.push($createKhmerBreakNode())
            }
          }
        }
        
        // When showBreaks is false and we included the ZWSP, skip past it for next segment
        lastPos = (!showBreaks && isUserBreak) ? breakPos + 1 : breakPos
      }

      if (newNodes.length === 0) return

      paragraph.clear()
      newNodes.forEach((node) => paragraph.append(node))

      // Restore cursor position - characters are preserved so offset should map directly
      if (cursorOffset !== null) {
        let charCount = 0
        for (const node of newNodes) {
          if ($isTextNode(node)) {
            const nodeLength = node.getTextContentSize()
            if (charCount + nodeLength >= cursorOffset) {
              const offsetInNode = cursorOffset - charCount
              node.select(offsetInNode, offsetInNode)
              return
            }
            charCount += nodeLength
          }
        }
        
        // Fallback: position at end
        const lastTextNode = newNodes.filter($isTextNode).pop() as TextNode | undefined
        if (lastTextNode) {
          const len = lastTextNode.getTextContentSize()
          lastTextNode.select(len, len)
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
          if (isCursorDebugEnabled()) {
            cursorDebugLog("NodeTransform - cursor calculated", { 
              cursorOffset, 
              anchorOffset: selection.anchor.offset,
              anchorNodeText: anchorNode.getTextContent().slice(0, 20)
            })
          }
        } else {
          if (isCursorDebugEnabled()) {
            cursorDebugLog("NodeTransform - anchorNode is NOT TextNode!", { 
              anchorNodeType: anchorNode.getType(),
              anchorOffset: selection.anchor.offset
            })
          }
        }
      } else {
        if (isCursorDebugEnabled()) {
          cursorDebugLog("NodeTransform - No range selection", { selectionType: selection ? selection.constructor.name : "null" })
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
