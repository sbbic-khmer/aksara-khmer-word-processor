/**
 * Find/Replace engine for Lexical editor with Khmer text support.
 *
 * Khmer text in the editor is stored as separate TextNodes per word,
 * with KhmerBreakNode decorators between them. This engine builds a
 * flat text map from paragraph nodes, runs searches across node
 * boundaries, and maps match positions back to TextNode + offset pairs.
 *
 * Zero-width characters (ZWSP, WJ, ZWJ, ZWNJ) are stripped from
 * the search target so users never need to think about them.
 */

import {
  $getRoot,
  $isTextNode,
  $isElementNode,
  $createRangeSelection,
  $setSelection,
  type TextNode,
  type ElementNode,
  type LexicalNode,
} from "lexical"
import { $isKhmerBreakNode } from "@/components/lexical/nodes/khmer-break-node"

// Characters invisible to users that we strip for searching
const INVISIBLE_CHARS = new Set(["\u200B", "\u200C", "\u200D", "\u2060"])

export interface TextNodeRange {
  node: TextNode
  /** Character offset within the TextNode's text content */
  startOffset: number
  endOffset: number
}

export interface FindMatch {
  /** Global match index across the whole document */
  index: number
  /** Which paragraph (by key) this match is in */
  paragraphKey: string
  /** The matched text (from the clean flat string) */
  matchText: string
  /** Ranges of TextNodes that this match spans */
  ranges: TextNodeRange[]
}

export interface FindOptions {
  query: string
  matchCase: boolean
  useRegex: boolean
}

/**
 * Describes one TextNode's position in the flat paragraph string.
 * `cleanStart` / `cleanEnd` are positions in the stripped (no invisible chars) string.
 * `rawStart` / `rawEnd` are positions in the original node text.
 */
interface NodeMapEntry {
  node: TextNode
  cleanStart: number
  cleanEnd: number
  cleanChars: string
  /** Maps a clean-string offset back to a raw-string offset within this node */
  cleanToRaw: number[]
}

/**
 * Build a flat text representation of a paragraph, stripping invisible
 * characters but keeping a mapping back to the original TextNode offsets.
 */
function buildParagraphMap(paragraph: ElementNode): {
  cleanText: string
  entries: NodeMapEntry[]
} {
  const entries: NodeMapEntry[] = []
  const textParts: string[] = []
  let cleanPos = 0

  const children = paragraph.getChildren()
  for (const child of children) {
    if (!$isTextNode(child)) continue // skip KhmerBreakNodes etc.

    const raw = child.getTextContent()
    const cleanToRaw: number[] = []
    let cleanChars = ""

    for (let i = 0; i < raw.length; i++) {
      if (!INVISIBLE_CHARS.has(raw[i])) {
        cleanToRaw.push(i)
        cleanChars += raw[i]
      }
    }

    if (cleanChars.length > 0) {
      entries.push({
        node: child,
        cleanStart: cleanPos,
        cleanEnd: cleanPos + cleanChars.length,
        cleanChars,
        cleanToRaw,
      })
      textParts.push(cleanChars)
      cleanPos += cleanChars.length
    }
  }

  return {
    cleanText: textParts.join(""),
    entries,
  }
}

/**
 * Map a match (start, end in clean text) back to TextNode ranges.
 */
function mapMatchToRanges(
  matchStart: number,
  matchEnd: number,
  entries: NodeMapEntry[]
): TextNodeRange[] {
  const ranges: TextNodeRange[] = []

  for (const entry of entries) {
    // Skip entries entirely before or after the match
    if (entry.cleanEnd <= matchStart) continue
    if (entry.cleanStart >= matchEnd) break

    // Clamp to the portion of this entry that overlaps the match
    const overlapStart = Math.max(matchStart, entry.cleanStart)
    const overlapEnd = Math.min(matchEnd, entry.cleanEnd)

    // Convert clean-string positions to offsets within this entry
    const localCleanStart = overlapStart - entry.cleanStart
    const localCleanEnd = overlapEnd - entry.cleanStart

    // Convert to raw TextNode offsets
    const rawStart = entry.cleanToRaw[localCleanStart]
    // For the end, we need the position AFTER the last matched character
    const lastCleanIdx = localCleanEnd - 1
    const rawEnd = entry.cleanToRaw[lastCleanIdx] + 1

    ranges.push({
      node: entry.node,
      startOffset: rawStart,
      endOffset: rawEnd,
    })
  }

  return ranges
}

/**
 * Escape a string for use in a RegExp.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * Find all matches in the document.
 * Must be called inside `editor.read()` or `editor.update()`.
 */
export function $findAll(options: FindOptions): FindMatch[] {
  const { query, matchCase, useRegex } = options
  if (!query) return []

  // Build regex from query
  let pattern: RegExp
  try {
    const flags = matchCase ? "g" : "gi"
    pattern = useRegex ? new RegExp(query, flags) : new RegExp(escapeRegex(query), flags)
  } catch {
    // Invalid regex — return no matches
    return []
  }

  const matches: FindMatch[] = []
  const root = $getRoot()
  let globalIndex = 0

  // Walk all paragraphs (and headings, list items — any ElementNode with text children)
  const walkElements = (node: LexicalNode) => {
    if ($isElementNode(node)) {
      const children = node.getChildren()
      const hasTextChildren = children.some((c) => $isTextNode(c))

      if (hasTextChildren) {
        // This is a "paragraph-level" element — search its text
        const { cleanText, entries } = buildParagraphMap(node)
        if (!cleanText) return

        let match: RegExpExecArray | null
        pattern.lastIndex = 0
        while ((match = pattern.exec(cleanText)) !== null) {
          const ranges = mapMatchToRanges(match.index, match.index + match[0].length, entries)
          if (ranges.length > 0) {
            matches.push({
              index: globalIndex++,
              paragraphKey: node.getKey(),
              matchText: match[0],
              ranges,
            })
          }
          // Prevent infinite loops on zero-length matches
          if (match[0].length === 0) {
            pattern.lastIndex++
          }
        }
      } else {
        // Recurse into child elements (e.g., ListNode → ListItemNode)
        for (const child of children) {
          walkElements(child)
        }
      }
    }
  }

  for (const child of root.getChildren()) {
    walkElements(child)
  }

  return matches
}

/**
 * Replace a single match with new text.
 * Must be called inside `editor.update()`.
 * Returns the length difference (newLen - oldLen) for offset adjustment.
 */
export function $replaceMatch(match: FindMatch, replacement: string): number {
  const { ranges } = match
  if (ranges.length === 0) return 0

  const originalLength = ranges.reduce((sum, r) => sum + (r.endOffset - r.startOffset), 0)

  if (ranges.length === 1) {
    // Simple case: match is within a single TextNode
    const { node, startOffset, endOffset } = ranges[0]
    const text = node.getTextContent()
    const newText = text.slice(0, startOffset) + replacement + text.slice(endOffset)
    node.setTextContent(newText)
  } else {
    // Match spans multiple TextNodes
    // Strategy: put the full replacement in the first node, clear matched portions of middle/last nodes
    const first = ranges[0]
    const last = ranges[ranges.length - 1]

    // First node: keep text before match, append replacement
    const firstText = first.node.getTextContent()
    first.node.setTextContent(firstText.slice(0, first.startOffset) + replacement)

    // Middle nodes: remove entirely (their entire content was part of the match)
    for (let i = 1; i < ranges.length - 1; i++) {
      ranges[i].node.remove()
    }

    // Last node: keep text after match
    const lastText = last.node.getTextContent()
    const remaining = lastText.slice(last.endOffset)
    if (remaining) {
      last.node.setTextContent(remaining)
    } else {
      last.node.remove()
    }
  }

  return replacement.length - originalLength
}

/**
 * Replace all matches. Processes in reverse order so positions stay valid.
 * Must be called inside `editor.update()`.
 * Returns the number of replacements made.
 */
export function $replaceAll(matches: FindMatch[], replacement: string): number {
  // Process in reverse order to avoid position shifts
  const reversed = [...matches].reverse()
  for (const match of reversed) {
    $replaceMatch(match, replacement)
  }
  return matches.length
}

/**
 * Select (highlight) a specific match by setting the Lexical selection to it.
 * This scrolls the match into view via the browser's native selection scrolling.
 * Must be called inside `editor.update()`.
 */
export function $selectMatch(match: FindMatch): void {
  const { ranges } = match
  if (ranges.length === 0) return

  const first = ranges[0]
  const last = ranges[ranges.length - 1]

  const selection = $createRangeSelection()
  selection.anchor.set(first.node.getKey(), first.startOffset, "text")
  selection.focus.set(last.node.getKey(), last.endOffset, "text")
  $setSelection(selection)
}
