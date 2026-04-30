# Aksara - Khmer Text Editor

A web-based text editor designed for the Khmer language. Aksara solves the unique challenge of editing Khmer text, which does not use spaces between words, by automatically segmenting text into words using a beam search algorithm backed by a frequency dictionary.

## Features

- **Automatic Word Breaking** - Beam search segmentation algorithm with a ~50k word frequency dictionary produces optimal word boundaries in real time
- **Spell Checking** - SymSpell-based spell checker running in a Web Worker for non-blocking performance (<200ms suggestions)
- **Grammar Checking** - Rule-based grammar validation with per-word highlighting
- **Voice Input** - Khmer speech-to-text via Web Speech API (Chrome/Chromium) with automatic punctuation and number conversion
- **Unicode Normalization** - Automatic Khmer combining mark reordering on paste, voice input, copy, and export
- **Document Management** - Create, save, and organize documents with auto-save and compression
- **ODT Export** - Export documents to OpenDocument format with proper Khmer font embedding
- **Rich Text Editing** - Bold, italic, underline, strikethrough, headings, and lists
- **Find & Replace** - Search and replace across documents
- **User Dictionary** - Add custom words, join/split word preferences that improve segmentation over time
- **Internationalization** - Full English and Khmer UI translations

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Editor**: [Lexical](https://lexical.dev/) (Meta's extensible text editor)
- **Database**: PostgreSQL
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) v4
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) (Radix primitives)
- **Voice Input**: Web Speech API (Chrome/Chromium)
- **Authentication**: [Better Auth](https://www.better-auth.com/)

## How Word Breaking Works

Khmer script does not use spaces between words. Aksara uses a beam search algorithm to find the globally optimal segmentation:

1. Text is scanned left-to-right, building candidate segmentations
2. Each candidate is scored using dictionary frequency (known words) and penalties (unknown words, invalid breaks)
3. The top 8 candidates (beam width) are kept at each step
4. Users can override with manual split (ZWSP) or join (Word Joiner) commands

Key parameters:
- **Beam Width**: 8 paths kept per step
- **OOV Penalty**: 6.0 for unknown words
- **Length Bonus**: 0.25 reward for longer dictionary matches
- COENG (U+17D2) and repetition sign (U+17D7) boundaries are never broken

## Getting Started

### Deploy on Railway

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/aksara-khmer-wordprocessor?referralCode=6EnXto&utm_medium=integration&utm_source=template&utm_campaign=generic)

### Manual Setup

**Prerequisites:** Node.js 18+, PostgreSQL

1. Clone the repository:
   ```bash
   git clone https://github.com/sbbic-khmer/aksara-khmer-word-processor.git
   cd aksara-khmer-word-processor
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the environment template and fill in your values:
   ```bash
   cp .env.example .env
   ```

4. Set up the database:
   ```bash
   npx prisma db push
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
app/                    # Next.js pages and API routes
components/lexical/     # Lexical editor plugins and nodes
  plugins/
    khmer-word-break-plugin.tsx    # Word segmentation
    khmer-spell-check-plugin.tsx   # Spell checking
    khmer-grammar-check-plugin.tsx # Grammar validation
    voice-input-plugin.tsx         # Voice text insertion
  nodes/
    khmer-break-node.tsx           # Visual word break markers
lib/
  khmer-breaker.ts                 # Beam search algorithm
  khmer-normalize.ts               # Unicode normalization
  odt-export-lexical.tsx           # ODT file generation
public/
  dictionaries/                    # Khmer frequency dictionaries
  workers/spell-check-worker.js    # SymSpell Web Worker
  lib/symspell-browser.js          # Browser SymSpell implementation
prisma/                            # Database schema
messages/                          # i18n translations (en, km)
```

## Contributing

Contributions are welcome! Please open an issue first to discuss what you'd like to change.

When submitting a pull request:
- Ensure `npm run build` passes with no errors
- Test your changes with Khmer text input
- If adding new UI strings, add them to `messages/en.json`

## License

[MIT](LICENSE)
