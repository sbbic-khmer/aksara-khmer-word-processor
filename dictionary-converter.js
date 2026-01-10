/**
 * Khmer Dictionary Converter
 * 
 * Converts Khmer dictionary files to JSON format for use with the TipTap extension
 */

/**
 * Parse dictionary text file (word\tfrequency format)
 */
export function parseDictionaryText(text) {
  const lines = text.split('\n');
  const dictionary = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const parts = trimmed.split('\t');
    if (parts.length >= 2) {
      dictionary.push({
        word: parts[0],
        frequency: parseInt(parts[1], 10) || 1
      });
    } else if (parts.length === 1) {
      dictionary.push({
        word: parts[0],
        frequency: 1
      });
    }
  }

  return dictionary;
}

/**
 * Convert dictionary to compact JSON format
 */
export function dictionaryToJSON(dictionary) {
  return JSON.stringify(dictionary, null, 2);
}

/**
 * Convert dictionary to compact binary-like format
 * (for smaller file size)
 */
export function dictionaryToCompact(dictionary) {
  // Sort by frequency (descending) and word
  const sorted = dictionary.sort((a, b) => {
    if (b.frequency !== a.frequency) {
      return b.frequency - a.frequency;
    }
    return a.word.localeCompare(b.word);
  });

  // Create compact format: [word, freq, word, freq, ...]
  const compact = [];
  for (const entry of sorted) {
    compact.push(entry.word, entry.frequency);
  }

  return compact;
}

/**
 * Parse compact format back to dictionary
 */
export function compactToDictionary(compact) {
  const dictionary = [];
  for (let i = 0; i < compact.length; i += 2) {
    dictionary.push({
      word: compact[i],
      frequency: compact[i + 1]
    });
  }
  return dictionary;
}

/**
 * Merge multiple dictionaries
 */
export function mergeDictionaries(...dictionaries) {
  const wordMap = new Map();

  for (const dict of dictionaries) {
    for (const entry of dict) {
      const existing = wordMap.get(entry.word);
      if (existing) {
        existing.frequency += entry.frequency;
      } else {
        wordMap.set(entry.word, { ...entry });
      }
    }
  }

  return Array.from(wordMap.values());
}

/**
 * Filter dictionary by frequency threshold
 */
export function filterByFrequency(dictionary, minFrequency) {
  return dictionary.filter(entry => entry.frequency >= minFrequency);
}

/**
 * Get top N words by frequency
 */
export function getTopWords(dictionary, n) {
  return dictionary
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, n);
}

/**
 * Create a sample dictionary from the provided files
 */
export async function createSampleDictionary(files) {
  const dictionaries = [];

  for (const file of files) {
    const text = await file.text();
    const dict = parseDictionaryText(text);
    dictionaries.push(dict);
  }

  return mergeDictionaries(...dictionaries);
}

/**
 * Node.js script to convert dictionary files
 */
if (typeof process !== 'undefined' && process.argv) {
  const fs = require('fs');
  const path = require('path');

  async function convertDictionaryFiles(inputDir, outputFile) {
    const files = fs.readdirSync(inputDir);
    const dictionaries = [];

    for (const file of files) {
      if (file.endsWith('.txt')) {
        const filePath = path.join(inputDir, file);
        const text = fs.readFileSync(filePath, 'utf-8');
        const dict = parseDictionaryText(text);
        console.log(`Loaded ${dict.length} words from ${file}`);
        dictionaries.push(dict);
      }
    }

    const merged = mergeDictionaries(...dictionaries);
    console.log(`Total unique words: ${merged.length}`);

    // Filter low-frequency words to reduce size
    const filtered = filterByFrequency(merged, 2);
    console.log(`Words after filtering (freq >= 2): ${filtered.length}`);

    // Get top 10000 words for smaller dictionary
    const top = getTopWords(filtered, 10000);
    console.log(`Using top ${top.length} words`);

    // Save as JSON
    const json = dictionaryToJSON(top);
    fs.writeFileSync(outputFile, json, 'utf-8');
    console.log(`Dictionary saved to ${outputFile}`);

    // Also save compact version
    const compact = dictionaryToCompact(top);
    const compactFile = outputFile.replace('.json', '.compact.json');
    fs.writeFileSync(compactFile, JSON.stringify(compact), 'utf-8');
    console.log(`Compact dictionary saved to ${compactFile}`);
  }

  // Run if called directly
  if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length < 2) {
      console.log('Usage: node dictionary-converter.js <input-dir> <output-file>');
      process.exit(1);
    }

    convertDictionaryFiles(args[0], args[1]).catch(console.error);
  }
}

export default {
  parseDictionaryText,
  dictionaryToJSON,
  dictionaryToCompact,
  compactToDictionary,
  mergeDictionaries,
  filterByFrequency,
  getTopWords,
  createSampleDictionary,
};
