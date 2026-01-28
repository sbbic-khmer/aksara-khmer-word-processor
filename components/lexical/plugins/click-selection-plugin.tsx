"use client"

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { $getRoot } from "lexical"
import { useEffect } from "react"

/**
 * Plugin to handle clicks in empty space to the right of text lines.
 * 
 * In contentEditable, clicking in empty space to the right of text on a line
 * doesn't initiate text selection properly because browsers only start selection
 * from actual rendered content. This plugin detects such clicks and handles them.
 */
export function ClickSelectionPlugin() {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    const rootElement = editor.getRootElement()
    if (!rootElement) return

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      const clickX = event.clientX
      const clickY = event.clientY

      // Check if click is on a paragraph/heading element (not on text inside it)
      const isParagraphElement = target.matches("p, h1, h2, h3")
      const isRootElement = target === rootElement
      
      if (!isParagraphElement && !isRootElement) return

      // Find which paragraph the click is in
      let targetParagraph: Element | null = null
      
      if (isParagraphElement) {
        targetParagraph = target
      } else {
        // Click is on root - find paragraph at this Y coordinate
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

      // Get the actual rendered text bounds
      const textContent = targetParagraph.textContent || ""
      if (!textContent.trim()) return

      // Find all text nodes in the paragraph
      const textNodes: Text[] = []
      const walker = document.createTreeWalker(targetParagraph, NodeFilter.SHOW_TEXT)
      let node: Node | null
      while ((node = walker.nextNode())) {
        textNodes.push(node as Text)
      }

      if (textNodes.length === 0) return

      // Get the rightmost edge of all text content
      let maxRight = 0
      for (const textNode of textNodes) {
        const range = document.createRange()
        range.selectNodeContents(textNode)
        const rect = range.getBoundingClientRect()
        if (rect.right > maxRight) {
          maxRight = rect.right
        }
      }

      // Check if click is to the right of all text (with a small buffer)
      if (clickX > maxRight + 2) {
        // This click is in empty space to the right of text
        // Create a native selection at the end of the last text node
        const lastTextNode = textNodes[textNodes.length - 1]
        const range = document.createRange()
        range.setStart(lastTextNode, lastTextNode.length)
        range.setEnd(lastTextNode, lastTextNode.length)
        
        const selection = window.getSelection()
        if (selection) {
          selection.removeAllRanges()
          selection.addRange(range)
        }

        // Also update Lexical's internal state
        editor.update(() => {
          const root = $getRoot()
          const children = root.getChildren()
          const paragraphs = rootElement.querySelectorAll("p, h1, h2, h3")
          const paragraphIndex = Array.from(paragraphs).indexOf(targetParagraph!)
          
          if (paragraphIndex >= 0 && paragraphIndex < children.length) {
            const lexicalParagraph = children[paragraphIndex]
            if (lexicalParagraph.selectEnd) {
              lexicalParagraph.selectEnd()
            }
          }
        })

        // Prevent default only after we've handled it
        event.preventDefault()
      }
    }

    // Use capture phase to intercept before default behavior
    rootElement.addEventListener("mousedown", handleMouseDown, true)

    return () => {
      rootElement.removeEventListener("mousedown", handleMouseDown, true)
    }
  }, [editor])

  return null
}
