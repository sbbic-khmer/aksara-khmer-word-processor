/**
 * Voice-to-Text Post-Processing Rules
 *
 * This file contains rules that are applied to voice-to-text transcriptions
 * before they are inserted into the editor. Each rule is documented with
 * its purpose and can be easily enabled/disabled or extended.
 *
 * To add a new rule:
 * 1. Create a function that takes a string and returns a processed string
 * 2. Add it to the VOICE_TEXT_RULES array with a name and description
 * 3. The rules are applied in order, so consider dependencies between rules
 *
 * Note: These rules are applied BEFORE word replacements (preferred spellings),
 * so they work on the raw transcription text.
 */

// ============================================================================
// CONSTANTS & HELPERS
// ============================================================================

// Khmer numbers written out in words (index corresponds to the digit)
const KHMER_NUMBERS = [
  "សូន្យ", // 0
  "មួយ", // 1
  "ពីរ", // 2
  "បី", // 3
  "បួន", // 4
  "ប្រាំ", // 5
  "ប្រាំមួយ", // 6
  "ប្រាំពីរ", // 7
  "ប្រាំបី", // 8
  "ប្រាំបួន", // 9
]

// Khmer numeral digits
const KHMER_NUMERALS = ["០", "១", "២", "៣", "៤", "៥", "៦", "៧", "៨", "៩"]

// Khmer words that indicate the speaker is about to say punctuation
const PUNCTUATION_LEADER = "សញ្ញា" // Means "sign/symbol"

// Multi-word commands for punctuation (what speaker says → what punctuation to insert)
const MULTI_WORD_PUNCTUATION: Record<string, string[][]> = {
  "(": [
    ["បើក", "វង់", "ក្រចក"], // "open parenthesis"
  ],
  ")": [
    ["បិត", "វង់", "ក្រចក"], // "close parenthesis"
  ],
  "«": [
    ["បើក", "សញ្ញា", "អញ្ញ", "ប្រកាស"], // "open quotation marks"
    ["បើក", "សញ្ញា", "អាច", "ប្រកាស"], // alternate pronunciation
    ["សញ្ញា", "បើក", "អាច", "ប្រកាស"],
    ["សញ្ញា", "បើក", "ៗ", "ប្រកាស"],
    ["បើក", "សញ្ញា", "អញ្ញ"],
    ["បើក", "សញ្ញា", "ៗ"],
    ["សញ្ញា", "អញ្ញ", "បើក"],
    ["សញ្ញា", "ៗ", "បើក"],
  ],
  "»": [
    ["បិទ", "សញ្ញា", "អអាច", "ប្រកាស"], // "close quotation marks"
    ["បិទ", "សញ្ញា", "អញ្ញ", "ប្រកាស"],
    ["សញ្ញា", "បិទ", "អញ្ញ", "ប្រកាស"],
    ["សញ្ញា", "បិទ", "ៗ", "ប្រកាស"],
    ["បិទ", "សញ្ញា", "អញ្ញ"],
    ["បិទ", "សញ្ញា", "ៗ"],
    ["សញ្ញា", "អញ្ញ", "បិទ"],
    ["សញ្ញា", "ៗ", "បិទ"],
  ],
  "៖ ": [
    ["ចំណុច", "ពីរ", "គូស"], // "colon" (literally "two dots line")
  ],
}

// Single-word punctuation commands (requires "សញ្ញា" before it)
const SINGLE_WORD_PUNCTUATION: Record<string, string> = {
  ខណ្ឌ: "។ ", // "khan" → Khmer full stop
  ខ័ណ្ឌ: "។ ", // alternate spelling
  "។": "។ ", // sometimes speech recognition returns the actual punctuation
  សួរ: "? ", // "question"
  ឧទាន: "! ", // "exclamation"
}

// Punctuation that doesn't require "សញ្ញា" leader
const PUNCTUATION_NO_LEADER: Record<string, string> = {
  "ល៉ៈ ": "។ល។", // abbreviation marker
}

// Bible reference keywords
const KH_CHAPTER = "ជំពូក" // "chapter"
const KH_VERSE = "ខ" // "verse" (abbreviated)
const KH_NUMBER = "លេខ" // "number"

/**
 * Convert a number (as digit string or spelled-out Khmer) to Khmer numeral
 * Example: "5" → "៥", "មួយ" → "១"
 */
function convertToKhmerNumeral(input: string): string {
  // Check if it's a spelled-out Khmer number
  const spelledOutIndex = KHMER_NUMBERS.indexOf(input)
  if (spelledOutIndex !== -1) {
    return KHMER_NUMERALS[spelledOutIndex]
  }

  // Convert Arabic digits to Khmer numerals
  if (/^\d+$/.test(input)) {
    return input
      .split("")
      .map((digit) => KHMER_NUMERALS[Number.parseInt(digit)])
      .join("")
  }

  return input
}

// ============================================================================
// RULE DEFINITIONS
// ============================================================================

/**
 * Rule 1: Ensure space after end-of-sentence punctuation
 *
 * Purpose: When voice transcription produces text like "សួស្ដី។តើ", we want
 * to ensure there's a space after sentence-ending punctuation so it becomes
 * "សួស្ដី។ តើ" for better readability and proper word breaking.
 *
 * Affected punctuation:
 * - ។ (Khmer full stop / Khan)
 * - ? (Question mark)
 * - ! (Exclamation mark)
 * - ៕ (Khmer sign beyyal / paragraph end)
 * - ៖ (Khmer sign camnuc pii kuuh / colon-like)
 */
function ensureSpaceAfterSentenceEnd(text: string): string {
  // Regex matches sentence-ending punctuation followed by a non-space character
  const sentenceEndPunctuation = /([។?!៕៖])(?=[^\s])/g
  return text.replace(sentenceEndPunctuation, "$1 ")
}

/**
 * Rule 2: Convert multi-word punctuation commands to actual punctuation
 *
 * Purpose: When users say commands like "បើក វង់ ក្រចក" (open parenthesis),
 * convert it to the actual punctuation mark "(" with appropriate spacing.
 *
 * Examples:
 * - "បើក វង់ ក្រចក" → "("
 * - "បិត វង់ ក្រចក" → ")"
 * - "ចំណុច ពីរ គូស" → "៖ "
 */
function convertMultiWordPunctuation(text: string): string {
  let result = text

  // Iterate through each punctuation mark and its possible word combinations
  for (const [punctuation, wordCombinations] of Object.entries(MULTI_WORD_PUNCTUATION)) {
    for (const wordArray of wordCombinations) {
      // Create a regex pattern for this word combination
      // Example: ["បើក", "វង់", "ក្រចក"] becomes regex that matches these words
      // Use [\s\u200B]* to handle: no space, regular space, or ZWSP between words
      const pattern = wordArray.join("[\\s\\u200B]*")
      const regex = new RegExp(pattern, "gi")

      result = result.replace(regex, punctuation)
    }
  }

  return result
}

/**
 * Rule 3: Convert single-word punctuation commands (with leader word)
 *
 * Purpose: When users say "សញ្ញា" (sign/symbol) followed by a punctuation word
 * like "ខណ្ឌ" (khan/period) or "សួរ" (question), convert to actual punctuation.
 *
 * Examples:
 * - "សញ្ញា ខណ្ឌ" → "។ "
 * - "សញ្ញា សួរ" → "? "
 * - "សញ្ញា ឧទាន" → "! "
 */
function convertSingleWordPunctuation(text: string): string {
  let result = text

  // Handle punctuation WITH leader word "សញ្ញា"
  for (const [word, punctuation] of Object.entries(SINGLE_WORD_PUNCTUATION)) {
    // Match "សញ្ញា" followed by the punctuation word
    // Use \s* (zero or more) instead of \s+ to handle cases where voice recognition
    // returns the text with no space, regular space, or ZWSP between words
    const pattern = new RegExp(`${PUNCTUATION_LEADER}[\\s\\u200B]*${word}`, "gi")
    result = result.replace(pattern, punctuation)
  }

  // Handle punctuation WITHOUT leader word
  for (const [word, punctuation] of Object.entries(PUNCTUATION_NO_LEADER)) {
    const pattern = new RegExp(word, "gi")
    result = result.replace(pattern, punctuation)
  }

  return result
}

/**
 * Rule 4: Convert number commands to Khmer numerals
 *
 * Purpose: When users say "លេខ" (number) followed by a number (in Khmer words
 * or Arabic digits), convert it to Khmer numerals.
 *
 * Examples:
 * - "លេខ ៥" → "៥"
 * - "លេខ មួយ" → "១"
 * - "លេខ 12" → "១២"
 */
function convertNumberCommands(text: string): string {
  let result = text

  // Pattern: "លេខ" followed by either spelled-out Khmer number or Arabic digit(s)
  const khmerNumberWords = KHMER_NUMBERS.join("|")
  const pattern = new RegExp(`${KH_NUMBER}\\s+(${khmerNumberWords}|\\d+)`, "gi")

  result = result.replace(pattern, (match, numberPart) => {
    return convertToKhmerNumeral(numberPart)
  })

  return result
}

/**
 * Rule 5: Format Bible references (chapter:verse)
 *
 * Purpose: When users say "ជំពូក ៥ ខ ៨" (chapter 5 verse 8), convert it to
 * the standard reference format "៥:៨".
 *
 * Examples:
 * - "ជំពូក ៥ ខ ៨" → "៥:៨"
 * - "ជំពូក មួយ ខ ពីរ" → "១:២"
 */
function formatBibleReferences(text: string): string {
  let result = text

  // Match pattern: ជំពូក [number] ខ [number]
  // Number can be Khmer numeral, Arabic digit, or spelled-out Khmer word
  const khmerNumberWords = KHMER_NUMBERS.join("|")
  const numberPattern = `(${khmerNumberWords}|[០-៩]+|\\d+)`

  // Also handle common misspellings of "chapter" and "verse"
  const chapterPattern = "(ជំពូក|ចំពោះ|ជំពោះ)"
  const versePattern = "(ខ|ខល)"

  const pattern = new RegExp(`${chapterPattern}\\s+${numberPattern}\\s+${versePattern}\\s+${numberPattern}`, "gi")

  result = result.replace(pattern, (match, chapterWord, chapterNum, verseWord, verseNum) => {
    const chapter = convertToKhmerNumeral(chapterNum)
    const verse = convertToKhmerNumeral(verseNum)
    return `${chapter}:${verse}`
  })

  return result
}

// ============================================================================
// RULE REGISTRY
// ============================================================================

interface VoiceTextRule {
  name: string
  description: string
  enabled: boolean
  apply: (text: string) => string
}

/**
 * Array of all voice-to-text processing rules.
 * Rules are applied in the order they appear in this array.
 * Set 'enabled: false' to temporarily disable a rule without removing it.
 *
 * IMPORTANT: These rules run BEFORE word replacements (preferred spellings).
 * The word replacement system handles correcting misspelled words separately.
 */
const VOICE_TEXT_RULES: VoiceTextRule[] = [
  {
    name: "convertMultiWordPunctuation",
    description: "Converts multi-word punctuation commands like 'បើក វង់ ក្រចក' to '('",
    enabled: true,
    apply: convertMultiWordPunctuation,
  },
  {
    name: "convertSingleWordPunctuation",
    description: "Converts 'សញ្ញា ខណ្ឌ' to '។ ' and similar single-word punctuation commands",
    enabled: true,
    apply: convertSingleWordPunctuation,
  },
  {
    name: "convertNumberCommands",
    description: "Converts 'លេខ ៥' or 'លេខ មួយ' to Khmer numerals '៥' or '១'",
    enabled: true,
    apply: convertNumberCommands,
  },
  {
    name: "formatBibleReferences",
    description: "Converts 'ជំពូក ៥ ខ ៨' to standard reference format '៥:៨'",
    enabled: true,
    apply: formatBibleReferences,
  },
  {
    name: "ensureSpaceAfterSentenceEnd",
    description: "Adds a space after sentence-ending punctuation (។ ? ! ៕ ៖) if missing",
    enabled: true,
    apply: ensureSpaceAfterSentenceEnd,
  },
]

// ============================================================================
// MAIN PROCESSING FUNCTION
// ============================================================================

/**
 * Apply all enabled voice-to-text processing rules to the given text.
 *
 * @param text - The raw transcribed text from voice input
 * @returns The processed text with all enabled rules applied
 */
export function applyVoiceTextRules(text: string): string {
  if (!text) return text

  // Debug: log input with character codes to detect hidden characters
  console.log('[v0] applyVoiceTextRules input:', text)
  console.log('[v0] Input char codes:', [...text].map(c => c.charCodeAt(0).toString(16)).join(' '))

  let processedText = text

  // Apply each enabled rule in sequence
  for (const rule of VOICE_TEXT_RULES) {
    if (rule.enabled) {
      const before = processedText
      processedText = rule.apply(processedText)
      if (before !== processedText) {
        console.log(`[v0] Rule "${rule.name}" changed text from "${before}" to "${processedText}"`)
      }
    }
  }

  console.log('[v0] applyVoiceTextRules output:', processedText)
  return processedText
}

/**
 * Get list of all available rules (for debugging or UI display)
 */
export function getVoiceTextRules(): Pick<VoiceTextRule, "name" | "description" | "enabled">[] {
  return VOICE_TEXT_RULES.map(({ name, description, enabled }) => ({
    name,
    description,
    enabled,
  }))
}
