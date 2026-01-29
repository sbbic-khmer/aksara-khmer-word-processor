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
 * 
 * Examples of when to add phrases:
 * - Religious/sacred terms that should stay together
 * - Compound words that the dictionary splits incorrectly
 * - Proper nouns or titles
 * - Technical terms or acronyms
 */

export const PROTECTED_PHRASES: string[] = [
  // Religious terms
  "ព្រះជាម្ចាស់",  // God (Christian religious term)
  
  // Add more protected phrases here as needed
  // Examples:
  // "ព្រះពុទ្ធ",     // Buddha
  // "ព្រះអង្គ",      // His Majesty
]
