/**
 * Protected Phrases for Khmer Word Breaking
 * 
 * These phrases should never be split during word segmentation,
 * even if their component parts exist in the dictionary.
 * They are automatically wrapped with Word Joiner (WJ) characters.
 * 
 * Add phrases here that are commonly incorrectly split.
 * The list is automatically sorted longest-first during processing
 * to avoid overlapping issues.
 */

export const PROTECTED_PHRASES: string[] = [
  // Religious terms
  "ព្រះជាម្ចាស់",  // God (Lord God)
  
  // Add more protected phrases below as needed:
  // "phrase",  // description
]
