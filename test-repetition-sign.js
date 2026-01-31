/**
 * Test script for verifying the ៗ (repetition sign) handling in KhmerBreaker
 * Run with: node test-repetition-sign.js
 */

// Import the dictionary and KhmerBreaker
const fs = require('fs');
const path = require('path');

// Load dictionary
const dictionaryPath = path.join(__dirname, 'khmer-dictionary.compact.json');
const dictionary = JSON.parse(fs.readFileSync(dictionaryPath, 'utf-8'));

// Import the KhmerBreaker (assuming it's been compiled to JS)
// For TypeScript, you would need to compile it first or use ts-node
const { KhmerBreaker } = require('./lib/khmer-breaker.ts');

// Create breaker instance
const breaker = new KhmerBreaker(dictionary);

// Test cases
const testCases = [
  {
    input: 'ចំណោមអ្វីៗ',
    expected: ['ចំណោម', 'អ្វីៗ'],
    description: 'Should segment as "ចំណោម|អ្វីៗ" not "ចំ|ណោមអ្វីៗ"'
  },
  {
    input: 'លើអ្វីៗ',
    expected: ['លើ', 'អ្វីៗ'],
    description: 'Should segment as "លើ|អ្វីៗ"'
  },
  {
    input: 'ផ្សេងៗ',
    expected: ['ផ្សេងៗ'],
    description: 'Should keep "ផ្សេងៗ" together'
  },
  {
    input: 'មួយៗ',
    expected: ['មួយៗ'],
    description: 'Should keep "មួយៗ" together'
  },
  {
    input: 'ទៅៗ',
    expected: ['ទៅៗ'],
    description: 'Should keep "ទៅៗ" together'
  }
];

console.log('Testing Khmer Repetition Sign (ៗ) Handling\n');
console.log('='.repeat(60));

let passCount = 0;
let failCount = 0;

for (const testCase of testCases) {
  const result = breaker.getSegments(testCase.input);
  const passed = JSON.stringify(result) === JSON.stringify(testCase.expected);

  console.log(`\nTest: ${testCase.description}`);
  console.log(`Input:    "${testCase.input}"`);
  console.log(`Expected: [${testCase.expected.map(s => `"${s}"`).join(', ')}]`);
  console.log(`Got:      [${result.map(s => `"${s}"`).join(', ')}]`);
  console.log(`Status:   ${passed ? '✓ PASS' : '✗ FAIL'}`);

  if (passed) {
    passCount++;
  } else {
    failCount++;
  }
}

console.log('\n' + '='.repeat(60));
console.log(`\nResults: ${passCount} passed, ${failCount} failed`);

if (failCount === 0) {
  console.log('All tests passed! ✓');
  process.exit(0);
} else {
  console.log('Some tests failed! ✗');
  process.exit(1);
}
