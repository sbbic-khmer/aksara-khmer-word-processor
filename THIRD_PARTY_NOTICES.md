# Third-Party Notices

Aksara is released under the [MIT License](LICENSE). This file credits the third-party data and code copied into this repository and records how the dictionaries were built from them. npm dependencies are not listed here; they ship with their own licenses.

| Component | Used in | License |
|---|---|---|
| [khmerlbdict](https://github.com/silnrsi/khmerlbdict) by SIL NRSI | Word-breaking dictionaries; spell-check frequencies | MIT |
| [Unicode CLDR](https://github.com/unicode-org/cldr), through khmerlbdict's `places.txt` | Same as khmerlbdict | Unicode-3.0 |
| [SBBIC](http://www.sbbic.org) Spelling Checker word list (`km_KH.dic`) | Spell-check word list | MIT, as described below |
| Multiple-spellings list by SBBIC (Nathan Wells) | `public/dictionaries/khmer-multiple-spellings.txt` | MIT |
| [node-symspell-new](https://github.com/Ravikumar-Pawar/node-symspell-new) | `public/lib/symspell-browser.js` | MIT |
| [SymSpell](https://github.com/wolfgarbe/SymSpell) by Wolf Garbe | `public/lib/symspell-browser.js` | MIT |
| [shadcn/ui](https://github.com/shadcn-ui/ui) | `components/ui/` | MIT |

## Word-breaking dictionaries

`public/dictionaries/km_frequency_dictionary.json`, `public/dictionaries/km_frequency_dictionary-large.json` and `lib/khmer-dictionary-data.ts` derive from the Khmer LineBreaking Dictionary (khmerlbdict) by SIL NRSI.

**Input:** commit [`54abc6b`](https://github.com/silnrsi/khmerlbdict/tree/54abc6b87f4ffa6a0c95c09836c7c86648002273) (16 March 2016), downloaded on 8 January 2026. Aksara used all nine files in `src/`: `DFD.txt`, `HC.txt`, `KHOV.txt`, `KHSV.txt`, `TD.txt`, `names.txt`, `places.txt`, `seafreq.txt` and `villages.txt`. It did not use the generated `khmerdict.txt`.

**Build history:**

1. **January 2026:** The nine files were merged by summing their raw frequencies with equal weights. Word-only entries counted as 1, anything below 2 was dropped, and the top 10,000 words were kept. The Makefile weights, log scaling and spelling expansions from `tools/freqdict.py` were not applied.
2. **February 2026:** The nine files were merged again with a frequency list from seven Khmer books, this time giving word-only entries a frequency of 200. The book list was built with a Python 3 adaptation of `tools/freqdict.py`, using linear frequencies and spelling expansions, so spelling variants in these dictionaries come from that list rather than from SIL's `src/` files.
3. **February and March 2026:** The merged list was cleaned, reduced to about 30,000 words with AI-assisted filtering, and then edited by hand.
4. **July 2026:** `scripts/build-dictionary.ts` applied word-boundary evidence from a corpus of typeset Khmer books. It added 62 words, raised 1,173 frequencies and lowered 640 entries to a frequency of 1.

About 81% of the 29,599 entries in the July 2026 dictionary also appear in SIL's `src/` files. Aksara's frequencies are not comparable with `tools/freqdict.py` output. The books themselves are not distributed with Aksara; only word frequencies derived from them are.

SIL's [README](https://github.com/silnrsi/khmerlbdict/blob/master/README.md) describes the upstream sources of khmerlbdict, including the SEALang Khmer word frequency list, Unicode CLDR, Khmer Bible word lists and Khmer book word lists. Those sources remain subject to any terms set by their owners.

## Spell-check dictionary

The word list in `public/dictionaries/km_symspell_dictionary.txt` comes from `km_KH.dic` in the SBBIC Spelling Checker for OpenOffice. The file is identical in versions 1.82, 1.83 and 1.90 of that package. Its license file names SBBIC as the author and says the checker was based on the Chuon Nath and Headley dictionaries and on KhmerOS's and SBBIC's spelling wordlists.

The SBBIC Spelling Checker package is distributed under GPLv3. SBBIC also makes this word list available under the [MIT License](LICENSE), and that is the license that applies to it in Aksara.

The frequencies in this file come from the February 2026 merged list described above. Words with no frequency evidence were given a default of 10.

## Multiple-spellings list

`public/dictionaries/khmer-multiple-spellings.txt` was created by SBBIC (Nathan Wells) and is available under the [MIT License](LICENSE).

## License texts

### MIT License

This license applies to the following components:

```
khmerlbdict:        Copyright (c) 2015 SIL NRSI
node-symspell-new:  Copyright (c) 2019 Mathieu Triay
                    (with 2024 enhancements by Ravikumar Pawar)
SymSpell:           Copyright (c) 2018 Wolf Garbe
shadcn/ui:          Copyright (c) 2023 shadcn
```

```
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Unicode License v3

This license applies to the Unicode CLDR data included through khmerlbdict.

```
COPYRIGHT AND PERMISSION NOTICE

Copyright © 2001–2026 Unicode, Inc.

NOTICE TO USER: Carefully read the following legal agreement. BY
DOWNLOADING, INSTALLING, COPYING OR OTHERWISE USING DATA FILES, AND/OR
SOFTWARE, YOU UNEQUIVOCALLY ACCEPT, AND AGREE TO BE BOUND BY, ALL OF THE
TERMS AND CONDITIONS OF THIS AGREEMENT. IF YOU DO NOT AGREE, DO NOT
DOWNLOAD, INSTALL, COPY, DISTRIBUTE OR USE THE DATA FILES OR SOFTWARE.

Permission is hereby granted, free of charge, to any person obtaining a
copy of data files and any associated documentation (the "Data Files") or
software and any associated documentation (the "Software") to deal in the
Data Files or Software without restriction, including without limitation
the rights to use, copy, modify, merge, publish, distribute, and/or sell
copies of the Data Files or Software, and to permit persons to whom the
Data Files or Software are furnished to do so, provided that either (a)
this copyright and permission notice appear with all copies of the Data
Files or Software, or (b) this copyright and permission notice appear in
associated Documentation.

THE DATA FILES AND SOFTWARE ARE PROVIDED "AS IS", WITHOUT WARRANTY OF ANY
KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT OF
THIRD PARTY RIGHTS.

IN NO EVENT SHALL THE COPYRIGHT HOLDER OR HOLDERS INCLUDED IN THIS NOTICE
BE LIABLE FOR ANY CLAIM, OR ANY SPECIAL INDIRECT OR CONSEQUENTIAL DAMAGES,
OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS,
WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION,
ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THE DATA
FILES OR SOFTWARE.

Except as contained in this notice, the name of a copyright holder shall
not be used in advertising or otherwise to promote the sale, use or other
dealings in these Data Files or Software without prior written
authorization of the copyright holder.

SPDX-License-Identifier: Unicode-3.0
```
