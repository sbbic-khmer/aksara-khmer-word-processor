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

    // Helper: get the rightmost edge of text in a paragraph
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

      const textRightEdge = getTextRightEdge(targetParagraph)

      // Check if click is to the right of all text
      if (clickX > textRightEdge + 2) {
        const endPos = getEndOfParagraph(targetParagraph)
        if (!endPos) return

        // Start custom drag selection from the end of this paragraph
        isDragging = true
        anchorNode = endPos.node
        anchorOffset = endPos.offset

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
