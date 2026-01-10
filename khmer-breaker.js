/**
 * Khmer Text Breaking Utility
 * Based on ICU's Khmer Break Engine
 * 
 * This module implements dictionary-based word and line breaking for Khmer text,
 * following the algorithm used in ICU (International Components for Unicode).
 */

/**
 * Trie data structure for efficient dictionary lookup
 */
class TrieNode {
  constructor() {
    this.children = new Map();
    this.isWord = false;
    this.frequency = 0;
  }
}

class KhmerTrie {
  constructor() {
    this.root = new TrieNode();
  }

  /**
   * Insert a word into the trie
   */
  insert(word, frequency = 1) {
    let node = this.root;
    for (const char of word) {
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode());
      }
      node = node.children.get(char);
    }
    node.isWord = true;
    node.frequency = frequency;
  }

  /**
   * Find all possible word matches starting from a given position
   * Returns array of {length, frequency} objects
   */
  findMatches(text, startIndex, maxLength, ignoreSet = null) {
    const matches = [];
    let node = this.root;
    let currentLength = 0;
    let charCount = 0;

    for (let i = startIndex; i < text.length && currentLength < maxLength; i++) {
      const char = text[i];
      
      // Skip characters in ignore set (marks, etc.)
      if (ignoreSet && ignoreSet.has(char)) {
        currentLength++;
        continue;
      }

      if (!node.children.has(char)) {
        break;
      }

      node = node.children.get(char);
      charCount++;
      currentLength++;

      if (node.isWord) {
        matches.push({
          length: currentLength,
          charCount: charCount,
          frequency: node.frequency
        });
      }
    }

    return matches;
  }
}

/**
 * Khmer character sets and utilities
 */
class KhmerCharSets {
  constructor() {
    // Khmer Unicode ranges
    this.KHMER_BASE_START = 0x1780;
    this.KHMER_BASE_END = 0x17DD;
    
    // Khmer base consonants and independent vowels
    this.baseChars = new Set();
    for (let i = 0x1780; i <= 0x17A2; i++) {
      this.baseChars.add(String.fromCodePoint(i));
    }
    for (let i = 0x17A5; i <= 0x17B3; i++) {
      this.baseChars.add(String.fromCodePoint(i));
    }
    
    // Khmer dependent vowels and signs (marks)
    this.markChars = new Set();
    for (let i = 0x17B4; i <= 0x17D3; i++) {
      this.markChars.add(String.fromCodePoint(i));
    }
    
    // Khmer coeng (virama) - used to stack consonants
    this.viramaChars = new Set([
      String.fromCodePoint(0x17D2) // KHMER SIGN COENG
    ]);
    
    // Characters to ignore in dictionary matching
    this.ignoreChars = new Set([
      String.fromCodePoint(0x200B), // ZERO WIDTH SPACE
      String.fromCodePoint(0x200C), // ZERO WIDTH NON-JOINER
      String.fromCodePoint(0x200D), // ZERO WIDTH JOINER
      String.fromCodePoint(0x2060), // WORD JOINER
      String.fromCodePoint(0x00AD)  // SOFT HYPHEN
    ]);
    
    // Skip sets for line breaking
    this.skipStartChars = new Set([
      ...this.ignoreChars,
      '(', '[', '{', '"', "'", '«'
    ]);
    
    this.skipEndChars = new Set([
      ...this.ignoreChars,
      ')', ']', '}', '"', "'", '»', ',', '.', '!', '?', ':', ';'
    ]);
    
    // Punctuation that can start or end words
    this.puncChars = new Set([
      ...this.skipStartChars,
      ...this.skipEndChars
    ]);
  }

  isKhmerChar(char) {
    const code = char.codePointAt(0);
    return code >= this.KHMER_BASE_START && code <= this.KHMER_BASE_END;
  }

  isBase(char) {
    return this.baseChars.has(char);
  }

  isMark(char) {
    return this.markChars.has(char);
  }

  isVirama(char) {
    return this.viramaChars.has(char);
  }

  isIgnored(char) {
    return this.ignoreChars.has(char);
  }

  isSkipStart(char) {
    return this.skipStartChars.has(char);
  }

  isSkipEnd(char) {
    return this.skipEndChars.has(char);
  }

  isPunctuation(char) {
    return this.puncChars.has(char);
  }

  /**
   * Check if a character sequence forms a valid Khmer cluster
   * A cluster is: base + optional(virama + base) + optional marks
   */
  isClusterStart(text, index) {
    if (index >= text.length) return false;
    return this.isBase(text[index]);
  }

  /**
   * Find the end of a Khmer cluster starting at index
   */
  findClusterEnd(text, index) {
    if (!this.isClusterStart(text, index)) return index;
    
    let pos = index + 1;
    
    // Skip marks and virama+base combinations
    while (pos < text.length) {
      const char = text[pos];
      
      if (this.isMark(char)) {
        pos++;
      } else if (this.isVirama(char) && pos + 1 < text.length && this.isBase(text[pos + 1])) {
        pos += 2; // Skip virama + base
      } else {
        break;
      }
    }
    
    return pos;
  }
}

/**
 * Main Khmer Break Engine
 */
export class KhmerBreaker {
  constructor(dictionaryData = null) {
    this.trie = new KhmerTrie();
    this.charSets = new KhmerCharSets();
    this.minWordLength = 2; // Minimum characters for a valid word
    
    if (dictionaryData) {
      this.loadDictionary(dictionaryData);
    }
  }

  /**
   * Load dictionary data
   * @param {Array<{word: string, frequency: number}>} dictionaryData
   */
  loadDictionary(dictionaryData) {
    for (const entry of dictionaryData) {
      this.trie.insert(entry.word, entry.frequency || 1);
    }
  }

  /**
   * Load dictionary from text (word\tfrequency format)
   */
  loadDictionaryFromText(text) {
    const lines = text.split('\n');
    const data = [];
    
    for (const line of lines) {
      const parts = line.trim().split('\t');
      if (parts.length >= 2) {
        data.push({
          word: parts[0],
          frequency: parseInt(parts[1], 10) || 1
        });
      } else if (parts.length === 1 && parts[0]) {
        data.push({
          word: parts[0],
          frequency: 1
        });
      }
    }
    
    this.loadDictionary(data);
  }

  /**
   * Find word boundaries in Khmer text
   * Returns array of break positions (character indices)
   */
  findWordBreaks(text, startIndex = 0, endIndex = null) {
    if (endIndex === null) endIndex = text.length;
    
    const breaks = [];
    let pos = startIndex;

    // Skip leading non-Khmer characters
    while (pos < endIndex && !this.charSets.isKhmerChar(text[pos])) {
      pos++;
    }

    while (pos < endIndex) {
      // Skip whitespace and punctuation
      if (text[pos] === ' ' || this.charSets.isPunctuation(text[pos])) {
        breaks.push(pos);
        pos++;
        continue;
      }

      // Skip non-Khmer
      if (!this.charSets.isKhmerChar(text[pos])) {
        pos++;
        continue;
      }

      // Find word using dictionary
      const wordEnd = this.findBestWord(text, pos, endIndex);
      
      if (wordEnd > pos) {
        breaks.push(wordEnd);
        pos = wordEnd;
      } else {
        // No dictionary match, advance by one cluster
        pos = this.charSets.findClusterEnd(text, pos);
        if (pos < endIndex) {
          breaks.push(pos);
        }
      }
    }

    return breaks;
  }

  /**
   * Find the best word match using dictionary and scoring
   * Uses a simplified version of the ICU algorithm
   */
  findBestWord(text, startPos, endPos) {
    const maxWordLength = Math.min(20, endPos - startPos);
    const matches = this.trie.findMatches(text, startPos, maxWordLength);

    if (matches.length === 0) {
      // No dictionary match, return end of first cluster
      return this.charSets.findClusterEnd(text, startPos);
    }

    // Use longest match with preference for higher frequency
    let bestMatch = matches[0];
    for (const match of matches) {
      if (match.length > bestMatch.length || 
          (match.length === bestMatch.length && match.frequency > bestMatch.frequency)) {
        bestMatch = match;
      }
    }

    return startPos + bestMatch.length;
  }

  /**
   * Find line break opportunities in Khmer text
   * Returns array of break positions where lines can wrap
   */
  findLineBreaks(text, startIndex = 0, endIndex = null) {
    // For line breaking, we use word breaks as potential line break points
    const wordBreaks = this.findWordBreaks(text, startIndex, endIndex);
    const lineBreaks = [];

    // Filter word breaks for line breaking rules
    for (const breakPos of wordBreaks) {
      if (this.isValidLineBreak(text, breakPos)) {
        lineBreaks.push(breakPos);
      }
    }

    return lineBreaks;
  }

  /**
   * Check if a position is valid for line breaking
   */
  isValidLineBreak(text, pos) {
    if (pos === 0 || pos >= text.length) return false;

    const before = text[pos - 1];
    const after = text[pos];

    // Don't break after opening punctuation
    if (this.charSets.skipStartChars.has(before)) return false;
    
    // Don't break before closing punctuation
    if (this.charSets.skipEndChars.has(after)) return false;

    return true;
  }

  /**
   * Insert break opportunities into text for CSS word-break
   * Inserts zero-width spaces at valid break points
   */
  insertBreakOpportunities(text) {
    const breaks = this.findLineBreaks(text);
    const ZWSP = '\u200B';
    
    let result = '';
    let lastPos = 0;

    for (const breakPos of breaks) {
      result += text.substring(lastPos, breakPos) + ZWSP;
      lastPos = breakPos;
    }
    result += text.substring(lastPos);

    return result;
  }

  /**
   * Get word at position
   */
  getWordAtPosition(text, pos) {
    const breaks = this.findWordBreaks(text);
    
    let start = 0;
    let end = text.length;

    for (let i = 0; i < breaks.length; i++) {
      if (breaks[i] <= pos) {
        start = breaks[i];
      }
      if (breaks[i] > pos) {
        end = breaks[i];
        break;
      }
    }

    return {
      word: text.substring(start, end),
      start,
      end
    };
  }
}

export default KhmerBreaker;
