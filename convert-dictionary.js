#!/usr/bin/env node

/**
 * Dictionary Converter Script
 * Converts Khmer dictionary text files to JSON format
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseDictionaryText(text) {
  const lines = text.split('\n');
  const dictionary = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const parts = trimmed.split('\t');
    if (parts.length >= 2) {
      const word = parts[0];
      const frequency = parseInt(parts[1], 10) || 1;
      
      // Validate it's actual Khmer text
      if (/[\u1780-\u17FF]/.test(word)) {
        dictionary.push({ word, frequency });
      }
    } else if (parts.length === 1 && /[\u1780-\u17FF]/.test(parts[0])) {
      dictionary.push({ word: parts[0], frequency: 1 });
    }
  }

  return dictionary;
}

function mergeDictionaries(...dictionaries) {
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

function filterByFrequency(dictionary, minFrequency) {
  return dictionary.filter(entry => entry.frequency >= minFrequency);
}

function getTopWords(dictionary, n) {
  return dictionary
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, n);
}

async function convertDictionaryFiles(inputDir, outputFile) {
  console.log(`Converting dictionaries from: ${inputDir}`);
  console.log(`Output file: ${outputFile}`);
  console.log('');

  const files = fs.readdirSync(inputDir);
  const dictionaries = [];

  for (const file of files) {
    if (file.endsWith('.txt')) {
      const filePath = path.join(inputDir, file);
      console.log(`Processing ${file}...`);
      
      try {
        const text = fs.readFileSync(filePath, 'utf-8');
        const dict = parseDictionaryText(text);
        console.log(`  ✓ Loaded ${dict.length} words`);
        dictionaries.push(dict);
      } catch (err) {
        console.log(`  ✗ Error: ${err.message}`);
      }
    }
  }

  if (dictionaries.length === 0) {
    console.error('No dictionary files found!');
    process.exit(1);
  }

  console.log('');
  console.log('Merging dictionaries...');
  const merged = mergeDictionaries(...dictionaries);
  console.log(`Total unique words: ${merged.length}`);

  console.log('Filtering low-frequency words...');
  const filtered = filterByFrequency(merged, 2);
  console.log(`Words after filtering (freq >= 2): ${filtered.length}`);

  console.log('Selecting top words...');
  const top = getTopWords(filtered, 10000);
  console.log(`Using top ${top.length} words`);

  console.log('');
  console.log('Saving dictionaries...');

  // Save full JSON
  const json = JSON.stringify(top, null, 2);
  fs.writeFileSync(outputFile, json, 'utf-8');
  console.log(`✓ Full dictionary saved: ${outputFile} (${(json.length / 1024).toFixed(2)} KB)`);

  // Save compact version
  const compact = [];
  for (const entry of top) {
    compact.push(entry.word, entry.frequency);
  }
  const compactFile = outputFile.replace('.json', '.compact.json');
  const compactJson = JSON.stringify(compact);
  fs.writeFileSync(compactFile, compactJson, 'utf-8');
  console.log(`✓ Compact dictionary saved: ${compactFile} (${(compactJson.length / 1024).toFixed(2)} KB)`);

  // Save minified version (top 1000)
  const mini = getTopWords(top, 1000);
  const miniFile = outputFile.replace('.json', '.mini.json');
  const miniJson = JSON.stringify(mini);
  fs.writeFileSync(miniFile, miniJson, 'utf-8');
  console.log(`✓ Mini dictionary saved: ${miniFile} (${(miniJson.length / 1024).toFixed(2)} KB)`);

  console.log('');
  console.log('✅ Conversion complete!');
  console.log('');
  console.log('Dictionary statistics:');
  console.log(`  - Total words: ${top.length}`);
  console.log(`  - Average frequency: ${(top.reduce((sum, e) => sum + e.frequency, 0) / top.length).toFixed(0)}`);
  console.log(`  - Highest frequency: ${top[0].frequency} (${top[0].word})`);
  console.log(`  - Lowest frequency: ${top[top.length - 1].frequency} (${top[top.length - 1].word})`);
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
  // Default: convert the khmerlbdict files
  const inputDir = path.join(__dirname, 'khmerlbdict-master', 'src');
  const outputFile = path.join(__dirname, 'khmer-dictionary.json');
  
  if (fs.existsSync(inputDir)) {
    convertDictionaryFiles(inputDir, outputFile).catch(console.error);
  } else {
    console.error('Error: khmerlbdict-master/src directory not found!');
    console.error('');
    console.error('Usage: node convert-dictionary.js [input-dir] [output-file]');
    console.error('');
    console.error('Example:');
    console.error('  node convert-dictionary.js ./khmerlbdict-master/src ./khmer-dictionary.json');
    process.exit(1);
  }
} else if (args.length >= 2) {
  convertDictionaryFiles(args[0], args[1]).catch(console.error);
} else {
  console.error('Usage: node convert-dictionary.js <input-dir> <output-file>');
  console.error('');
  console.error('Example:');
  console.error('  node convert-dictionary.js ./khmerlbdict-master/src ./khmer-dictionary.json');
  process.exit(1);
}
