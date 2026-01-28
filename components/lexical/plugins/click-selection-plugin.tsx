"use client"

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { $getRoot, $getSelection, $isRangeSelection, $setSelection, $createRangeSelection } from "lexical"
import { useEffect } from "react"

/**
 * Plugin to handle clicks in empty space to the right of text lines.
 * 
 * In contentEditable, clicking in empty space to the right of text on a line
 * doesn't select or position the cursor properly because the text element
 * doesn't extend to fill the full width. This plugin detects such clicks
 * and positions the cursor at the end of the nearest line.
 */
export function ClickSelectionPlugin() {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    const rootElement = editor.getRootElement()
    if (!rootElement) return

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      
      // Only handle clicks directly on the root contentEditable element
      // (not on child elements like paragraphs or text)
      if (target !== rootElement) return

      // Get click coordinates
      const clickX = event.clientX
      const clickY = event.clientY

      // Find the paragraph element at this Y coordinate
      const paragraphs = rootElement.querySelectorAll("p, h1, h2, h3")
      let targetParagraph: Element | null = null
      
      for (const p of paragraphs) {
        const rect = p.getBoundingClientRect()
        // Check if click Y is within this paragraph's bounds
        if (clickY >= rect.top && clickY <= rect.bottom) {
          targetParagraph = p
          break
        }
      }

      if (!targetParagraph) return

      // Check if click is to the right of the text content
      const paragraphRect = targetParagraph.getBoundingClientRect()
      
      // Get the actual text width by checking the last text node or element
      const textContent = targetParagraph.textContent || ""
      if (!textContent.trim()) return

      // Use Range to find the actual text bounds
      const range = document.createRange()
      const textNodes: Node[] = []
      const walker = document.createTreeWalker(targetParagraph, NodeFilter.SHOW_TEXT)
      let node: Node | null
      while ((node = walker.nextNode())) {
        textNodes.push(node)
      }

      if (textNodes.length === 0) return

      // Get the bounding rect of the last text node
      const lastTextNode = textNodes[textNodes.length - 1]
      range.selectNodeContents(lastTextNode)
      const textRect = range.getBoundingClientRect()

      // Check if click is to the right of the text
      if (clickX > textRect.right + 5) { // 5px buffer
        // Prevent default browser behavior
        event.preventDefault()

        // Position cursor at the end of this paragraph in Lexical
        editor.update(() => {
          const root = $getRoot()
          const children = root.getChildren()
          
          // Find the corresponding Lexical node for this paragraph
          // by matching the index
          const paragraphIndex = Array.from(paragraphs).indexOf(targetParagraph!)
          
          if (paragraphIndex >= 0 && paragraphIndex < children.length) {
            const lexicalParagraph = children[paragraphIndex]
            
            // Select the end of this paragraph
            if (lexicalParagraph.selectEnd) {
              lexicalParagraph.selectEnd()
            }
          }
        })
      }
    }

    rootElement.addEventListener("mousedown", handleMouseDown)

    return () => {
      rootElement.removeEventListener("mousedown", handleMouseDown)
    }
  }, [editor])

  return null
}
