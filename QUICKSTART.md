# Quick Start Guide: Khmer Text Breaking Extension

## 🚀 Get Started in 5 Minutes

### What You Get

A complete TipTap extension that provides proper Khmer word and line breaking using:
- Dictionary-based word boundary detection (10,000 Khmer words)
- ICU-based breaking algorithm
- Automatic zero-width space insertion
- Full TipTap integration

### Files Included

**Core Files:**
- `khmer-breaker.js` - Main breaking engine
- `khmer-tiptap-extension.js` - TipTap extension
- `dictionary-converter.js` - Dictionary utilities
- `convert-dictionary.js` - CLI converter tool

**Dictionaries:**
- `khmer-dictionary.json` - Full (10,000 words, 505 KB)
- `khmer-dictionary.mini.json` - Mini (1,000 words, 33 KB) **← Recommended for web**
- `khmer-dictionary.compact.json` - Compact format (124 KB)

**Examples:**
- `demo.html` - Standalone demo
- `tiptap-example.html` - Full TipTap integration
- `README.md` - Complete documentation
- `IMPLEMENTATION_GUIDE.md` - Technical details

## Quick Setup

### Option 1: Try the Demo (Fastest)

\`\`\`bash
# Open demo.html in your browser
open demo.html
\`\`\`

That's it! The demo uses ES6 modules and runs directly.

### Option 2: Basic Usage

\`\`\`html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body>
  <div id="editor"></div>

  <script type="module">
    import { KhmerBreaker } from './khmer-breaker.js';

    // Load dictionary
    const response = await fetch('./khmer-dictionary.mini.json');
    const dictionary = await response.json();

    // Create breaker
    const breaker = new KhmerBreaker(dictionary);

    // Use it
    const text = "សួស្តី នេះជាឧទាហរណ៍";
    const withBreaks = breaker.insertBreakOpportunities(text);
    
    document.getElementById('editor').textContent = withBreaks;
  </script>
</body>
</html>
\`\`\`

### Option 3: TipTap Integration

\`\`\`html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script src="https://unpkg.com/@tiptap/core@latest"></script>
  <script src="https://unpkg.com/@tiptap/starter-kit@latest"></script>
</head>
<body>
  <div id="editor"></div>

  <script type="module">
    import { KhmerBreaker } from './khmer-breaker.js';

    const dictionary = await fetch('./khmer-dictionary.mini.json')
      .then(r => r.json());

    const breaker = new KhmerBreaker(dictionary);

    const { Editor } = window.tiptap.core;
    const { StarterKit } = window.tiptap.starterKit;

    const editor = new Editor({
      element: document.querySelector('#editor'),
      extensions: [StarterKit],
      content: '<p>សួស្តី!</p>',
      onUpdate: ({ editor }) => {
        const text = editor.getText();
        if (/[\u1780-\u17FF]/.test(text)) {
          // Has Khmer text - process it
          const processed = breaker.insertBreakOpportunities(text);
          console.log('Processed:', processed);
        }
      }
    });
  </script>
</body>
</html>
\`\`\`

## Test It

### Test 1: Basic Breaking

\`\`\`javascript
import { KhmerBreaker } from './khmer-breaker.js';

const dict = await fetch('./khmer-dictionary.mini.json').then(r => r.json());
const breaker = new KhmerBreaker(dict);

const text = "នេះជាឧទាហរណ៍អត្ថបទ";
const breaks = breaker.findWordBreaks(text);

console.log('Break positions:', breaks);
console.log('Words:', breaks.map((pos, i, arr) => 
  text.substring(i === 0 ? 0 : arr[i-1], pos)
));
\`\`\`

### Test 2: Insert Breaks

\`\`\`javascript
const text = "សួស្តី នេះជាឧទាហរណ៍";
const withBreaks = breaker.insertBreakOpportunities(text);

console.log('Original:', text);
console.log('With breaks:', withBreaks);
console.log('Contains ZWSP:', withBreaks.includes('\u200B'));
\`\`\`

### Test 3: Analyze Text

\`\`\`javascript
const text = "ប្រទេសកម្ពុជា ជាប្រទេសមួយ";
const wordInfo = breaker.getWordAtPosition(text, 5);

console.log('Word at position 5:', wordInfo);
// Output: { word: "ប្រទេស", start: 0, end: 8 }
\`\`\`

## Common Use Cases

### 1. Process Text on Paste

\`\`\`javascript
editor.on('paste', ({ text }) => {
  if (/[\u1780-\u17FF]/.test(text)) {
    const processed = breaker.insertBreakOpportunities(text);
    editor.commands.insertContent(processed);
  }
});
\`\`\`

### 2. Auto-Process Khmer Content

\`\`\`javascript
function processKhmerContent(html) {
  const temp = document.createElement('div');
  temp.innerHTML = html;
  
  const textNodes = getTextNodes(temp);
  
  textNodes.forEach(node => {
    if (/[\u1780-\u17FF]/.test(node.textContent)) {
      const processed = breaker.insertBreakOpportunities(node.textContent);
      node.textContent = processed;
    }
  });
  
  return temp.innerHTML;
}
\`\`\`

### 3. Word Count for Khmer Text

\`\`\`javascript
function countKhmerWords(text) {
  const breaks = breaker.findWordBreaks(text);
  return breaks.length;
}

const text = "នេះជាអត្ថបទខ្មែរ";
console.log('Word count:', countKhmerWords(text)); // Output: 3
\`\`\`

## Troubleshooting

### Issue: "Failed to load dictionary"

**Solution:** Ensure dictionary file is in the same directory:
\`\`\`bash
ls khmer-dictionary.mini.json  # Should exist
\`\`\`

### Issue: Breaks not visible

**Solution:** Zero-width spaces are invisible. To verify:
\`\`\`javascript
const hasBreaks = text.includes('\u200B');
console.log('Has break points:', hasBreaks);
\`\`\`

### Issue: CORS error

**Solution:** Use a local server:
\`\`\`bash
npx serve .
# or
python -m http.server 8000
\`\`\`

## Next Steps

1. **Read Full Docs**: See `README.md` for complete API
2. **View Examples**: Open `demo.html` and `tiptap-example.html`
3. **Customize**: Check `IMPLEMENTATION_GUIDE.md` for customization
4. **Extend**: Add your own words to the dictionary

## Pro Tips

💡 **Use the mini dictionary** for web applications (33 KB vs 505 KB)

💡 **Debounce processing** - don't process on every keystroke

💡 **Cache results** - save processed text to avoid re-processing

💡 **Lazy load dictionary** - only load when Khmer text is detected

## Need Help?

1. Check `README.md` for API documentation
2. Review `IMPLEMENTATION_GUIDE.md` for technical details
3. Look at example files (`demo.html`, `tiptap-example.html`)
4. Test with the demo to see it working

## What's Next?

- Integrate into your TipTap editor
- Customize the dictionary for your domain
- Add language detection
- Implement auto-save with processed text

Happy coding! 🚀
