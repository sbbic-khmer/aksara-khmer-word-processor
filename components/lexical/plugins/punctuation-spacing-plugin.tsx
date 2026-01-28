"use client"

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { 
  $getSelection, 
  $isRangeSelection,
  $isTextNode,
  TextNode,
} from "lexical"
import { useEffect } from "react"

/**
 * Khmer end punctuation marks that should have a space after them:
 * - ។ (U+17D4) KHMER SIGN KHAN - full stop/period
 * - ៕ (U+17D5) KHMER SIGN BARIYOOSAN - paragraph end  
 * - ៖ (U+17D6) KHMER SIGN CAMNUC PII KUUH - colon
 * - ? Question mark
 * - ! Exclamation mark
 */
const END_PUNCTUATION = /[។៕៖?!]/

/**
 * Plugin that automatically adds a space after end punctuation marks
 * when the user types a non-space character immediately after punctuation.
 * 
 * This ensures proper spacing in Khmer text for readability and word breaking.
 */
export function PunctuationSpacingPlugin() {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    // Listen for text node mutations to detect when punctuation is followed by non-space
    return editor.registerNodeTransform(TextNode, (node) => {
      const text = node.getTextContent()
      
      // Find patterns where punctuation is followed by a non-space, non-punctuation character
      // We need to be careful not to add space:
      // - Between punctuation marks (e.g., "!?" should stay as is)
      // - At the end of text (no need to add trailing space)
      // - Before existing space
      
      // Pattern: punctuation followed by a Khmer letter or other non-space/non-punctuation char
      // Khmer Unicode range: \u1780-\u17FF (excluding punctuation \u17D4-\u17D6)
      // We also include Latin letters for mixed text
      const pattern = /([។៕៖?!])([^\s។៕៖?!\u200B])/g
      
      let match
      let newText = text
      let offset = 0
      
      while ((match = pattern.exec(text)) !== null) {
        const punctuation = match[1]
        const nextChar = match[2]
        const insertPos = match.index + 1 + offset
        
        // Insert a space after the punctuation
        newText = newText.slice(0, insertPos) + " " + newText.slice(insertPos)
        offset += 1 // Account for the added space in subsequent matches
      }
      
      // Only update if we made changes
      if (newText !== text) {
        // Get current selection to restore cursor position
        const selection = $getSelection()
        let cursorOffset = 0
        
        if ($isRangeSelection(selection)) {
          const anchor = selection.anchor
          if (anchor.key === node.getKey()) {
            cursorOffset = anchor.offset
            // Adjust cursor position for each space added before cursor
            const textBeforeCursor = text.slice(0, cursorOffset)
            const spacesAdded = (textBeforeCursor.match(/([។៕៖?!])([^\s។៕៖?!\u200B])/g) || []).length
            cursorOffset += spacesAdded
          }
        }
        
        // Update the text content
        node.setTextContent(newText)
        
        // Restore cursor position
        if ($isRangeSelection(selection) && cursorOffset > 0) {
          const newSelection = selection.clone()
          if (newSelection.anchor.key === node.getKey()) {
            newSelection.anchor.offset = Math.min(cursorOffset, newText.length)
            newSelection.focus.offset = Math.min(cursorOffset, newText.length)
          }
        }
      }
    })
  }, [editor])

  return null
}
