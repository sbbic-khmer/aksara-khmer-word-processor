"use client"

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { 
  $isTextNode,
  TextNode,
  $getRoot,
  ElementNode,
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
const END_PUNCTUATION_PATTERN = /[។៕៖?!]$/
const START_NON_SPACE_PATTERN = /^[^\s។៕៖?!\u200B]/

/**
 * Plugin that automatically adds a space after end punctuation marks
 * when text is added immediately after punctuation.
 * 
 * This ensures proper spacing in Khmer text for readability and word breaking.
 */
export function PunctuationSpacingPlugin() {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    // Listen for text node mutations
    return editor.registerNodeTransform(TextNode, (node) => {
      const text = node.getTextContent()
      
      // Skip empty nodes
      if (!text) return
      
      console.log("[v0] PunctuationSpacing: Checking node text:", JSON.stringify(text))
      
      // Case 1: Check within this node for punctuation followed by non-space
      // Pattern matches: punctuation followed by non-space, non-punctuation character
      const inlinePattern = /([។៕៖?!])([^\s។៕៖?!\u200B])/g
      let match
      let newText = text
      let offset = 0
      
      // Reset lastIndex to ensure we start from the beginning
      inlinePattern.lastIndex = 0
      
      while ((match = inlinePattern.exec(text)) !== null) {
        console.log("[v0] PunctuationSpacing: Found inline match:", match[0])
        const insertPos = match.index + 1 + offset
        newText = newText.slice(0, insertPos) + " " + newText.slice(insertPos)
        offset += 1
      }
      
      if (newText !== text) {
        console.log("[v0] PunctuationSpacing: Updating node text to:", JSON.stringify(newText))
        node.setTextContent(newText)
        return // Exit after modification to avoid conflicts
      }
      
      // Case 2: Check if this node starts with non-space and previous text ends with punctuation
      if (START_NON_SPACE_PATTERN.test(text)) {
        // Get the previous sibling
        const prevSibling = node.getPreviousSibling()
        console.log("[v0] PunctuationSpacing: Checking previous sibling, exists:", !!prevSibling)
        
        if (prevSibling && $isTextNode(prevSibling)) {
          const prevText = prevSibling.getTextContent()
          console.log("[v0] PunctuationSpacing: Previous text:", JSON.stringify(prevText))
          
          // Check if previous node ends with end punctuation
          if (END_PUNCTUATION_PATTERN.test(prevText)) {
            console.log("[v0] PunctuationSpacing: Adding space at beginning of node")
            node.setTextContent(" " + text)
            return
          }
        }
        
        // Case 3: Check if no previous sibling but parent has previous sibling ending with punctuation
        // This handles cases where text is in different paragraphs or elements
        if (!prevSibling) {
          const parent = node.getParent()
          if (parent) {
            // Get all text before this node in the same paragraph
            const siblings = parent.getChildren()
            const nodeIndex = siblings.indexOf(node)
            
            if (nodeIndex > 0) {
              // Check the previous sibling (might be a different type of node)
              const prevNode = siblings[nodeIndex - 1]
              if ($isTextNode(prevNode)) {
                const prevText = prevNode.getTextContent()
                console.log("[v0] PunctuationSpacing: Parent sibling text:", JSON.stringify(prevText))
                if (END_PUNCTUATION_PATTERN.test(prevText)) {
                  console.log("[v0] PunctuationSpacing: Adding space (parent sibling case)")
                  node.setTextContent(" " + text)
                  return
                }
              }
            }
          }
        }
      }
    })
  }, [editor])

  return null
}
