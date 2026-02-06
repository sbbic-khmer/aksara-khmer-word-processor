"use client"

/**
 * Khmer Word Break Plugin
 * 
 * This plugin segments Khmer text into individual words for proper display and grammar checking.
 * 
 * IMPORTANT: Unique Style Requirement for Grammar Checking
 * =========================================================
 * Each word TextNode MUST have a unique `--word-id` CSS custom property in its style.
 * This is critical because Lexical merges adjacent TextNodes with identical styles into
 * a single DOM <span> element. Without unique styles, multiple words end up in one span,
 * causing the grammar checker to highlight entire phrases instead of individual words.
 * 
 * The `--word-id` has no visual effect but ensures each word renders as its own DOM element.
 * This style is persisted in the saved editor state, so it survives page reloads.
 *
 * Example: `--word-id: 0` for the first word, `--word-id: 1` for the second, etc.
 * (Uses a simple session-scoped counter for efficiency instead of timestamps.)
 */

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import {
  TextNode,
  $getSelection,
  $isRangeSelection,
  $createTextNode,
  $createParagraphNode,
  PASTE_COMMAND,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_NORMAL,
  $getRoot,
  $isTextNode,
  $isParagraphNode,
  $isElementNode,
  type LexicalNode,
  type ElementNode,
  createCommand,
} from "lexical"

// Custom command to force resegmentation after content is loaded
export const FORCE_RESEGMENT_COMMAND = createCommand<void>("FORCE_RESEGMENT_COMMAND")
import { useEffect, useRef, useCallback } from "react"
import { $createKhmerBreakNode, $isKhmerBreakNode } from "../nodes/khmer-break-node"
import type { KhmerBreaker } from "@/lib/khmer-breaker"
import { isWordBreakerDebugEnabled, isCursorDebugEnabled, cursorDebugLog, measurePerformance } from "@/lib/debug"

const ZWSP = "\u200B"
const ZWJ = "\u200D"  // Zero-width joiner
const ZWNJ = "\u200C" // Zero-width non-joiner

// Module-level counter for unique word IDs (replaces timestamp-based IDs for better performance)
// This counter is used to assign unique IDs to each word TextNode, preventing Lexical from
// merging adjacent nodes. A simple incrementing counter achieves the same uniqueness guarantee
// as timestamps but with less overhead from Date.now() calls and shorter strings.
let wordIdCounter = 0

// Segmentation cache - stores beam search results keyed by paragraph text
// This avoids re-running expensive beam search on unchanged paragraphs
const segmentationCache = new Map<string, string[]>()
const SEGMENTATION_CACHE_MAX_SIZE = 100

/**
 * Get cached segmentation results or compute and cache new ones.
 * Uses LRU eviction when cache exceeds max size.
 */
function getCachedSegments(text: string, breaker: KhmerBreaker): string[] {
  // Check cache first
  if (segmentationCache.has(text)) {
    if (isWordBreakerDebugEnabled()) {
      console.log(`[v0:wb] Cache HIT for ${text.length} chars`)
    }
    return segmentationCache.get(text)!
  }

  // Cache miss - run beam search
  if (isWordBreakerDebugEnabled()) {
    console.log(`[v0:wb] Cache MISS for ${text.length} chars`)
  }
  const segments = breaker.getSegments(text)

  // Store in cache with LRU eviction
  if (segmentationCache.size >= SEGMENTATION_CACHE_MAX_SIZE) {
    // Delete oldest entry (first key in Map maintains insertion order)
    const firstKey = segmentationCache.keys().next().value
    if (firstKey !== undefined) {
      segmentationCache.delete(firstKey)
    }
  }
  segmentationCache.set(text, segments)

  return segments
}

/**
 * Clear the segmentation cache. Call when user dictionary changes
 * to ensure words are re-segmented with updated dictionary.
 */
export function clearSegmentationCache(): void {
  const size = segmentationCache.size
  segmentationCache.clear()
  if (isWordBreakerDebugEnabled()) {
    console.log(`[v0:wb] Cleared segmentation cache (${size} entries)`)
  }
}

// All zero-width characters that indicate user-defined breaks
const USER_BREAK_CHARS = [ZWSP, ZWJ, ZWNJ]
const USER_BREAK_REGEX = /[\u200B\u200C\u200D]/

// Khmer and common sentence-ending punctuation that should have a normal space after them:
// - ។ (U+17D4) KHMER SIGN KHAN - full stop/period
// - ៕ (U+17D5) KHMER SIGN BARIYOOSAN - paragraph end  
// - ៖ (U+17D6) KHMER SIGN CAMNUC PII KUUH - colon
// - ? Question mark
// - ! Exclamation mark
// Pattern matches: punctuation followed by a non-space, non-punctuation, non-ZWSP character
const END_PUNCTUATION_SPACING_REGEX = /([។៕៖?!])([^\s។៕៖?!\u200B])/g

const containsWhitespace = (str: string): boolean => /\s/.test(str)
const isWhitespaceOnly = (str: string): boolean => /^\s+$/.test(str)
const containsUserBreaks = (str: string): boolean => USER_BREAK_REGEX.test(str)

/**
 * Ensures a normal space exists after sentence-ending punctuation marks.
 * Returns the modified text and a list of positions where spaces were inserted.
 * This is needed to properly adjust cursor position after the fix.
 */
function ensureSpaceAfterPunctuation(text: string): { text: string; insertedPositions: number[] } {
  const insertedPositions: number[] = []
  let offset = 0
  
  const newText = text.replace(END_PUNCTUATION_SPACING_REGEX, (match, punct, nextChar, index) => {
    // Track where we're inserting a space (adjusted for previous insertions)
    insertedPositions.push(index + 1 + offset)
    offset += 1 // Each replacement adds one character (the space)
    return punct + ' ' + nextChar
  })
  
  return { text: newText, insertedPositions }
}

interface KhmerWordBreakPluginProps {
  breaker: KhmerBreaker
  showBreaks: boolean
}

// Debounce delay for word segmentation (ms)
// Shorter = more responsive but may still cause jank on very fast typing
// Longer = smoother typing but visible delay before words appear segmented
const RESEGMENT_DEBOUNCE_MS = 250

// Use requestIdleCallback if available, otherwise fallback to setTimeout
// This runs resegmentation during browser idle time for smoother UX
const scheduleIdleCallback = (callback: () => void): number => {
  if (typeof requestIdleCallback !== 'undefined') {
    return requestIdleCallback(callback, { timeout: 500 }) as unknown as number
  }
  return setTimeout(callback, 0) as unknown as number
}

const cancelIdleCallback = (id: number): void => {
  if (typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
    window.cancelIdleCallback(id)
  } else {
    clearTimeout(id)
  }
}

export function KhmerWordBreakPlugin({ breaker, showBreaks }: KhmerWordBreakPluginProps) {
  const [editor] = useLexicalComposerContext()
  const processingParagraphRef = useRef(false)
  const processedNodesRef = useRef(new WeakSet<TextNode>())
  const processedParagraphKeysRef = useRef(new Set<string>())

// Track if we've done initial mount resegmentation
  const hasInitialResegmentRef = useRef(false)

  // Force resegment all paragraphs (used on mount and when showBreaks changes)
  // This is defined later after resegmentParagraph, but we need a ref to call it
  const forceResegmentAllParagraphsRef = useRef<() => void>(() => {})

  // Debouncing state for word segmentation
  // Instead of running beam search on every keystroke, we queue paragraphs
  // and process them after typing pauses
  const pendingParagraphsRef = useRef<Set<string>>(new Set())
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const idleCallbackRef = useRef<number | null>(null)
  const resegmentParagraphRef = useRef<(paragraph: ElementNode, cursorOffset: number | null) => void>(() => {})

  // Initial mount: force resegment all paragraphs to ensure proper word boundaries
  useEffect(() => {
    if (hasInitialResegmentRef.current) return
    hasInitialResegmentRef.current = true
    
    // Clear processed refs to allow processing
    processedNodesRef.current = new WeakSet<TextNode>()
    processedParagraphKeysRef.current = new Set<string>()
    
    // Delay to ensure editor is ready - clear processed refs again right before forcing
    const timeoutId = setTimeout(() => {
      // Clear again in case transforms already ran
      processedNodesRef.current = new WeakSet<TextNode>()
      processedParagraphKeysRef.current = new Set<string>()
      forceResegmentAllParagraphsRef.current()
    }, 100)
    
    return () => clearTimeout(timeoutId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

useEffect(() => {
  // Clear processed refs when showBreaks changes to allow re-processing
  processedNodesRef.current = new WeakSet<TextNode>()
  processedParagraphKeysRef.current = new Set<string>()
  
  // Force re-process all paragraphs when showBreaks changes
  // We need to do this after a small delay to ensure the effect has set up transforms
  const timeoutId = setTimeout(() => {
    forceResegmentAllParagraphsRef.current()
  }, 50)
  
  // Store format info for each character position
  interface FormatRange {
      start: number
      end: number
      format: number
      style: string
    }

    const collectParagraphText = (paragraph: ElementNode): { 
      text: string; 
      hasBreakNodes: boolean; 
      formatRanges: FormatRange[];
      punctuationSpacesInserted: number[];
    } => {
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

      // Apply punctuation spacing fix - add normal space after sentence-ending punctuation
      const { text: fixedText, insertedPositions } = ensureSpaceAfterPunctuation(text)
      
      // If text was modified, adjust format ranges to account for inserted spaces
      if (insertedPositions.length > 0) {
        text = fixedText
        // Adjust format range end positions for each inserted space
        for (const insertPos of insertedPositions) {
          for (const range of formatRanges) {
            // If insert position is within or before this range, extend the range
            if (insertPos <= range.end) {
              range.end += 1
            }
            // If insert position is before this range's start, shift the range
            if (insertPos < range.start) {
              range.start += 1
            }
          }
        }
      }

      return { text, hasBreakNodes, formatRanges, punctuationSpacesInserted: insertedPositions }
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

      // Apply punctuation spacing fix before segmenting
      const { text: fixedText } = ensureSpaceAfterPunctuation(text)
      const segments = measurePerformance(`wordBreak:segment(${fixedText.length} chars)`, () => getCachedSegments(fixedText, breaker))
      const newNodes: LexicalNode[] = []

      segments.forEach((segment, i) => {
        const newTextNode = $createTextNode(segment)
        newTextNode.setFormat(format)
        // Add unique word ID to prevent Lexical from merging adjacent TextNodes
        // This is critical for spell/grammar checking to work on individual words
        const wordId = `--word-id: ${wordIdCounter++}`
        newTextNode.setStyle(style ? `${style}; ${wordId}` : wordId)
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
        const { text, hasBreakNodes, formatRanges, punctuationSpacesInserted } = collectParagraphText(paragraph)

        if (!text || text.length === 0) return

        // Adjust cursor offset if spaces were inserted before the cursor position
        let adjustedCursorOffset = cursorOffset
        if (cursorOffset !== null && punctuationSpacesInserted.length > 0) {
          for (const insertPos of punctuationSpacesInserted) {
            // If a space was inserted before or at the cursor position, shift cursor forward
            if (insertPos <= cursorOffset) {
              adjustedCursorOffset = (adjustedCursorOffset ?? 0) + 1
            }
          }
          if (isWordBreakerDebugEnabled() && adjustedCursorOffset !== cursorOffset) {
            console.log(`[v0:wb] Cursor adjusted for punctuation spacing: ${cursorOffset} -> ${adjustedCursorOffset}`)
          }
        }

        const hasUserBreaks = containsUserBreaks(text)
        const hasSpaces = /\s/.test(text)

        // Check for any user-defined break characters (ZWSP, ZWJ, ZWNJ)
        if (hasUserBreaks) {
          if (isWordBreakerDebugEnabled()) {
            console.log(`[v0:wb] Text contains user break chars, using resegmentWithUserBreaks`)
          }
          resegmentWithUserBreaks(paragraph, text, adjustedCursorOffset, formatRanges)
          return
        }

        // When auto-word-break is disabled, still split by spaces for spell checking
        // This creates separate TextNodes for each space-separated word without visual break markers
        if (!showBreaks) {
          // Check if text has spaces that need splitting
          if (!hasSpaces) {
            // No spaces to split by, but we still need to check if there are
            // existing break nodes from when showBreaks was true that need to be removed
            if (!hasBreakNodes) {
              return // Nothing to do - no spaces and no break nodes
            }

            // Remove all break nodes and consolidate into a single text node
            const { format, style } = getFormatAtPosition(formatRanges, 0)
            const newTextNode = $createTextNode(text)
            newTextNode.setFormat(format)
            const wordId = `--word-id: ${wordIdCounter++}`
            newTextNode.setStyle(style ? `${style}; ${wordId}` : wordId)
            processedNodesRef.current.add(newTextNode)

            paragraph.clear()
            paragraph.append(newTextNode)

            // Restore cursor position
            if (adjustedCursorOffset !== null) {
              newTextNode.select(adjustedCursorOffset, adjustedCursorOffset)
            }
            return
          }

          // Split by spaces, keeping the spaces as separate segments
          const spaceSegments: string[] = []
          let currentWord = ''
          for (const char of text) {
            if (/\s/.test(char)) {
              if (currentWord) {
                spaceSegments.push(currentWord)
                currentWord = ''
              }
              spaceSegments.push(char) // Keep spaces as separate segments
            } else {
              currentWord += char
            }
          }
          if (currentWord) {
            spaceSegments.push(currentWord)
          }
          
          if (spaceSegments.length <= 1) {
            return // Only one segment, no need to split
          }
          
          // Create separate TextNodes for each segment (words and spaces)
          const newNodes: LexicalNode[] = []
          let charPos = 0
          
          let segmentIndex = 0
          for (const segment of spaceSegments) {
            const { format, style } = getFormatAtPosition(formatRanges, charPos)
            const newTextNode = $createTextNode(segment)
            newTextNode.setFormat(format)
            
            // Add a unique word ID to each node's style to prevent Lexical from merging
            // adjacent TextNodes into one DOM span. This is critical for spell/grammar
            // checking to work on individual words.
            const wordId = `--word-id: ${wordIdCounter++}`
            newTextNode.setStyle(style ? `${style}; ${wordId}` : wordId)
            
            processedNodesRef.current.add(newTextNode)
            newNodes.push(newTextNode)
            charPos += segment.length
            segmentIndex++
          }
          
          if (newNodes.length > 0) {
            paragraph.clear()
            newNodes.forEach((node) => paragraph.append(node))
            
            // Restore cursor position (using adjusted offset that accounts for inserted punctuation spaces)
            if (adjustedCursorOffset !== null) {
              let charCount = 0
              for (const node of newNodes) {
                if ($isTextNode(node)) {
                  const nodeLength = node.getTextContentSize()
                  if (charCount + nodeLength >= adjustedCursorOffset) {
                    const offsetInNode = adjustedCursorOffset - charCount
                    node.select(offsetInNode, offsetInNode)
                    break
                  }
                  charCount += nodeLength
                }
              }
            }
          }
          return
        }

        const segments = measurePerformance(`wordBreak:resegment(${text.length} chars)`, () => getCachedSegments(text, breaker))

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
          
          // Add a unique word ID to each node's style to prevent Lexical from merging
          // adjacent text nodes with identical styles into a single DOM span.
          // This is critical for grammar checking to work on individual words.
          const wordId = `--word-id: ${wordIdCounter++}`
          newTextNode.setStyle(style ? `${style}; ${wordId}` : wordId)
          
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

        if (adjustedCursorOffset !== null) {
          if (isCursorDebugEnabled()) {
            cursorDebugLog("resegmentParagraph - RESTORING cursor", { adjustedCursorOffset, nodeCount: newNodes.length })
          }
          let charCount = 0
          let cursorRestored = false
          for (const node of newNodes) {
            if ($isTextNode(node)) {
              const nodeLength = node.getTextContentSize()
              if (charCount + nodeLength >= adjustedCursorOffset) {
                const offsetInNode = adjustedCursorOffset - charCount
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
            cursorDebugLog("resegmentParagraph - WARNING: Cursor NOT restored! charCount:", charCount, "adjustedCursorOffset:", adjustedCursorOffset)
          }
        } else {
          if (isCursorDebugEnabled()) {
            cursorDebugLog("resegmentParagraph - NO cursor restoration (adjustedCursorOffset is null)")
          }
        }
      } finally {
        processingParagraphRef.current = false
        // NOTE: Do NOT clear processedParagraphKeysRef here.
        // The callers (processPendingParagraphs, forceResegmentAllParagraphs) manage
        // clearing before their processing loops. Clearing here via queueMicrotask
        // would wipe the guard after the synchronous editor.update() completes,
        // allowing subsequent NodeTransform triggers (from the new TextNodes we just
        // created) to re-queue paragraphs that were already processed — causing
        // cascading resegmentation and visible word "jumping".
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
      const autoSegments = measurePerformance(`wordBreak:userBreaks(${textWithoutUserBreaks.length} chars)`, () => getCachedSegments(textWithoutUserBreaks, breaker))
      
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
      
      // Find space positions for splitting (needed for spell checking when showBreaks is false)
      // We add break positions both before and after each space to create separate TextNodes
      const spaceBreakPositions: number[] = []
      for (let i = 0; i < text.length; i++) {
        if (/\s/.test(text[i])) {
          spaceBreakPositions.push(i) // Break before the space
          spaceBreakPositions.push(i + 1) // Break after the space (creates space as own segment)
        }
      }
      
      // ALWAYS include auto breaks for creating separate TextNodes (needed for spell checking per-word)
      // The visual break markers are controlled separately below (only shown when showBreaks=true or user break)
      // Space breaks are also always included to ensure proper word boundaries
      const allBreakPositions = [...new Set([...userBreakPositions, ...adjustedAutoBreakPositions, ...spaceBreakPositions])].sort((a, b) => a - b)
      
      if (isWordBreakerDebugEnabled()) {
        console.log(`[v0:wb] Auto breaks: ${autoBreakPositions.join(',')}, Adjusted: ${adjustedAutoBreakPositions.join(',')}, All (showBreaks=${showBreaks}): ${allBreakPositions.join(',')}`)
      }
      
      // Now create text nodes, splitting at all break positions
      const newNodes: LexicalNode[] = []
      let lastPos = 0
      
      for (let i = 0; i <= allBreakPositions.length; i++) {
        const endPos = i < allBreakPositions.length ? allBreakPositions[i] : text.length
        const segment = text.slice(lastPos, endPos)
        
        if (segment.length > 0) {
          // Get format at the start of this segment
          const { format, style } = getFormatAtPosition(formatRanges, lastPos)
          
          const newTextNode = $createTextNode(segment)
          newTextNode.setFormat(format)
          
          // Add a unique word ID to each node's style to prevent Lexical from merging
          // adjacent TextNodes into one DOM span. This is critical for spell/grammar
          // checking to work on individual words.
          const wordId = `--word-id: ${wordIdCounter++}`
          newTextNode.setStyle(style ? `${style}; ${wordId}` : wordId)
          
          processedNodesRef.current.add(newTextNode)
          newNodes.push(newTextNode)
          
          // Add break node after this segment if there's more content
          // Show visual breaks when:
          // - showBreaks is true (auto-word-break enabled) - show all breaks
          // - OR this is a user-inserted break position (always show user breaks visually)
          const currentBreakPos = i < allBreakPositions.length ? allBreakPositions[i] : -1
          const isUserBreak = currentBreakPos >= 0 && userBreakPositions.includes(currentBreakPos)
          
          if ((showBreaks || isUserBreak) && i < allBreakPositions.length) {
            const nextEndPos = i + 1 < allBreakPositions.length ? allBreakPositions[i + 1] : text.length
            const nextSegment = text.slice(endPos, nextEndPos)
            
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
        
        lastPos = endPos
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

    // Define the actual forceResegmentAllParagraphs function now that resegmentParagraph exists
    const forceResegmentAllParagraphs = () => {
      editor.update(() => {
        // Clear processed tracking to allow reprocessing
        processedNodesRef.current = new WeakSet<TextNode>()
        processedParagraphKeysRef.current = new Set<string>()

        // Get cursor position BEFORE resegmenting so we can restore it
        let cursorParagraphKey: string | null = null
        let cursorOffset: number | null = null

        const selection = $getSelection()
        if ($isRangeSelection(selection)) {
          const anchorNode = selection.anchor.getNode()
          // Find the paragraph containing the anchor
          let paragraphNode = anchorNode
          while (paragraphNode && !$isParagraphNode(paragraphNode)) {
            paragraphNode = paragraphNode.getParent() as ElementNode
          }

          if (paragraphNode && $isParagraphNode(paragraphNode)) {
            cursorParagraphKey = paragraphNode.getKey()

            // Calculate offset within the paragraph
            const paragraphChildren = paragraphNode.getChildren()
            let offset = 0

            if ($isTextNode(anchorNode)) {
              for (const child of paragraphChildren) {
                if (child === anchorNode) {
                  cursorOffset = offset + selection.anchor.offset
                  break
                }
                if ($isTextNode(child)) {
                  offset += child.getTextContentSize()
                }
              }
            } else if ($isKhmerBreakNode(anchorNode)) {
              // Cursor is on a break node (can happen with ZWS character)
              // Treat it as being at the end of the preceding text content
              for (const child of paragraphChildren) {
                if (child === anchorNode) {
                  cursorOffset = offset
                  break
                }
                if ($isTextNode(child)) {
                  offset += child.getTextContentSize()
                }
              }
            } else if ($isElementNode(anchorNode)) {
              // Cursor is on an element node (e.g., paragraph itself after backspace)
              // selection.anchor.offset is the child index
              const childIndex = selection.anchor.offset
              for (let i = 0; i < childIndex && i < paragraphChildren.length; i++) {
                const child = paragraphChildren[i]
                if ($isTextNode(child)) {
                  offset += child.getTextContentSize()
                }
              }
              cursorOffset = offset
            }

            if (isCursorDebugEnabled()) {
              cursorDebugLog("forceResegmentAllParagraphs - cursor saved", {
                cursorParagraphKey,
                cursorOffset,
                anchorNodeType: $isTextNode(anchorNode) ? 'text' : $isKhmerBreakNode(anchorNode) ? 'break' : $isElementNode(anchorNode) ? 'element' : 'other',
              })
            }
          }
        }

        const root = $getRoot()
        const children = root.getChildren()

        children.forEach((child) => {
          if ($isParagraphNode(child)) {
            const textContent = child.getTextContent()
            if (textContent && textContent.length > 0) {
              // Pass cursor offset only for the paragraph that contains the cursor
              const paragraphCursorOffset = child.getKey() === cursorParagraphKey ? cursorOffset : null
              resegmentParagraph(child, paragraphCursorOffset)
            }
          }
        })
      })

      // Clear guards after editor.update() returns (same pattern as processPendingParagraphs)
      setTimeout(() => {
        processedNodesRef.current = new WeakSet<TextNode>()
        processedParagraphKeysRef.current = new Set<string>()
      }, 0)
    }

    // Store ref so it can be called from command handler
    forceResegmentAllParagraphsRef.current = forceResegmentAllParagraphs

    // Store resegmentParagraph ref for use in debounced processor
    resegmentParagraphRef.current = resegmentParagraph

    // Process all pending paragraphs - called after debounce timer expires
    const processPendingParagraphs = () => {
      if (pendingParagraphsRef.current.size === 0) return

      if (isWordBreakerDebugEnabled()) {
        console.log(`[v0:wb] Processing ${pendingParagraphsRef.current.size} pending paragraphs`)
      }

      editor.update(() => {
        // Clear processed tracking to allow reprocessing
        processedNodesRef.current = new WeakSet<TextNode>()
        processedParagraphKeysRef.current = new Set<string>()

        const root = $getRoot()
        const pendingKeys = new Set(pendingParagraphsRef.current)
        pendingParagraphsRef.current.clear()

        // Calculate cursor position FRESH at resegmentation time
        // This avoids the stale-offset problem with debouncing
        let cursorParagraphKey: string | null = null
        let cursorOffset: number | null = null

        const selection = $getSelection()
        if ($isRangeSelection(selection)) {
          const anchorNode = selection.anchor.getNode()
          // Find the paragraph containing the anchor
          let paragraphNode = anchorNode
          while (paragraphNode && !$isParagraphNode(paragraphNode)) {
            paragraphNode = paragraphNode.getParent() as ElementNode
          }

          if (paragraphNode && $isParagraphNode(paragraphNode)) {
            cursorParagraphKey = paragraphNode.getKey()

            // Calculate offset within the paragraph
            const paragraphChildren = paragraphNode.getChildren()
            let offset = 0

            if ($isTextNode(anchorNode)) {
              for (const child of paragraphChildren) {
                if (child === anchorNode) {
                  cursorOffset = offset + selection.anchor.offset
                  break
                }
                if ($isTextNode(child)) {
                  offset += child.getTextContentSize()
                }
              }
            } else if ($isKhmerBreakNode(anchorNode)) {
              // Cursor is on a break node (can happen with ZWS character)
              // Treat it as being at the end of the preceding text content
              for (const child of paragraphChildren) {
                if (child === anchorNode) {
                  cursorOffset = offset
                  break
                }
                if ($isTextNode(child)) {
                  offset += child.getTextContentSize()
                }
              }
            } else if ($isElementNode(anchorNode)) {
              // Cursor is on an element node (e.g., paragraph itself after backspace)
              // selection.anchor.offset is the child index
              const childIndex = selection.anchor.offset
              for (let i = 0; i < childIndex && i < paragraphChildren.length; i++) {
                const child = paragraphChildren[i]
                if ($isTextNode(child)) {
                  offset += child.getTextContentSize()
                }
              }
              cursorOffset = offset
            }

            if (isCursorDebugEnabled()) {
              cursorDebugLog("processPendingParagraphs - cursor calculated", {
                cursorParagraphKey,
                cursorOffset,
                anchorNodeType: $isTextNode(anchorNode) ? 'text' : $isKhmerBreakNode(anchorNode) ? 'break' : $isElementNode(anchorNode) ? 'element' : 'other',
              })
            }
          }
        }

        // Process each pending paragraph
        const children = root.getChildren()
        for (const child of children) {
          if ($isParagraphNode(child) && pendingKeys.has(child.getKey())) {
            const textContent = child.getTextContent()
            if (textContent && textContent.length > 0) {
              // Only pass cursor offset for the paragraph containing the cursor
              const paragraphCursorOffset = child.getKey() === cursorParagraphKey ? cursorOffset : null
              resegmentParagraphRef.current(child, paragraphCursorOffset)
            }
          }
        }
      })

      // Clear guards AFTER editor.update() returns, using setTimeout(0).
      // At this point, all NodeTransforms triggered by the resegmentation have
      // already run (they execute synchronously within editor.update()).
      // The guards blocked cascade re-queuing during that window.
      // Now we lift the guards so the next user keystroke can trigger new
      // resegmentation. setTimeout(0) defers to the next macrotask, which is
      // after all microtasks but before the next user input event.
      setTimeout(() => {
        processedNodesRef.current = new WeakSet<TextNode>()
        processedParagraphKeysRef.current = new Set<string>()
      }, 0)
    }

    // Queue a paragraph for debounced resegmentation
    // Two-phase approach:
    // 1. Debounce: wait for typing to pause (RESEGMENT_DEBOUNCE_MS)
    // 2. Idle: run during browser idle time (requestIdleCallback)
    const queueResegment = (paragraphKey: string) => {
      pendingParagraphsRef.current.add(paragraphKey)

      // Clear existing timers
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      if (idleCallbackRef.current) {
        cancelIdleCallback(idleCallbackRef.current)
        idleCallbackRef.current = null
      }

      // Phase 1: Debounce - wait for typing to pause
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null
        // Phase 2: Schedule during idle time
        idleCallbackRef.current = scheduleIdleCallback(() => {
          idleCallbackRef.current = null
          processPendingParagraphs()
        })
      }, RESEGMENT_DEBOUNCE_MS)
    }

    const removeTransform = editor.registerNodeTransform(TextNode, (textNode: TextNode) => {
      // Fast path: skip if already processed
      if (processedNodesRef.current.has(textNode)) return
      if (processingParagraphRef.current) return

      const parent = textNode.getParent()
      if (!parent || !$isParagraphNode(parent)) return

      // Fast path: skip if paragraph already queued
      if (processedParagraphKeysRef.current.has(parent.getKey())) return

      // Get just this text node's content (cheap - single node, not whole paragraph)
      const textContent = textNode.getTextContent()

      // Skip if the text node is just whitespace
      if (isWhitespaceOnly(textContent)) {
        processedNodesRef.current.add(textNode)
        return
      }

      // FAST check for Khmer characters - check just this node's text, not entire paragraph
      // Use a simple loop instead of spreading to array (faster for large strings)
      let hasKhmerChars = false
      for (let i = 0; i < textContent.length; i++) {
        const code = textContent.charCodeAt(i)
        if (code >= 0x1780 && code <= 0x17FF) {
          hasKhmerChars = true
          break
        }
      }

      // Also check for user break characters (ZWSP, ZWJ, ZWNJ)
      const hasUserBreaks = USER_BREAK_REGEX.test(textContent)

      if (!hasKhmerChars && !hasUserBreaks) {
        processedNodesRef.current.add(textNode)
        return
      }

      // Mark the node as processed immediately to prevent repeated transforms
      processedNodesRef.current.add(textNode)

      // Queue for debounced resegmentation
      // Cursor offset is calculated FRESH at resegmentation time (inside processPendingParagraphs)
      // to avoid the stale-offset problem that would occur if we captured it here.
      queueResegment(parent.getKey())
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

    // Register command to force resegmentation (called after content is loaded)
    const removeResegmentCommand = editor.registerCommand(
      FORCE_RESEGMENT_COMMAND,
      () => {
        // Clear all processed tracking
        processedNodesRef.current = new WeakSet<TextNode>()
        processedParagraphKeysRef.current = new Set<string>()
        // Force resegmentation
        forceResegmentAllParagraphsRef.current()
        return true
      },
      COMMAND_PRIORITY_NORMAL,
    )

    return () => {
      clearTimeout(timeoutId)
      // Clean up debounce timers
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
      if (idleCallbackRef.current) {
        cancelIdleCallback(idleCallbackRef.current)
        idleCallbackRef.current = null
      }
      removeTransform()
      removePasteCommand()
      removeResegmentCommand()
    }
  }, [editor, breaker, showBreaks])

  return null
}
