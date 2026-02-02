"use client"

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { useEffect } from "react"

/**
 * Plugin to handle clicks in empty space to the right of text lines.
 *
 * In contentEditable, clicking in empty space to the right of text on a line
 * doesn't initiate text selection properly because browsers only start selection
 * from actual rendered content. This plugin detects such clicks and enables
 * drag-to-select behavior starting from the end of the line.
 *
 * For multi-line paragraphs (common with Khmer text), we need to detect which
 * specific LINE the user clicked on and get the right edge of THAT line, not
 * the entire paragraph.
 */
export function ClickSelectionPlugin() {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    const rootElement = editor.getRootElement()
    if (!rootElement) return

    // Track drag selection state
    let isDragging = false
    let anchorNode: Text | null = null
    let anchorOffset: number = 0

    // Helper: get text position at a point using browser APIs
    const getTextPositionAtPoint = (x: number, y: number): { node: Text; offset: number } | null => {
      // Use caretPositionFromPoint (Firefox) or caretRangeFromPoint (Chrome/Safari)
      if (document.caretPositionFromPoint) {
        const pos = document.caretPositionFromPoint(x, y)
        if (pos && pos.offsetNode.nodeType === Node.TEXT_NODE) {
          return { node: pos.offsetNode as Text, offset: pos.offset }
        }
      } else if (document.caretRangeFromPoint) {
        const range = document.caretRangeFromPoint(x, y)
        if (range && range.startContainer.nodeType === Node.TEXT_NODE) {
          return { node: range.startContainer as Text, offset: range.startOffset }
        }
      }
      return null
    }

    // Helper: get the last text node and end position in a paragraph
    const getEndOfParagraph = (paragraph: Element): { node: Text; offset: number } | null => {
      const textNodes: Text[] = []
      const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT)
      let node: Node | null
      while ((node = walker.nextNode())) {
        textNodes.push(node as Text)
      }
      if (textNodes.length === 0) return null
      const lastNode = textNodes[textNodes.length - 1]
      return { node: lastNode, offset: lastNode.length }
    }

    /**
     * Get information about a specific line within a paragraph based on Y coordinate.
     * For multi-line paragraphs, this finds the line at the given Y position and returns
     * its right edge and the text node/offset at the end of that line.
     */
    const getLineInfoAtY = (paragraph: Element, clickY: number): {
      rightEdge: number
      endNode: Text
      endOffset: number
    } | null => {
      const textNodes: Text[] = []
      const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT)
      let node: Node | null
      while ((node = walker.nextNode())) {
        textNodes.push(node as Text)
      }
      if (textNodes.length === 0) return null

      // Build a map of all character positions with their bounding rects
      // Group characters by line (same top coordinate, with tolerance for font rendering)
      interface CharInfo {
        node: Text
        offset: number
        rect: DOMRect
      }

      const charInfos: CharInfo[] = []

      for (const textNode of textNodes) {
        const text = textNode.textContent || ""
        for (let i = 0; i <= text.length; i++) {
          const range = document.createRange()
          range.setStart(textNode, i)
          range.setEnd(textNode, i)
          const rect = range.getBoundingClientRect()
          // Only include if rect has valid dimensions
          if (rect.height > 0) {
            charInfos.push({ node: textNode, offset: i, rect })
          }
        }
      }

      if (charInfos.length === 0) return null

      // Find all characters on the same line as the click (within Y tolerance)
      // A "line" is defined as characters whose vertical center is within the line height
      const LINE_Y_TOLERANCE = 5 // pixels

      // First, find a character near the click Y to establish the line's Y range
      let lineTop = Infinity
      let lineBottom = -Infinity

      // Find characters that intersect with the click Y
      for (const info of charInfos) {
        if (clickY >= info.rect.top - LINE_Y_TOLERANCE && clickY <= info.rect.bottom + LINE_Y_TOLERANCE) {
          lineTop = Math.min(lineTop, info.rect.top)
          lineBottom = Math.max(lineBottom, info.rect.bottom)
        }
      }

      // If no line found at click Y, fall back to finding the closest line
      if (lineTop === Infinity) {
        let closestDist = Infinity
        for (const info of charInfos) {
          const charMidY = (info.rect.top + info.rect.bottom) / 2
          const dist = Math.abs(charMidY - clickY)
          if (dist < closestDist) {
            closestDist = dist
            lineTop = info.rect.top
            lineBottom = info.rect.bottom
          }
        }

        // Expand to include all chars on this line
        for (const info of charInfos) {
          if (info.rect.top >= lineTop - LINE_Y_TOLERANCE && info.rect.bottom <= lineBottom + LINE_Y_TOLERANCE) {
            lineTop = Math.min(lineTop, info.rect.top)
            lineBottom = Math.max(lineBottom, info.rect.bottom)
          }
        }
      }

      // Now find all characters on this line
      const lineChars = charInfos.filter(info =>
        info.rect.top >= lineTop - LINE_Y_TOLERANCE &&
        info.rect.bottom <= lineBottom + LINE_Y_TOLERANCE
      )

      if (lineChars.length === 0) return null

      // Find the rightmost character on this line
      let rightmostChar = lineChars[0]
      let maxRight = rightmostChar.rect.right

      for (const info of lineChars) {
        if (info.rect.right > maxRight) {
          maxRight = info.rect.right
          rightmostChar = info
        }
      }

      // Find the actual end position on this line
      // We want the position AFTER the last character, so find the last char with content
      const lineCharsSorted = [...lineChars].sort((a, b) => {
        // Sort by position in document order
        if (a.node === b.node) return a.offset - b.offset
        const position = a.node.compareDocumentPosition(b.node)
        if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1
        if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1
        return 0
      })

      const lastCharOnLine = lineCharsSorted[lineCharsSorted.length - 1]

      return {
        rightEdge: maxRight,
        endNode: lastCharOnLine.node,
        endOffset: lastCharOnLine.offset
      }
    }

    // Fallback: get the rightmost edge of text in entire paragraph (for single-line)
    const getTextRightEdge = (paragraph: Element): number => {
      let maxRight = 0
      const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT)
      let node: Node | null
      while ((node = walker.nextNode())) {
        const range = document.createRange()
        range.selectNodeContents(node)
        const rect = range.getBoundingClientRect()
        if (rect.right > maxRight) {
          maxRight = rect.right
        }
      }
      return maxRight
    }

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      const clickX = event.clientX
      const clickY = event.clientY

      // Check if click is on a paragraph/heading element
      const isParagraphElement = target.matches("p, h1, h2, h3")
      const isRootElement = target === rootElement

      if (!isParagraphElement && !isRootElement) return

      // Find which paragraph the click is in
      let targetParagraph: Element | null = null

      if (isParagraphElement) {
        targetParagraph = target
      } else {
        const paragraphs = rootElement.querySelectorAll("p, h1, h2, h3")
        for (const p of paragraphs) {
          const rect = p.getBoundingClientRect()
          if (clickY >= rect.top && clickY <= rect.bottom) {
            targetParagraph = p
            break
          }
        }
      }

      if (!targetParagraph) return

      const textContent = targetParagraph.textContent || ""
      if (!textContent.trim()) return

      // Try to get line-specific info for multi-line paragraphs
      const lineInfo = getLineInfoAtY(targetParagraph, clickY)

      let textRightEdge: number
      let endNode: Text | null = null
      let endOffset: number = 0

      if (lineInfo) {
        // Use line-specific right edge
        textRightEdge = lineInfo.rightEdge
        endNode = lineInfo.endNode
        endOffset = lineInfo.endOffset
      } else {
        // Fallback to paragraph-level (single line or couldn't detect lines)
        textRightEdge = getTextRightEdge(targetParagraph)
        const endPos = getEndOfParagraph(targetParagraph)
        if (endPos) {
          endNode = endPos.node
          endOffset = endPos.offset
        }
      }

      if (!endNode) return

      // Check if click is to the right of text on this line
      if (clickX > textRightEdge + 2) {
        // Start custom drag selection from the end of this line
        isDragging = true
        anchorNode = endNode
        anchorOffset = endOffset

        // Set initial collapsed selection at end of line
        const selection = window.getSelection()
        if (selection) {
          selection.removeAllRanges()
          const range = document.createRange()
          range.setStart(anchorNode, anchorOffset)
          range.setEnd(anchorNode, anchorOffset)
          selection.addRange(range)
        }

        event.preventDefault()
      }
    }

    const handleMouseMove = (event: MouseEvent) => {
      if (!isDragging || !anchorNode) return

      const selection = window.getSelection()
      if (!selection) return

      // Get text position at current mouse location
      const currentPos = getTextPositionAtPoint(event.clientX, event.clientY)
      
      if (currentPos) {
        const range = document.createRange()
        
        // Compare positions to determine selection direction
        const anchorRange = document.createRange()
        anchorRange.setStart(anchorNode, anchorOffset)
        const currentRange = document.createRange()
        currentRange.setStart(currentPos.node, currentPos.offset)
        
        const comparison = anchorRange.compareBoundaryPoints(Range.START_TO_START, currentRange)
        
        if (comparison > 0) {
          // Dragging backward (toward start)
          range.setStart(currentPos.node, currentPos.offset)
          range.setEnd(anchorNode, anchorOffset)
        } else {
          // Dragging forward (toward end)
          range.setStart(anchorNode, anchorOffset)
          range.setEnd(currentPos.node, currentPos.offset)
        }

        selection.removeAllRanges()
        selection.addRange(range)
      }

      event.preventDefault()
    }

    const handleMouseUp = () => {
      isDragging = false
      anchorNode = null
      anchorOffset = 0
    }

    rootElement.addEventListener("mousedown", handleMouseDown, true)
    document.addEventListener("mousemove", handleMouseMove, true)
    document.addEventListener("mouseup", handleMouseUp, true)

    return () => {
      rootElement.removeEventListener("mousedown", handleMouseDown, true)
      document.removeEventListener("mousemove", handleMouseMove, true)
      document.removeEventListener("mouseup", handleMouseUp, true)
    }
  }, [editor])

  return null
}
