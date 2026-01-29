/**
 * Khmer Text Breaking Utility
 * Uses Beam Search algorithm for word segmentation with frequency dictionary.
 * Also supports Intl.Segmenter as secondary validation when available.
 *
 * Based on Unicode's Khmer orthographic syllable structure:
 * Khmer-syllable ::= (K H)* K M*
 * where K = consonant/independent vowel, H = COENG (្), M = combining marks
 *
 * CRITICAL RULE: You can NEVER break after a COENG (្, U+17D2).
 */

import { isDebugEnabled, isWordBreakerDebugEnabled } from "./debug"
import { PROTECTED_PHRASES } from "./protected-phrases"

const ZWSP = "\u200B"
const WJ = "\u2060" // Word Joiner - prevents breaks

// Closing punctuation stays with PREVIOUS segment
const CLOSING_PUNCTUATION = new Set([
  "។", // Khmer full stop
  "៕", // Khmer sign phnaek muan (similar to full stop)
  "៖", // Khmer sign camnuc pii kuuh
  "!", // exclamation
  "?", // question
  ")", // closing paren
  "]", // closing bracket
  "}", // closing brace
  "»", // closing guillemet
  "'", // closing single quote (U+2019)
  "›", // closing single guillemet
  '"', // ASCII double quote (U+0022)
  "\u201D", // right double quotation mark (U+201D)
  ",", // comma
  ".", // period
  ":", // colon
  ";", // semicolon
  "៚", // Khmer sign koomuut
  "'", // ASCII apostrophe (U+0027) - used in contractions like "don't"
])

// Opening punctuation stays with NEXT segment
const OPENING_PUNCTUATION = new Set([
  "(", // opening paren
  "[", // opening bracket
  "{", // opening brace
  "«", // opening guillemet
  "'", // opening single quote (U+2018)
  "‹", // opening single guillemet
  '"', // ASCII double quote (U+0022)
  "\u201C", // left double quotation mark (U+201C)
])

class TrieNode {
  children: Map<string, TrieNode>
  isWord: boolean
  frequency: number

  constructor() {
    this.children = new Map()
    this.isWord = false
    this.frequency = 0
  }
}

class KhmerTrie {
  root: TrieNode
  wordCount = 0
  maxWordLength = 0

  constructor() {
    this.root = new TrieNode()
  }

  insert(word: string, frequency = 1) {
    let node = this.root
    for (const char of word) {
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode())
      }
      node = node.children.get(char)!
    }
    node.isWord = true
    node.frequency = frequency
    this.wordCount++
    if (word.length > this.maxWordLength) {
      this.maxWordLength = word.length
    }
  }

  /**
   * Find the longest dictionary match starting at position
   */
  findLongestMatch(text: string, startIndex: number): { word: string; frequency: number } | null {
    let node = this.root
    let lastMatch: { word: string; frequency: number } | null = null
    let currentWord = ""

    const debugMatches: string[] = []

    for (let i = startIndex; i < text.length; i++) {
      const char = text[i]

      if (!node.children.has(char)) {
        break
      }

      node = node.children.get(char)!
      currentWord += char

      if (node.isWord) {
        lastMatch = {
          word: currentWord,
          frequency: node.frequency,
        }
        debugMatches.push(`"${currentWord}" (freq: ${node.frequency})`)
      }
    }

    if (isWordBreakerDebugEnabled()) {
      console.log(
        `[v0] findLongestMatch at pos ${startIndex} in "${text.substring(startIndex, startIndex + 10)}...": found matches: [${debugMatches.join(", ")}], returning: ${lastMatch ? `"${lastMatch.word}"` : "null"}`,
      )
    }

    return lastMatch
  }

  /**
   * Find ALL dictionary matches starting at position (not just longest).
   * Returns array of { length, frequency } for each match found.
   * Used by beam search to explore multiple segmentation paths.
   */
  findAllMatches(text: string, startIndex: number, maxLength: number): Array<{ length: number; frequency: number }> {
    const matches: Array<{ length: number; frequency: number }> = []
    let node = this.root
    let currentLength = 0

    for (let i = startIndex; i < text.length && currentLength < maxLength; i++) {
      const char = text[i]

      if (!node.children.has(char)) break
      node = node.children.get(char)!
      currentLength++

      if (node.isWord) {
        matches.push({ length: currentLength, frequency: node.frequency })
      }
    }
    return matches
  }

  hasWord(word: string): boolean {
    let node = this.root
    for (const char of word) {
      if (!node.children.has(char)) {
        return false
      }
      node = node.children.get(char)!
    }
    return node.isWord
  }

  getFrequency(word: string): number {
    let node = this.root
    for (const char of word) {
      if (!node.children.has(char)) {
        return 0
      }
      node = node.children.get(char)!
    }
    return node.isWord ? node.frequency : 0
  }
}

class KhmerCharSets {
  KHMER_BASE_START = 0x1780
  KHMER_BASE_END = 0x17ff
  COENG = "\u17D2"

  consonants: Set<string>
  independentVowels: Set<string>
  dependentVowels: Set<string>
  signs: Set<string>
  combiningMarks: Set<string>
  baseChars: Set<string>

  constructor() {
    this.consonants = new Set()
    for (let i = 0x1780; i <= 0x17a2; i++) {
      this.consonants.add(String.fromCodePoint(i))
    }

    this.independentVowels = new Set()
    for (let i = 0x17a3; i <= 0x17b3; i++) {
      this.independentVowels.add(String.fromCodePoint(i))
    }

    this.dependentVowels = new Set()
    for (let i = 0x17b4; i <= 0x17c5; i++) {
      this.dependentVowels.add(String.fromCodePoint(i))
    }

    this.signs = new Set()
    for (let i = 0x17c6; i <= 0x17d1; i++) {
      this.signs.add(String.fromCodePoint(i))
    }
    for (let i = 0x17d3; i <= 0x17dd; i++) {
      this.signs.add(String.fromCodePoint(i))
    }

    this.combiningMarks = new Set([...this.dependentVowels, ...this.signs])
    this.baseChars = new Set([...this.consonants, ...this.independentVowels])
  }

  isKhmerChar(char: string): boolean {
    const code = char.codePointAt(0)!
    return code >= this.KHMER_BASE_START && code <= this.KHMER_BASE_END
  }

  isBase(char: string): boolean {
    return this.baseChars.has(char)
  }

  isCombiningMark(char: string): boolean {
    return this.combiningMarks.has(char)
  }

  isCoeng(char: string): boolean {
    return char === this.COENG
  }

  /**
   * Check if character is punctuation (Khmer or common).
   * Khmer punctuation: ។ ៕ ៖ ៗ ៘ ៙ ៚ (U+17D4-U+17DA)
   */
  isPunctuation(char: string): boolean {
    const code = char.codePointAt(0)!
    // Khmer punctuation range
    if (code >= 0x17d4 && code <= 0x17da) return true
    // Common punctuation
    if ('.,;:!?()[]{}"\'-–—…'.includes(char)) return true
    return false
  }

  /**
   * Find end of syllable starting at index.
   */
  findSyllableEnd(text: string, index: number): number {
    if (index >= text.length) return index

    const char = text[index]

    if (!this.isBase(char)) {
      return index + 1
    }

    let pos = index + 1

    while (pos < text.length) {
      const c = text[pos]

      if (this.isCoeng(c)) {
        if (pos + 1 < text.length && this.isBase(text[pos + 1])) {
          pos += 2
          continue
        } else {
          pos++
          continue
        }
      }

      if (this.isCombiningMark(c)) {
        pos++
        continue
      }

      break
    }

    return pos
  }

  /**
   * Check if position is a valid break point.
   * Implements Unicode-compliant break rules for Khmer:
   * - Never break before combining marks (dependent vowels, signs, etc.)
   * - Never break before or after COENG
   * - Never break around Word Joiner (U+2060)
   */
  canBreakAt(text: string, index: number): boolean {
    if (index <= 0 || index >= text.length) return false

    const before = text[index - 1]
    const after = text[index]

    // 1) Word Joiner (U+2060) prevents breaking on either side
    if (before === WJ || after === WJ) return false

    // 2) CRITICAL: never break after or before COENG
    if (this.isCoeng(before) || this.isCoeng(after)) return false

    // 3) Unicode LB9: never break BEFORE a combining mark.
    // In Khmer this means dependent vowels, signs, and other marks
    // must stay attached to the previous base/cluster.
    if (this.isCombiningMark(after)) return false

    // 4) Don't break right after a combining mark unless the next char
    // begins a new cluster (is a base), or is whitespace/punctuation.
    // This prevents ugly breaks like "...VOWEL | non-base"
    if (this.isCombiningMark(before) && !this.isBase(after) && !/\s/.test(after) && !this.isPunctuation(after)) {
      return false
    }

    return true
  }

  /**
   * Count syllables in a word
   */
  countSyllables(word: string): number {
    let count = 0
    let pos = 0
    while (pos < word.length) {
      if (this.isKhmerChar(word[pos])) {
        const end = this.findSyllableEnd(word, pos)
        count++
        pos = end
      } else {
        pos++
      }
    }
    return count || 1
  }

  /**
   * Extract Khmer Character Clusters (KCCs) from text.
   * A KCC is the smallest unit that cannot be broken - similar to a grapheme cluster.
   * Returns array of cluster strings.
   * 
   * KCC structure: Base (COENG + Consonant)* (DependentVowels | Signs)*
   * Where Base = Consonant | IndependentVowel
   */
  extractClusters(text: string): string[] {
    const clusters: string[] = []
    let pos = 0
    
    while (pos < text.length) {
      const char = text[pos]
      
      // Non-Khmer characters are their own "cluster"
      if (!this.isKhmerChar(char)) {
        clusters.push(char)
        pos++
        continue
      }
      
      // Start of a KCC - must begin with a base character (consonant or independent vowel)
      if (this.isBase(char)) {
        const clusterEnd = this.findSyllableEnd(text, pos)
        clusters.push(text.substring(pos, clusterEnd))
        pos = clusterEnd
      } else {
        // Orphaned combining mark - take it as its own unit
        clusters.push(char)
        pos++
      }
    }
    
    return clusters
  }
}

function isPunctuation(char: string): boolean {
  return CLOSING_PUNCTUATION.has(char) || OPENING_PUNCTUATION.has(char)
}

export interface DictionaryEntry {
  word: string
  frequency: number
}

export class KhmerBreaker {
  private trie: KhmerTrie
  private charSets: KhmerCharSets
  private useIntlSegmenter: boolean

  // Short dictionary matches (1-2 chars) with low frequency are likely
  // just particles/letters, not real words worth breaking at.
  // This prevents breaking up transliterated foreign names like "វ៉កគ័រ" (Walker)
  private MIN_FREQUENCY_FOR_SINGLE_CHAR = 3000
  private MIN_FREQUENCY_FOR_TWO_CHAR = 1000

  constructor(dictionaryData: DictionaryEntry[] | null = null) {
    this.trie = new KhmerTrie()
    this.charSets = new KhmerCharSets()
    this.useIntlSegmenter = typeof Intl !== "undefined" && "Segmenter" in Intl

    if (dictionaryData) {
      this.loadDictionary(dictionaryData)
    }
  }

  loadDictionary(dictionaryData: DictionaryEntry[]) {
    if (isDebugEnabled()) {
      console.log("[v0] Loading dictionary with", dictionaryData.length, "entries")
    }
    for (const entry of dictionaryData) {
      if (entry.word && entry.word.length > 0) {
        this.trie.insert(entry.word, entry.frequency || 1)
      }
    }
    if (isDebugEnabled()) {
      console.log("[v0] Loaded", this.trie.wordCount, "words into trie")
    }
  }

  /**
   * Wrap protected phrases with Word Joiner (WJ) characters to prevent splitting.
   * Only applies if the text doesn't already contain WJ around the phrase.
   */
  private applyProtectedPhrases(text: string): string {
    if (!text || PROTECTED_PHRASES.length === 0) return text

    // Sort longest-first to avoid overlapping issues
    const phrases = [...PROTECTED_PHRASES].sort((a, b) => b.length - a.length)

    let result = text
    for (const phrase of phrases) {
      if (result.includes(phrase)) {
        // Check if already wrapped with WJ
        const wrappedPhrase = WJ + phrase + WJ
        if (!result.includes(wrappedPhrase)) {
          // Wrap the phrase with WJ on both sides to prevent splitting
          result = result.split(phrase).join(wrappedPhrase)
        }
      }
    }
    return result
  }

  /**
   * Merge adjacent segments if their concatenation forms a known dictionary word.
   * This is a "safety net" that fixes cases where segmentation split a compound word.
   * E.g., ["កោត", "ខ្លាច"] -> ["កោតខ្លាច"] if កោតខ្លាច is in the dictionary.
   */
  private mergeKnownCompounds(segments: string[]): string[] {
    if (segments.length <= 1) return segments

    const out: string[] = []
    let i = 0

    while (i < segments.length) {
      const seg = segments[i]

      // Don't merge whitespace or punctuation tokens
      if (/^\s+$/.test(seg) || this.isPurelyClosingPunctuation(seg) || this.isPurelyOpeningPunctuation(seg)) {
        out.push(seg)
        i++
        continue
      }

      let best = seg
      let bestJ = i

      // Try merging up to 4 tokens ahead
      let combined = seg
      for (let j = i + 1; j < Math.min(i + 5, segments.length); j++) {
        const next = segments[j]
        // Stop if next is whitespace or punctuation
        if (/^\s+$/.test(next) || this.isPurelyClosingPunctuation(next) || this.isPurelyOpeningPunctuation(next)) {
          break
        }
        combined += next
        if (this.trie.hasWord(combined)) {
          best = combined
          bestJ = j
        }
      }

      out.push(best)
      i = bestJ + 1
    }

    return out
  }

  /**
   * Main segmentation method.
   * Respects existing ZWSP characters as user-defined break points.
   * Respects Word Joiner (WJ) characters to keep words together.
   * Uses Intl.Segmenter if available, otherwise falls back to bidirectional matching.
   */
  getSegments(text: string): string[] {
    if (!text || text.length === 0) return []

    const userChunks = text.split(ZWSP)
    const allSegments: string[] = []

    for (const chunk of userChunks) {
      if (!chunk) continue // Skip empty chunks from consecutive ZWSP

      const chunkSegments = this.segmentChunk(chunk)
      allSegments.push(...chunkSegments)
    }

    // Post-processing pipeline
    const punctMerged = this.mergePunctuation(allSegments)
    return this.mergeKnownCompounds(punctMerged)
  }

  /**
   * Merge punctuation with appropriate segments:
   * - Closing punctuation attaches to PREVIOUS segment
   * - Opening punctuation attaches to NEXT segment
   * Simplified since edge punctuation is now handled in segmentChunk
   */
  private mergePunctuation(segments: string[]): string[] {
    if (segments.length <= 1) return segments

    const result: string[] = []

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]

      // Check if this segment is ONLY opening punctuation (standalone)
      if (this.isPurelyOpeningPunctuation(segment)) {
        // Attach to next segment if exists
        if (i + 1 < segments.length) {
          segments[i + 1] = segment + segments[i + 1]
          continue
        }
      }

      // Check if this segment is ONLY closing punctuation (standalone)
      if (this.isPurelyClosingPunctuation(segment)) {
        // Attach to previous segment if exists
        if (result.length > 0) {
          result[result.length - 1] += segment
          continue
        }
      }

      result.push(segment)
    }

    return result
  }

  /**
   * Check if segment is purely opening punctuation (no other content)
   */
  private isPurelyOpeningPunctuation(segment: string): boolean {
    if (!segment || segment.length === 0) return false
    for (const char of segment) {
      if (!OPENING_PUNCTUATION.has(char)) {
        return false
      }
    }
    return true
  }

  /**
   * Check if segment is purely closing punctuation (no other content)
   */
  private isPurelyClosingPunctuation(segment: string): boolean {
    if (!segment || segment.length === 0) return false
    for (const char of segment) {
      if (!CLOSING_PUNCTUATION.has(char)) {
        return false
      }
    }
    return true
  }

  /**
   * Segment a chunk of text (without existing ZWSP).
   * Extract punctuation before segmentation to prevent it from
   * interfering with dictionary lookups, then reattach after.
   * Handle WJ-joined regions as unsplittable units
   * Split by script first - don't break non-Khmer text like English
   */
  private segmentChunk(text: string): string[] {
    const parts = text.split(/(\s+)/)
    const segments: string[] = []

    for (const part of parts) {
      if (!part) continue
      if (/^\s+$/.test(part)) {
        segments.push(part)
        continue
      }

      const scriptRuns = splitByScript(part)

      for (const run of scriptRuns) {
        // Non-Khmer runs (like English) should not be word-broken
        if (!run.isKhmer) {
          segments.push(run.text)
          continue
        }

        // Check if this Khmer run has any actual Khmer characters
        const hasKhmer = [...run.text].some((c) => this.charSets.isKhmerChar(c))
        if (!hasKhmer) {
          segments.push(run.text)
          continue
        }

        const { leading, core, trailing } = this.extractPunctuation(run.text)

        if (!core) {
          // Only punctuation
          if (leading) segments.push(leading)
          if (trailing) segments.push(trailing)
          continue
        }

        // Apply protected phrases before splitting by WJ
        const protectedCore = this.applyProtectedPhrases(core)
        const joinedRegions = this.splitByWJ(protectedCore)
        const coreSegments: string[] = []

        for (const region of joinedRegions) {
          if (region.isJoined) {
            // WJ characters will be preserved in the text for future segmentations
            coreSegments.push(region.text)
          } else {
            // This region has no WJ - segment using beam search for globally optimal result
            const beamSegments = this.beamSegment(region.text)

            // If Intl.Segmenter is available, use it to validate/improve our result
            let finalSegments = beamSegments
            if (this.useIntlSegmenter) {
              try {
                const intlSegments = this.segmentWithIntl(region.text)
                finalSegments = this.improveWithIntlHints(beamSegments, intlSegments, region.text)
              } catch {
                // Fall through to beam search result
              }
            }
            coreSegments.push(...finalSegments)
          }
        }

        // Reattach punctuation to the segmented words for proper line-breaking.
        // Leading punctuation (e.g., «) attaches to the first word.
        // Trailing punctuation (e.g., ») attaches to the last word.
        // Note: Grammar/spell check replacement must handle stripping punctuation.
        if (coreSegments.length > 0) {
          if (leading) {
            coreSegments[0] = leading + coreSegments[0]
          }
          if (trailing) {
            coreSegments[coreSegments.length - 1] += trailing
          }
          segments.push(...coreSegments)
        } else {
          // No segments - just add punctuation
          if (leading) segments.push(leading)
          if (trailing) segments.push(trailing)
        }
      }
    }

    return segments
  }

  /**
   * Split text into regions that are joined (contain WJ) and not joined.
   * WJ is used as bookends: WJ + text + WJ marks a joined region
   */
  private splitByWJ(text: string): Array<{ text: string; isJoined: boolean }> {
    const hasWJ = text.includes(WJ)
    if (isWordBreakerDebugEnabled()) {
      console.log(`[v0] splitByWJ - input: "${text}" (length: ${text.length}, hasWJ: ${hasWJ})`)
    }

    if (!hasWJ) {
      return [{ text, isJoined: false }]
    }

    if (isWordBreakerDebugEnabled()) {
      console.log(`[v0] splitByWJ - WJ detected, processing joined regions`)
    }

    const regions: Array<{ text: string; isJoined: boolean }> = []
    let pos = 0

    while (pos < text.length) {
      const wjStart = text.indexOf(WJ, pos)

      if (wjStart === -1) {
        // No more WJ - rest is non-joined
        if (pos < text.length) {
          const remaining = text.substring(pos)
          if (remaining) {
            if (isWordBreakerDebugEnabled()) {
              console.log(`[v0] splitByWJ - non-joined remainder: "${remaining}"`)
            }
            regions.push({ text: remaining, isJoined: false })
          }
        }
        break
      }

      // Add non-joined text before this WJ
      if (wjStart > pos) {
        const beforeText = text.substring(pos, wjStart)
        if (isWordBreakerDebugEnabled()) {
          console.log(`[v0] splitByWJ - non-joined before: "${beforeText}"`)
        }
        regions.push({ text: beforeText, isJoined: false })
      }

      // Find the closing WJ
      const wjEnd = text.indexOf(WJ, wjStart + 1)

      if (wjEnd === -1) {
        // No closing WJ - treat rest as joined (backwards compatibility)
        const joinedText = text.substring(wjStart)
        if (isWordBreakerDebugEnabled()) {
          console.log(`[v0] splitByWJ - joined (no end marker): "${joinedText}"`)
        }
        regions.push({ text: joinedText, isJoined: true })
        break
      }

      // Extract the joined region (including the WJ bookends for preservation)
      const joinedText = text.substring(wjStart, wjEnd + 1)
      if (isWordBreakerDebugEnabled()) {
        console.log(`[v0] splitByWJ - joined region: "${joinedText}"`)
      }
      regions.push({ text: joinedText, isJoined: true })

      pos = wjEnd + 1
    }

    return regions
  }

  /**
   * Use Intl.Segmenter for word segmentation
   */
  private segmentWithIntl(text: string): string[] {
    const segmenter = new Intl.Segmenter("km", { granularity: "word" })
    const segments: string[] = []

    for (const { segment, isWordLike } of segmenter.segment(text)) {
      if (isWordLike || segment.trim()) {
        segments.push(segment)
      }
    }

    return segments
  }

  /**
   * Improve beam search segments with Intl.Segmenter hints.
   * Beam search takes priority, but Intl can help with unknown words.
   */
  private improveWithIntlHints(beamSegments: string[], intlSegments: string[], originalText: string): string[] {
    // If beam search produced good results (mostly known words), use them
    const knownWordCount = beamSegments.filter((s) => this.trie.hasWord(s)).length
    const knownWordRatio = knownWordCount / beamSegments.length

    // If most segments are known dictionary words, trust beam search
    if (knownWordRatio >= 0.5) {
      return beamSegments
    }

    // Otherwise, try to use Intl segments but validate against dictionary
    return this.validateAndMergeSegments(intlSegments)
  }

  /**
   * Validate segments against dictionary and merge where possible.
   * This corrects bad Intl.Segmenter splits by combining adjacent segments
   * that form known dictionary words.
   */
  private validateAndMergeSegments(segments: string[]): string[] {
    if (segments.length <= 1) return segments

    const result: string[] = []
    let i = 0

    while (i < segments.length) {
      // Try to find the longest dictionary match by combining consecutive segments
      let bestMatch = segments[i]
      let bestMatchLen = 1
      let combined = segments[i]

      // Try combining with next segments (up to 4 ahead for compound words)
      for (let j = i + 1; j < Math.min(i + 5, segments.length); j++) {
        combined += segments[j]

        if (this.trie.hasWord(combined)) {
          bestMatch = combined
          bestMatchLen = j - i + 1
        }
      }

      // Use the best match found
      result.push(bestMatch)
      i += bestMatchLen
    }

    return result
  }

  // ============ Beam Search Scoring Constants ============
  // Tuned to prevent over-splitting into syllables
  private static readonly BEAM_WIDTH = 8                     // Number of top paths to keep
  private static readonly MAX_WORD_LEN = 20                  // Maximum word length in characters
  private static readonly OOV_PENALTY = 6.0                  // Cost for unknown token
  private static readonly OOV_SINGLE_CLUSTER_PENALTY = 12.0  // Heavy cost for single-cluster OOV
  private static readonly BOUNDARY_PENALTY = 2.0             // Cost per token boundary
  private static readonly LENGTH_BONUS = 0.25                // Reward per character for longer tokens

  /**
   * Check if a position is a safe token boundary.
   * End-of-text is always safe; otherwise delegate to canBreakAt.
   */
  private isSafeBoundary(text: string, endIndex: number): boolean {
    if (endIndex <= 0 || endIndex >= text.length) return true
    return this.charSets.canBreakAt(text, endIndex)
  }

  // Maximum number of clusters to consume in an OOV chunk before forcing a break
  private static readonly MAX_OOV_CLUSTERS = 8

  /**
   * Find the end of an OOV (out-of-vocabulary) chunk starting at position.
   * Instead of consuming just one cluster, consume multiple clusters until:
   * - We hit whitespace or punctuation
   * - We find a "strong start" of a known dictionary word
   * - We hit the maximum cluster limit
   * 
   * This prevents over-splitting of unknown words like names, technical terms,
   * and transliterations (e.g., "វ៉កគ័រ" for "Walker" should stay as one chunk).
   */
  private findOovChunkEnd(text: string, start: number): number {
    const endPos = text.length
    let pos = start

    // Always consume at least one cluster
    pos = this.charSets.findSyllableEnd(text, pos)
    if (pos <= start) pos = start + 1

    // Ensure we're at a safe boundary after the first cluster
    while (pos < endPos && !this.isSafeBoundary(text, pos)) {
      pos++
    }

    let clusters = 1

    while (pos < endPos) {
      const ch = text[pos]

      // Stop at whitespace
      if (/\s/.test(ch)) break

      // Stop at punctuation
      if (this.charSets.isPunctuation(ch)) break

      // Stop if we can break here and there's a strong known word starting here
      if (this.charSets.canBreakAt(text, pos)) {
        const match = this.trie.findLongestMatch(text, pos)
        if (match && this.isSignificantWord(match)) {
          const matchEnd = pos + match.word.length
          // Verify the match ends at a valid boundary
          if (matchEnd >= endPos || this.charSets.canBreakAt(text, matchEnd)) {
            break // Found a significant known word, stop here
          }
        }
      }

      // Otherwise extend by another cluster
      const nextPos = this.charSets.findSyllableEnd(text, pos)
      if (nextPos > pos) {
        pos = nextPos
      } else {
        pos++
      }

      // Ensure we end at a safe boundary
      while (pos < endPos && !this.isSafeBoundary(text, pos)) {
        pos++
      }

      clusters++

      // Don't consume too many clusters - force a break at max
      if (clusters >= KhmerBreaker.MAX_OOV_CLUSTERS) break
    }

    return pos
  }

  /**
   * Beam search segmentation algorithm.
   * Explores multiple segmentation paths and keeps the top N best ones.
   * 
   * Simpler than full Viterbi but captures most of its benefit.
   * Key insight: greedy fails when you need to look 2-4 words ahead.
   */
  private beamSegment(text: string): string[] {
    if (!text || text.length === 0) return []
    
    const endPos = text.length
    
    // State: { pos: current position, score: cumulative score, pieces: tokens so far }
    type BeamState = { pos: number; score: number; pieces: string[] }
    let states: BeamState[] = [{ pos: 0, score: 0, pieces: [] }]
    
    while (states.length > 0) {
      // If every state finished, break
      if (states.every(s => s.pos >= endPos)) break
      
      const nextStates: BeamState[] = []
      
      for (const s of states) {
        if (s.pos >= endPos) {
          nextStates.push(s)
          continue
        }
        
        const ch = text[s.pos]
        
        // Handle whitespace as its own token
        if (ch === ' ' || ch === '\t' || ch === '\n') {
          nextStates.push({
            pos: s.pos + 1,
            score: s.score,
            pieces: [...s.pieces, ch],
          })
          continue
        }
        
        // Handle punctuation as its own token
        if (this.charSets.isPunctuation(ch)) {
          nextStates.push({
            pos: s.pos + 1,
            score: s.score,
            pieces: [...s.pieces, ch],
          })
          continue
        }
        
        // Handle non-Khmer characters (Latin, numbers, etc.)
        if (!this.charSets.isKhmerChar(ch)) {
          // Consume entire non-Khmer run
          let runEnd = s.pos + 1
          while (runEnd < endPos && !this.charSets.isKhmerChar(text[runEnd]) && 
                 text[runEnd] !== ' ' && !this.charSets.isPunctuation(text[runEnd])) {
            runEnd++
          }
          nextStates.push({
            pos: runEnd,
            score: s.score,
            pieces: [...s.pieces, text.slice(s.pos, runEnd)],
          })
          continue
        }
        
        // Khmer text - find dictionary matches
        const maxLen = Math.min(KhmerBreaker.MAX_WORD_LEN, endPos - s.pos)
        const matches = this.trie.findAllMatches(text, s.pos, maxLen)
        
        // Build candidate tokens
        const candidates: Array<{ len: number; score: number }> = []
        
        // Add dictionary matches as candidates (only if they end at safe boundaries)
        for (const m of matches) {
          const end = s.pos + m.length
          
          // Reject dictionary matches that would end at an illegal boundary
          if (!this.isSafeBoundary(text, end)) {
            continue
          }
          
          // Get the actual word to check significance
          const word = text.slice(s.pos, end)
          
          // Reject low-significance short tokens (prevents syllable splitting)
          // This uses the same thresholds as forwardMaximumMatch
          if (!this.isSignificantWord({ word, frequency: m.frequency })) {
            continue
          }
          
          let sc = Math.log((m.frequency || 1) + 1)
          sc += KhmerBreaker.LENGTH_BONUS * m.length
          sc -= KhmerBreaker.BOUNDARY_PENALTY
          candidates.push({ len: m.length, score: sc })
        }
        
        // OOV fallback: consume multiple clusters until next strong known word start
        // This prevents over-splitting of unknown words like names and transliterations
        const oovEnd = this.findOovChunkEnd(text, s.pos)
        const oovLen = oovEnd - s.pos
        
        // Count clusters in the OOV chunk for better scoring
        const oovClusters = this.charSets.extractClusters(text.slice(s.pos, oovEnd)).length
        
        // Scoring: penalize OOV, but give a small length bonus so one longer OOV chunk
        // is preferred over many small OOV chunks
        // Single-cluster OOVs still get heavier penalty to encourage dictionary matches
        const oovPenalty = oovClusters <= 1 
          ? KhmerBreaker.OOV_SINGLE_CLUSTER_PENALTY 
          : KhmerBreaker.OOV_PENALTY
        
        // Length bonus encourages keeping OOV chunks together
        const oovLengthBonus = KhmerBreaker.LENGTH_BONUS * oovLen * 0.5
        
        candidates.push({
          len: oovLen,
          score: -oovPenalty - KhmerBreaker.BOUNDARY_PENALTY + oovLengthBonus,
        })
        
        // Expand states with all candidates
        for (const c of candidates) {
          const piece = text.slice(s.pos, s.pos + c.len)
          nextStates.push({
            pos: s.pos + c.len,
            score: s.score + c.score,
            pieces: [...s.pieces, piece],
          })
        }
      }
      
      // Keep top BEAM_WIDTH states, favoring higher scores and further progress
      nextStates.sort((a, b) => (b.score - a.score) || (b.pos - a.pos))
      states = nextStates.slice(0, KhmerBreaker.BEAM_WIDTH)
    }
    
    // Choose best finished state (furthest position, then highest score)
    states.sort((a, b) => (b.pos - a.pos) || (b.score - a.score))
    const result = states[0]?.pieces ?? [text]
    
    if (isWordBreakerDebugEnabled()) {
      console.log(`[v0] beamSegment: "${text}" -> [${result.map((s) => `"${s}"`).join(", ")}]`)
    }
    
    return result
  }

  /**
   * Bidirectional Maximum Matching algorithm.
   * Compares forward and backward maximum matching and picks the better result.
   * Kept as fallback method.
   */
  private bidirectionalSegment(text: string): string[] {
    const forward = this.forwardMaximumMatch(text)
    const backward = this.backwardMaximumMatch(text)

    // Pick the better segmentation
    // Prefer: fewer segments > fewer single-char segments > backward
    if (forward.length < backward.length) {
      return forward
    } else if (forward.length > backward.length) {
      return backward
    } else {
      const forwardSingleChars = forward.filter((w) => this.charSets.countSyllables(w) === 1).length
      const backwardSingleChars = backward.filter((w) => this.charSets.countSyllables(w) === 1).length

      if (forwardSingleChars < backwardSingleChars) {
        return forward
      } else {
        return backward // Prefer backward when tied
      }
    }
  }

  /**
   * Forward Maximum Matching - scan left to right, take longest match
   */
  private forwardMaximumMatch(text: string): string[] {
    const segments: string[] = []
    let pos = 0

    if (isWordBreakerDebugEnabled()) {
      console.log(`[v0] forwardMaximumMatch starting for: "${text}"`)
    }

    while (pos < text.length) {
      // Try dictionary match first
      const match = this.trie.findLongestMatch(text, pos)

      const isValidMatch = match && match.word.length > 0 && this.isSignificantWord(match)

      if (isValidMatch) {
        // Verify the match ends at a valid break point
        const endPos = pos + match.word.length
        const canBreak = endPos >= text.length || this.charSets.canBreakAt(text, endPos)

        if (isWordBreakerDebugEnabled()) {
          console.log(
            `[v0] forwardMM pos=${pos}: found "${match.word}" (freq: ${match.frequency}), endPos=${endPos}, canBreakAt=${canBreak}`,
          )
        }

        if (canBreak) {
          segments.push(match.word)
          pos = endPos
          continue
        }
      } else if (match && isWordBreakerDebugEnabled()) {
        console.log(
          `[v0] forwardMM pos=${pos}: skipping low-freq short match "${match.word}" (freq: ${match.frequency})`,
        )
      }

      // No valid dictionary match - find next natural break point
      // instead of breaking into individual syllables/characters
      const unknownEnd = this.findNextBreakPoint(text, pos)
      const unknownSegment = text.substring(pos, unknownEnd)

      if (isWordBreakerDebugEnabled()) {
        console.log(
          `[v0] forwardMM pos=${pos}: no valid dict match, taking unknown segment to ${unknownEnd}: "${unknownSegment}"`,
        )
      }

      if (unknownEnd > pos) {
        segments.push(unknownSegment)
        pos = unknownEnd
      } else {
        // Fallback: take one character (should rarely happen)
        segments.push(text[pos])
        pos++
      }
    }

    if (isWordBreakerDebugEnabled()) {
      console.log(`[v0] forwardMaximumMatch result: [${segments.map((s) => `"${s}"`).join(", ")}]`)
    }

    return segments
  }

  /**
   * Find the next natural break point from the given position.
   * This looks for: end of text, whitespace, punctuation, or start of a known dictionary word.
   * Used to keep unknown words together instead of breaking into individual syllables.
   */
  private findNextBreakPoint(text: string, startPos: number): number {
    let pos = startPos

    // Always advance at least one syllable
    const firstSyllableEnd = this.charSets.findSyllableEnd(text, pos)
    if (firstSyllableEnd > pos) {
      pos = firstSyllableEnd
    } else {
      pos++ // at minimum advance one character
    }

    // Now scan forward looking for a natural break point
    while (pos < text.length) {
      const char = text[pos]

      // Stop at whitespace
      if (/\s/.test(char)) {
        break
      }

      // Stop at punctuation
      if (isPunctuation(char)) {
        break
      }

      // Stop if we can break here AND there's a significant dictionary word starting here
      if (this.charSets.canBreakAt(text, pos)) {
        const match = this.trie.findLongestMatch(text, pos)
        if (match && match.word.length > 0 && this.isSignificantWord(match)) {
          // Verify this match would end at a valid break point
          const matchEnd = pos + match.word.length
          if (matchEnd >= text.length || this.charSets.canBreakAt(text, matchEnd)) {
            break // Found a significant known word, stop here
          }
        }
      }

      // Continue to next syllable
      const nextSyllableEnd = this.charSets.findSyllableEnd(text, pos)
      if (nextSyllableEnd > pos) {
        pos = nextSyllableEnd
      } else {
        pos++
      }
    }

    return pos
  }

  /**
   * Backward Maximum Matching - scan right to left, take longest match
   */
  private backwardMaximumMatch(text: string): string[] {
    const segments: string[] = []
    let pos = text.length

    while (pos > 0) {
      let found = false

      // Try all possible start positions from longest to shortest
      const maxLen = Math.min(pos, this.trie.maxWordLength)
      for (let len = maxLen; len >= 1; len--) {
        const startPos = pos - len
        const candidate = text.substring(startPos, pos)

        const match = this.trie.findLongestMatch(text, startPos)
        if (match && match.word === candidate && this.isSignificantWord(match)) {
          if (startPos === 0 || this.charSets.canBreakAt(text, startPos)) {
            segments.unshift(candidate)
            pos = startPos
            found = true
            break
          }
        }
      }

      if (!found) {
        const unknownStart = this.findPreviousBreakPoint(text, pos)
        const unknownSegment = text.substring(unknownStart, pos)

        if (unknownStart < pos) {
          segments.unshift(unknownSegment)
          pos = unknownStart
        } else {
          // Fallback: take one character
          segments.unshift(text[pos - 1])
          pos--
        }
      }
    }

    return segments
  }

  /**
   * Find the previous natural break point from the given position (scanning backwards).
   * This looks for: start of text, whitespace, punctuation, or end of a known dictionary word.
   * Used to keep unknown words together instead of breaking into individual syllables.
   */
  private findPreviousBreakPoint(text: string, endPos: number): number {
    let pos = endPos

    // Always go back at least one syllable
    let syllableStart = pos - 1
    while (syllableStart > 0 && !this.charSets.canBreakAt(text, syllableStart)) {
      syllableStart--
    }
    pos = syllableStart

    // Now scan backward looking for a natural break point
    while (pos > 0) {
      const charBefore = text[pos - 1]

      // Stop after whitespace
      if (/\s/.test(charBefore)) {
        break
      }

      // Stop after punctuation
      if (isPunctuation(charBefore)) {
        break
      }

      // Stop if there's a SIGNIFICANT dictionary word ending just before pos
      if (this.charSets.canBreakAt(text, pos)) {
        // Check if there's a known word ending here by looking backwards
        const maxLen = Math.min(pos, this.trie.maxWordLength)
        for (let len = maxLen; len >= 1; len--) {
          const candidateStart = pos - len
          const candidate = text.substring(candidateStart, pos)

          const match = this.trie.findLongestMatch(text, candidateStart)
          if (match && match.word === candidate && this.isSignificantWord(match)) {
            if (candidateStart === 0 || this.charSets.canBreakAt(text, candidateStart)) {
              return pos // Found a significant known word ending here, stop
            }
          }
        }
      }

      // Continue to previous syllable
      syllableStart = pos - 1
      while (syllableStart > 0 && !this.charSets.canBreakAt(text, syllableStart)) {
        syllableStart--
      }
      pos = syllableStart
    }

    return pos
  }

  /**
   * Insert ZWSP between words, but avoid duplicating existing ZWSP.
   * Preserve spaces - don't add ZWSP around whitespace
   */
  insertBreakOpportunities(text: string): string {
    const segments = this.getSegments(text)

    // Join segments, but don't add ZWSP before/after whitespace segments
    let result = ""
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]
      const isWhitespace = /^\s+$/.test(segment)
      const prevIsWhitespace = i > 0 && /^\s+$/.test(segments[i - 1])

      // Add ZWSP between non-whitespace segments (not at start, not around whitespace)
      if (i > 0 && !isWhitespace && !prevIsWhitespace) {
        result += ZWSP
      }
      result += segment
    }

    return result
  }

  getTextWithBreaks(text: string): string {
    return this.insertBreakOpportunities(text)
  }

  /**
   * Extract leading and trailing punctuation from a text segment.
   * Returns { leading, core, trailing } where core is the text without edge punctuation.
   */
  private extractPunctuation(text: string): { leading: string; core: string; trailing: string } {
    let leading = ""
    let trailing = ""
    let start = 0
    let end = text.length

    // Extract leading punctuation
    while (start < text.length && (OPENING_PUNCTUATION.has(text[start]) || CLOSING_PUNCTUATION.has(text[start]))) {
      leading += text[start]
      start++
    }

    // Extract trailing punctuation
    while (end > start && (CLOSING_PUNCTUATION.has(text[end - 1]) || OPENING_PUNCTUATION.has(text[end - 1]))) {
      trailing = text[end - 1] + trailing
      end--
    }

    const core = text.substring(start, end)
    return { leading, core, trailing }
  }

  findWordBreaks(text: string): number[] {
    const segments = this.getSegments(text)
    const breaks: number[] = []
    let pos = 0

    for (const segment of segments) {
      const idx = text.indexOf(segment, pos)
      if (idx !== -1) {
        pos = idx + segment.length
        if (pos < text.length) {
          breaks.push(pos)
        }
      }
    }

    return breaks
  }

  findLineBreaks(text: string): number[] {
    return this.findWordBreaks(text).filter((pos) => this.charSets.canBreakAt(text, pos))
  }

  /**
   * Check if a dictionary match is significant enough to be treated as a word.
   * Short matches (1-2 clusters) need high frequency to be considered real words.
   * This prevents low-frequency single-character matches from breaking up
   * transliterated foreign names like "វ៉កគ័រ" (Walker).
   * 
   * Uses cluster count instead of JS string length for accurate thresholds,
   * since Khmer uses many combining marks that affect string length but not
   * the visual/linguistic length of the word.
   */
  private isSignificantWord(match: { word: string; frequency: number }): boolean {
    // Count clusters for more accurate length measurement
    const clusterCount = this.charSets.extractClusters(match.word).length
    
    // Long words (3+ clusters) are always significant
    if (clusterCount >= 3) {
      return true
    }

    // Most single Khmer clusters are consonants/vowels, not standalone words
    if (clusterCount <= 1) {
      return match.frequency >= this.MIN_FREQUENCY_FOR_SINGLE_CHAR
    }

    // Two-cluster words need moderately high frequency
    return match.frequency >= this.MIN_FREQUENCY_FOR_TWO_CHAR
  }
}

export default KhmerBreaker

const KHMER_RANGE_START = 0x1780
const KHMER_RANGE_END = 0x17ff
const KHMER_DIGIT_START = 0x17e0
const KHMER_DIGIT_END = 0x17e9

function isKhmerCodePoint(codePoint: number): boolean {
  return codePoint >= KHMER_RANGE_START && codePoint <= KHMER_RANGE_END
}

function isKhmerDigit(codePoint: number): boolean {
  return codePoint >= KHMER_DIGIT_START && codePoint <= KHMER_DIGIT_END
}

// Khmer letters are Khmer characters that are NOT digits
function isKhmerLetter(codePoint: number): boolean {
  return isKhmerCodePoint(codePoint) && !isKhmerDigit(codePoint)
}

function isNonBreakableScript(char: string): boolean {
  const cp = char.codePointAt(0) || 0
  // Latin, numbers, and other non-Khmer scripts shouldn't be word-broken
  // This includes: Basic Latin (0-127), Latin Extended, numbers, etc.
  // Exclude spaces and common punctuation which ARE breakable
  if (char === " " || OPENING_PUNCTUATION.has(char) || CLOSING_PUNCTUATION.has(char)) {
    return false
  }
  // If it's not Khmer and not whitespace/punctuation, it's a non-breakable script character
  return !isKhmerCodePoint(cp) && !/\s/.test(char)
}

/**
 * Split text into runs of Khmer vs non-Khmer (Latin/etc) characters.
 * Non-Khmer runs should not be word-broken.
 * Punctuation and spaces are treated as boundaries.
 * 
 * Additionally, Khmer digits (០-៩) following Khmer letters are split into
 * separate runs, so "តែ១១៣៤៤" becomes "តែ" | "១១៣៤៤".
 * Consecutive Khmer digits stay together.
 */
function splitByScript(text: string): Array<{ text: string; isKhmer: boolean }> {
  if (!text) return []

  const runs: Array<{ text: string; isKhmer: boolean }> = []
  let currentRun = ""
  let currentIsKhmer: boolean | null = null
  let currentIsKhmerDigit: boolean | null = null  // Track if current run is Khmer digits

  for (const char of text) {
    const cp = char.codePointAt(0) || 0
    const charIsKhmer = isKhmerCodePoint(cp)
    const charIsKhmerDigit = isKhmerDigit(cp)
    const isBreakPoint =
      char === " " || /\s/.test(char) || OPENING_PUNCTUATION.has(char) || CLOSING_PUNCTUATION.has(char)

    if (isBreakPoint) {
      // Flush current run
      if (currentRun) {
        runs.push({ text: currentRun, isKhmer: currentIsKhmer ?? false })
        currentRun = ""
        currentIsKhmer = null
        currentIsKhmerDigit = null
      }
      // Add the break character as its own run (treat as Khmer so it goes through normal processing)
      runs.push({ text: char, isKhmer: true })
    } else if (currentIsKhmer === null) {
      // Start new run
      currentRun = char
      currentIsKhmer = charIsKhmer
      currentIsKhmerDigit = charIsKhmerDigit
    } else if (charIsKhmer !== currentIsKhmer) {
      // Script changed (Khmer <-> non-Khmer) - flush and start new run
      if (currentRun) {
        runs.push({ text: currentRun, isKhmer: currentIsKhmer })
      }
      currentRun = char
      currentIsKhmer = charIsKhmer
      currentIsKhmerDigit = charIsKhmerDigit
    } else if (charIsKhmer && currentIsKhmer) {
      // Both are Khmer - check if transitioning from letter to digit
      // Split when: current run is Khmer letters AND new char is Khmer digit
      if (currentIsKhmerDigit === false && charIsKhmerDigit) {
        // Transitioning from Khmer letters to Khmer digits - split
        if (currentRun) {
          runs.push({ text: currentRun, isKhmer: true })
        }
        currentRun = char
        currentIsKhmerDigit = true
      } else {
        // Same type (both letters or both digits) or digits followed by letters - continue
        currentRun += char
        // Update digit status (digits can be followed by more digits or by letters)
        if (!charIsKhmerDigit) {
          currentIsKhmerDigit = false
        }
      }
    } else {
      // Continue current run (non-Khmer)
      currentRun += char
    }
  }

  // Flush final run
  if (currentRun) {
    runs.push({ text: currentRun, isKhmer: currentIsKhmer ?? false })
  }

  return runs
}
