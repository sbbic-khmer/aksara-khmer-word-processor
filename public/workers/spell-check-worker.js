/**
 * Spell Check Worker - SymSpell Edition
 *
 * Uses SymSpell algorithm for fast spelling suggestions.
 * Provides batch checking for efficient spell checking of multiple words.
 */

// Import browser-compatible SymSpell
import { SymSpell, Verbosity } from '/lib/symspell-browser.js';

// ============================================================================
// State
// ============================================================================

let symspell = null;
let debugMode = false;

// ============================================================================
// LRU Cache Implementation
// ============================================================================

const CACHE_MAX_SIZE = 1000;

/**
 * Simple LRU cache using Map's insertion order.
 * When accessing a cached value, we delete and re-add to move it to the end.
 */
class LRUCache {
  constructor(maxSize = CACHE_MAX_SIZE) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  get(key) {
    if (!this.cache.has(key)) return undefined;
    // Move to end (most recently used)
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key, value) {
    // If key exists, delete it first to update position
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Evict oldest (first) entry
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  has(key) {
    return this.cache.has(key);
  }

  clear() {
    this.cache.clear();
  }

  get size() {
    return this.cache.size;
  }
}

// Caches for correctness and suggestions
const correctCache = new LRUCache(CACHE_MAX_SIZE);
const suggestCache = new LRUCache(CACHE_MAX_SIZE);

// ============================================================================
// IndexedDB Cache for parsed dictionary entries
// ============================================================================

// Bump this version when the dictionary file changes to invalidate cache
const DICT_CACHE_VERSION = 1;
const IDB_DB_NAME = 'aksara-spellcheck';
const IDB_STORE_NAME = 'dictionary';
const IDB_KEY = 'km_symspell';

function openIDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
        db.createObjectStore(IDB_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getCachedEntries() {
  try {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE_NAME, 'readonly');
      const store = tx.objectStore(IDB_STORE_NAME);
      const request = store.get(IDB_KEY);
      request.onsuccess = () => {
        const result = request.result;
        if (result && result.version === DICT_CACHE_VERSION) {
          resolve(result.entries);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

async function setCachedEntries(entries) {
  try {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
      const store = tx.objectStore(IDB_STORE_NAME);
      store.put({ version: DICT_CACHE_VERSION, entries }, IDB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Non-fatal: caching failure doesn't affect functionality
  }
}

// ============================================================================
// Dictionary Loading
// ============================================================================

/**
 * Parse the raw TSV dictionary text into an array of [word, freq] pairs.
 */
function parseDictionaryText(text) {
  const entries = [];
  const lines = text.split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    const tabIndex = line.indexOf('\t');
    if (tabIndex === -1) continue;
    const word = line.substring(0, tabIndex);
    const freq = parseInt(line.substring(tabIndex + 1), 10) || 1;
    if (word) {
      entries.push([word, freq]);
    }
  }
  return entries;
}

async function initDictionary() {
  try {
    if (debugMode) {
      console.log('[SpellCheck] Loading SymSpell dictionary...');
    }
    const startTime = performance.now();

    // Create SymSpell instance
    // maxEditDistance=2: allows up to 2 character differences for suggestions
    // prefixLength=7: index prefix length for performance
    // countThreshold=1: minimum frequency to include word
    symspell = new SymSpell(2, 7, 1);

    // Try to load from IndexedDB cache first
    let entries = await getCachedEntries();
    let fromCache = false;

    if (entries) {
      fromCache = true;
      if (debugMode) {
        console.log(`[SpellCheck] Loading ${entries.length} entries from IndexedDB cache`);
      }
    } else {
      // Fetch and parse dictionary from network
      const response = await fetch('/dictionaries/km_symspell_dictionary.txt');
      if (!response.ok) {
        throw new Error(`Failed to fetch dictionary: ${response.status} ${response.statusText}`);
      }

      const text = await response.text();
      entries = parseDictionaryText(text);

      // Cache the parsed entries for next time (fire and forget)
      setCachedEntries(entries);
    }

    // Load entries into SymSpell
    let wordCount = 0;
    for (const [word, freq] of entries) {
      symspell.createDictionaryEntry(word, freq);
      wordCount++;
    }

    const elapsed = performance.now() - startTime;

    if (debugMode) {
      console.log(`[SpellCheck] Dictionary loaded: ${wordCount.toLocaleString()} words in ${elapsed.toFixed(0)}ms${fromCache ? ' (from IndexedDB cache)' : ''}`);
    }

    self.postMessage({
      type: 'ready',
      wordCount,
      loadTime: elapsed
    });
  } catch (error) {
    console.error('[SpellCheck] Init error:', error);
    self.postMessage({
      type: 'error',
      error: error.message || String(error)
    });
  }
}

// ============================================================================
// Spell Checking Functions
// ============================================================================

/**
 * Check if a word is correct (exists in dictionary).
 * Uses cache for performance.
 */
function isWordCorrect(word) {
  // Check cache first
  const cached = correctCache.get(word);
  if (cached !== undefined) {
    return cached;
  }

  // Check dictionary
  const isCorrect = symspell.isCorrect(word);
  correctCache.set(word, isCorrect);
  return isCorrect;
}

/**
 * Get spelling suggestions for a word.
 * Uses cache for performance.
 */
function getSuggestions(word, limit = 8) {
  // Check cache first
  const cached = suggestCache.get(word);
  if (cached !== undefined) {
    return { suggestions: cached.slice(0, limit), cached: true };
  }

  // Get suggestions from SymSpell
  // Verbosity.CLOSEST returns all suggestions at the smallest edit distance
  const results = symspell.lookup(word, Verbosity.CLOSEST, 2);

  // Extract terms and limit count
  const suggestions = results.slice(0, limit).map(item => item.term);

  // Cache the full results (before limiting)
  suggestCache.set(word, results.map(item => item.term));

  return { suggestions, cached: false };
}

/**
 * Batch check multiple words for correctness.
 * Returns a map of word -> isCorrect.
 */
function batchCheckWords(words) {
  const results = {};

  for (const word of words) {
    results[word] = isWordCorrect(word);
  }

  return results;
}

// ============================================================================
// Message Handler
// ============================================================================

self.onmessage = function(e) {
  const { type, word, words, requestId, debug } = e.data;

  // Initialize dictionary
  if (type === 'init') {
    if (debug !== undefined) {
      debugMode = debug;
    }
    initDictionary();
    return;
  }

  // Update debug mode
  if (type === 'setDebug') {
    debugMode = debug === true;
    if (debugMode) {
      console.log('[SpellCheck] Debug mode enabled');
    }
    return;
  }

  // Batch check multiple words
  if (type === 'batchCheck') {
    if (!symspell) {
      self.postMessage({
        type: 'batchCheckResult',
        requestId,
        results: {},
        error: 'Dictionary not loaded'
      });
      return;
    }

    try {
      const startTime = performance.now();
      const results = batchCheckWords(words || []);
      const elapsed = performance.now() - startTime;

      if (debugMode) {
        const wordCount = Object.keys(results).length;
        console.log(`[SpellCheck] batchCheck(${wordCount}) took ${elapsed.toFixed(1)}ms`);
      }

      self.postMessage({
        type: 'batchCheckResult',
        requestId,
        results,
        elapsed
      });
    } catch (error) {
      console.error('[SpellCheck] Batch check error:', error);
      self.postMessage({
        type: 'batchCheckResult',
        requestId,
        results: {},
        error: error.message || String(error)
      });
    }
    return;
  }

  // Check single word
  if (type === 'check') {
    if (!symspell) {
      self.postMessage({
        type: 'checkResult',
        requestId,
        word,
        isCorrect: true, // Default to correct if dictionary not loaded
        error: 'Dictionary not loaded'
      });
      return;
    }

    try {
      const isCorrect = isWordCorrect(word);
      self.postMessage({
        type: 'checkResult',
        requestId,
        word,
        isCorrect
      });
    } catch (error) {
      self.postMessage({
        type: 'checkResult',
        requestId,
        word,
        isCorrect: true,
        error: error.message || String(error)
      });
    }
    return;
  }

  // Get suggestions for a word
  if (type === 'suggest') {
    if (!symspell) {
      self.postMessage({
        type: 'suggestions',
        requestId,
        word,
        suggestions: [],
        error: 'Dictionary not loaded'
      });
      return;
    }

    try {
      const startTime = performance.now();
      const { suggestions, cached } = getSuggestions(word, 8);
      const elapsed = performance.now() - startTime;

      if (debugMode) {
        console.log(`[SpellCheck] suggest("${word}") -> ${suggestions.length} results in ${elapsed.toFixed(1)}ms${cached ? ' (cached)' : ''}`);
      }

      self.postMessage({
        type: 'suggestions',
        requestId,
        word,
        suggestions,
        elapsed,
        cached
      });
    } catch (error) {
      console.error('[SpellCheck] Suggest error:', error);
      self.postMessage({
        type: 'suggestions',
        requestId,
        word,
        suggestions: [],
        error: error.message || String(error)
      });
    }
    return;
  }

  // Clear caches
  if (type === 'clearCache') {
    correctCache.clear();
    suggestCache.clear();
    if (debugMode) {
      console.log('[SpellCheck] Caches cleared');
    }
    self.postMessage({ type: 'cacheCleared' });
    return;
  }
};

// Log when worker loads (only visible in dev tools)
if (debugMode) {
  console.log('[SpellCheck] Worker loaded (SymSpell edition)');
}
