"use client"

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { 
  $getSelection, 
  $isRangeSelection,
  $isTextNode,
  $createTextNode,
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
const END_PUNCTUATION_PATTERN = /[។៕៖?!]$/
const START_NON_SPACE_PATTERN = /^[^\s។៕៖?!\u200B]/

/**
 * Plugin that automatically adds a space after end punctuation marks
 * when the user types a non-space character immediately after punctuation.
 * 
 * This ensures proper spacing in Khmer text for readability and word breaking.
 */
export function PunctuationSpacingPlugin() {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    // Listen for text node mutations
    return editor.registerNodeTransform(TextNode, (node) => {
      const text = node.getTextContent()
      
      // Case 1: Check within this node for punctuation followed by non-space
      const inlinePattern = /([។៕៖?!])([^\s។៕៖?!\u200B])/g
      let match
      let newText = text
      let offset = 0
      
      while ((match = inlinePattern.exec(text)) !== null) {
        const insertPos = match.index + 1 + offset
        newText = newText.slice(0, insertPos) + " " + newText.slice(insertPos)
        offset += 1
      }
      
      if (newText !== text) {
        node.setTextContent(newText)
        return // Exit after modification to avoid conflicts
      }
      
      // Case 2: Check if previous sibling ends with punctuation and this node starts with non-space
      const prevSibling = node.getPreviousSibling()
      if (prevSibling && $isTextNode(prevSibling)) {
        const prevText = prevSibling.getTextContent()
        
        // Check if previous node ends with end punctuation
        if (END_PUNCTUATION_PATTERN.test(prevText)) {
          // Check if current node starts with a non-space character
          if (START_NON_SPACE_PATTERN.test(text)) {
            // Insert a space at the beginning of this node
            node.setTextContent(" " + text)
          }
        }
      }
    })
  }, [editor])

  return null
}
