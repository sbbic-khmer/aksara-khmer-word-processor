/**
 * Protected Phrases for Khmer Word Breaking
 *
 * These phrases will never be split during word segmentation,
 * even if their individual parts exist in the dictionary.
 *
 * They are automatically wrapped with Word Joiner (WJ) characters
 * before segmentation to prevent splitting.
 *
 * Add new phrases as needed - they will be sorted longest-first
 * automatically to avoid overlapping issues.
 */

export const PROTECTED_PHRASES: string[] = [
  // Currently empty - add phrases as needed
  // Example: "\u1796\u17D2\u179A\u17C7\u1787\u17B6\u1798\u17D2\u1785\u17B6\u179F\u17CB" // ព្រះជាម្ចាស់
]
