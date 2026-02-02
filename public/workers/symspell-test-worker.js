/**
 * SymSpell Test Worker
 * Tests the browser-compatible SymSpell implementation in a Web Worker context.
 */

// Import the browser-compatible SymSpell
import { SymSpell, Verbosity } from '/lib/symspell-browser.js';

let symspell = null;

self.onmessage = async function(e) {
  const { type, words, word, requestId, debug } = e.data;

  if (type === 'init') {
    try {
      console.log('[SymSpellTest] Initializing...');
      const startTime = performance.now();

      // Create SymSpell instance
      // maxEditDistance=2, prefixLength=7, countThreshold=1
      symspell = new SymSpell(2, 7, 1);

      // Load dictionary
      const response = await fetch('/dictionaries/km_symspell_dictionary.txt');
      if (!response.ok) {
        throw new Error(`Failed to fetch dictionary: ${response.status}`);
      }

      const text = await response.text();
      const lines = text.split('\n');

      let count = 0;
      for (const line of lines) {
        if (!line.trim()) continue;
        const parts = line.split('\t');
        const dictWord = parts[0];
        const freq = parseInt(parts[1], 10) || 1;

        if (dictWord) {
          symspell.createDictionaryEntry(dictWord, freq);
          count++;
        }
      }

      const elapsed = performance.now() - startTime;
      console.log(`[SymSpellTest] Loaded ${count} words in ${elapsed.toFixed(0)}ms`);

      self.postMessage({
        type: 'ready',
        wordCount: count,
        loadTime: elapsed
      });
    } catch (error) {
      console.error('[SymSpellTest] Init error:', error);
      self.postMessage({ type: 'error', error: error.message });
    }
    return;
  }

  if (type === 'check') {
    // Simple correctness check - is word in dictionary?
    if (!symspell) {
      self.postMessage({ type: 'error', error: 'SymSpell not initialized' });
      return;
    }

    const isCorrect = symspell.isCorrect(word);
    self.postMessage({ type: 'checkResult', word, isCorrect, requestId });
    return;
  }

  if (type === 'batchCheck') {
    if (!symspell) {
      self.postMessage({ type: 'error', error: 'SymSpell not initialized' });
      return;
    }

    const start = performance.now();
    const results = {};
    for (const w of words) {
      results[w] = symspell.isCorrect(w);
    }
    const elapsed = performance.now() - start;

    if (debug) {
      console.log(`[SymSpellTest] batchCheck(${words.length}) took ${elapsed.toFixed(1)}ms`);
    }

    self.postMessage({ type: 'batchCheckResult', results, elapsed, requestId });
    return;
  }

  if (type === 'suggest') {
    if (!symspell) {
      self.postMessage({ type: 'error', error: 'SymSpell not initialized' });
      return;
    }

    const start = performance.now();
    try {
      // Use CLOSEST verbosity to get all suggestions at the smallest edit distance
      const suggestions = symspell.lookup(word, Verbosity.CLOSEST, 2);
      const elapsed = performance.now() - start;

      // Extract just the terms, limit to 8 suggestions
      const terms = suggestions.slice(0, 8).map(s => s.term);

      if (debug) {
        console.log(`[SymSpellTest] suggest("${word}") -> ${terms.length} suggestions in ${elapsed.toFixed(1)}ms`);
      }

      self.postMessage({
        type: 'suggestions',
        word,
        suggestions: terms,
        elapsed,
        requestId
      });
    } catch (error) {
      console.error('[SymSpellTest] Suggest error:', error);
      self.postMessage({ type: 'error', error: error.message });
    }
    return;
  }
};

console.log('[SymSpellTest] Worker loaded');
