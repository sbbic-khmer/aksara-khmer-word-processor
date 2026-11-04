# Khmer Dictionaries

| File | Purpose |
|---|---|
| `km_frequency_dictionary.json` | Full word-breaking frequency dictionary, loaded after the starter dictionary in `lib/khmer-dictionary-data.ts` |
| `km_kcc_tagger.json` | Boundary tagger weights for the word breaker |
| `km_symspell_dictionary.txt` | Spell-check dictionary, one `word<TAB>frequency` per line |
| `khmer-multiple-spellings.txt` | Non-standard spelling rules for the grammar checker |
| `km_frequency_dictionary-large.json` | February 2026 snapshot of the frequency dictionary; the app does not load it |

`km_frequency_dictionary.json` and `km_kcc_tagger.json` are generated, so do not edit them by hand.

## Sources and licenses

These dictionaries build on SIL's [khmerlbdict](https://github.com/silnrsi/khmerlbdict) and the SBBIC Spelling Checker word list. See [THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md) for credits, license texts and how each dictionary was built.
