# Updating downstream projects to the new Khmer word breaking

Aksara's word segmentation was rebuilt against a measured gold standard. On a
book held out of all tuning, word F1 went from **93.33 to 96.73**, and
segmentation is about **2.2x faster**.

This describes how `tiptap-khmer-line-breaker` and `lectio` pick that up. All
three repos are owned by the same person, so the downstream projects can copy
directly from `sungkhum/aksara`.

---

## 1. Read this first: where tiptap-khmer-line-breaker is right now

The dictionary sync already ran, so `tiptap-khmer-line-breaker` **has the new
dictionary but the old algorithm**. I measured that exact combination on the
held-out book:

| State | Word F1 | Notes |
| --- | --- | --- |
| A. Before any of this | 93.33 | old dictionary, old code |
| **B. What tiptap has today** | **93.51** | new dictionary, old code |
| C. After following this guide | **96.73** | new dictionary, new code, tagger |

**Nothing is broken — but almost nothing was gained either.** The dictionary
landed and moved the number by +0.18. The remaining **+3.22** needs the code.

### Why the new dictionary alone did nothing

The rebuilt dictionary demotes 640 compound entries to frequency `1` — words the
typesetters consistently split, like `ការសិក្សា`. Demoting them is supposed to
stop the breaker gluing them back together.

It doesn't work on the old code, because of `mergeKnownCompounds`. That pass runs
*after* the beam search and re-joins any adjacent pair whose concatenation is a
dictionary word, with no score comparison. It calls `hasWord()`, which returns
true for **any** frequency above zero — including the demoted `1`. So the beam
correctly splits `ការ|សិក្សា`, and `mergeKnownCompounds` immediately glues it back.

Removing that pass was the single largest improvement in the whole rebuild, worth
about 2.7 points on its own. Until the code changes, the dictionary work is
inert.

---

## 2. What tiptap-khmer-line-breaker needs to copy

Source paths are in `sungkhum/aksara`; destinations are in
`tiptap-khmer-line-breaker`.

### Replace

| From aksara | To tiptap | Why |
| --- | --- | --- |
| `lib/khmer-breaker.ts` | `src/lib/khmer-breaker.ts` | The rebuilt engine |

### Add (new files that did not exist before)

| From aksara | To tiptap | Why |
| --- | --- | --- |
| `lib/khmer-kcc-tagger.ts` | `src/lib/khmer-kcc-tagger.ts` | Runtime for the trained tagger |
| `lib/khmer-kcc-features.ts` | `src/lib/khmer-kcc-features.ts` | Feature extraction the weights were trained against |
| `lib/debug.ts` | `src/lib/debug.ts` | `khmer-breaker.ts` imports it (see §3) |
| `public/dictionaries/km_kcc_tagger.json` | `public/dictionaries/km_kcc_tagger.json` | Trained weights, ~1.2 MB raw / ~266 KB gzipped |

### Already in place

`km_frequency_dictionary.json`, `khmer-dictionary-data.ts`, `khmer-affixes.ts`,
`khmer-titles.ts`, `khmer-titles.json`, `protected-phrases.ts` — all current via
the sync workflow. Do not hand-edit them.

```bash
# from a checkout of tiptap-khmer-line-breaker, with aksara checked out alongside
AK=../aksara
cp $AK/lib/khmer-breaker.ts        src/lib/khmer-breaker.ts
cp $AK/lib/khmer-kcc-tagger.ts     src/lib/khmer-kcc-tagger.ts
cp $AK/lib/khmer-kcc-features.ts   src/lib/khmer-kcc-features.ts
cp $AK/lib/debug.ts                src/lib/debug.ts
cp $AK/public/dictionaries/km_kcc_tagger.json public/dictionaries/
```

---

## 3. Code changes in tiptap-khmer-line-breaker

### 3.1 The `debug` import

The old port had the debug logging stripped out; Aksara's version imports it:

```ts
import { isDebugEnabled, isWordBreakerDebugEnabled } from "./debug"
```

Copying `lib/debug.ts` (above) is the simplest fix and keeps future copies
mechanical. It is browser-safe — every function guards on
`typeof window !== "undefined"` — and all logging stays off unless a localStorage
flag is set. If you would rather not carry it, delete the import and the
`isDebugEnabled()` / `isWordBreakerDebugEnabled()` call sites, but expect to redo
that on every future update.

### 3.2 The default export still works

`src/lib/tiptap-khmer-word-break.ts` does `import KhmerBreaker from './khmer-breaker'`.
Aksara's file ends with `export default KhmerBreaker`, so that import is
unchanged. `insertBreakOpportunities()`, `getSegments()` and
`loadFullDictionaryAsync()` all keep their existing signatures.

**No change is required to the extension for the dictionary and scoring
improvements.** Copying the files in §2 and doing §3.1 already gets you most of
the way. The tagger in §3.3 is what closes the rest of the gap.

### 3.3 Load the boundary tagger

This is the only behavioural addition. In `src/lib/tiptap-khmer-word-break.ts`,
where the breaker is created and the dictionary is fetched:

```ts
const breaker = new KhmerBreaker(KHMER_DICTIONARY)

// existing
breaker.loadFullDictionaryAsync(this.options.dictionaryUrl).then(() => { /* ... */ })

// add: the trained tagger decides boundaries inside Khmer runs
breaker.loadBoundaryTaggerAsync(this.options.taggerUrl ?? '/dictionaries/km_kcc_tagger.json')
```

Both loads are independent and optional. If the tagger fetch fails the breaker
falls back to beam search alone, so a missing file degrades quality rather than
breaking the editor.

If you re-break text on load, wait for **both** promises before doing so,
otherwise the first pass runs without the tagger:

```ts
Promise.all([
  breaker.loadFullDictionaryAsync(this.options.dictionaryUrl),
  breaker.loadBoundaryTaggerAsync(this.options.taggerUrl),
]).then(() => {
  // re-run insertKhmerBreaks here
})
```

Add `taggerUrl` alongside the existing `dictionaryUrl` in
`KhmerWordBreakOptions` so consumers can point at their own asset path or pass
`null` to skip it.

### 3.4 Scoring configuration

Nothing to do. The tuned values are the defaults in
`DEFAULT_SEGMENTATION_CONFIG`, including `mergeKnownCompounds: false`. If a
project needs to override one, the constructor now takes a second argument:

```ts
new KhmerBreaker(KHMER_DICTIONARY, { boundaryPenalty: 0.5 })
```

Do not set `mergeKnownCompounds: true` to restore old behaviour. That is the
regression described in §1.

---

## 4. Serving the tagger asset

`km_kcc_tagger.json` must be reachable at runtime, like the dictionary. It is
~1.2 MB raw, ~266 KB gzipped, and is fetched lazily after mount, so it does not
affect first paint. Make sure the host serves it gzipped — the file is highly
compressible and the raw size is otherwise noticeable on mobile.

If a consumer bundles assets rather than serving them from `public/`, pass an
explicit `taggerUrl`.

---

## 5. Lectio

Lectio consumes the Tiptap extension, so the order is:

1. Update `tiptap-khmer-line-breaker` per §2 and §3.
2. Publish or bump it however Lectio consumes it (npm version, or a commit if it
   is pinned to a git ref).
3. In Lectio, update that dependency.
4. Copy `km_kcc_tagger.json` into whatever directory Lectio serves dictionaries
   from, and pass `taggerUrl` if the path differs from the default.

Lectio's own dictionary sync is currently **not running**: it moved to
`gitlab.com/sungkhum/lectio`, and the GitHub Actions job could no longer reach
it. The workflow has been repointed at GitLab, but it needs a `GITLAB_SYNC_TOKEN`
secret (a GitLab token with `write_repository` scope) added to the Aksara repo
before it will run.

Note that Lectio protects `main` with "Allowed to push: No one", so the sync
cannot commit to it directly. It pushes an `aksara-dictionary-sync` branch and
opens a merge request instead, which a Maintainer then merges. Repeat runs
force-push that branch, so they update the same merge request rather than piling
up new ones.

Until the token is in place Lectio is on the **old dictionary**, so it needs both
the dictionary files and the code:

```bash
AK=../aksara
cp $AK/public/dictionaries/km_frequency_dictionary.json public/dictionaries/
cp $AK/lib/khmer-dictionary-data.ts lib/
```

Once the token is in place the sync handles the dictionary side automatically.

---

## 6. Verifying the update

The eval harness lives in Aksara and depends on a gold corpus that is not
committed (the source books are copyrighted). The practical check downstream is
a before/after comparison on real text.

Aksara has a tool for exactly this. It segments text through three
configurations side by side, so you can see which stage produced which change:

```bash
npx tsx scripts/segment.ts --stages ការសិក្សា មូលដ្ឋាន រង់ចាំ
```

These are the verified results. Reproduce them downstream after updating:

| Input | Pre-rebuild | Rebuilt, no tagger | Rebuilt + tagger |
| --- | --- | --- | --- |
| `ការសិក្សា` | `ការសិក្សា` | `ការ` · `សិក្សា` | `ការ` · `សិក្សា` |
| `ចំណេះដឹង` | `ចំណេះដឹង` | `ចំណេះ` · `ដឹង` | `ចំណេះ` · `ដឹង` |
| `រូបភាព` | `រូបភាព` | `រូប` · `ភាព` | `រូប` · `ភាព` |
| `ចូលចិត្ត` | `ចូលចិត្ត` | `ចូល` · `ចិត្ត` | `ចូល` · `ចិត្ត` |
| `មូលដ្ឋាន` | `មូលដ្ឋាន` | `មូល` · `ដ្ឋាន` | **`មូលដ្ឋាន`** |
| `ទីក្រុង` | `ទីក្រុង` | `ទី` · `ក្រុង` | **`ទីក្រុង`** |
| `រង់ចាំ` | `រង់` · `ចាំ` | `រង់` · `ចាំ` | **`រង់ចាំ`** |
| `អ្វីៗ` | `អ្វីៗ` | `អ្វីៗ` | `អ្វីៗ` |

Read the columns as two independent checks:

- **Column 2 to 3** is `mergeKnownCompounds` being gone. If `ការសិក្សា` still
  comes back whole, the code copy did not take effect.
- **Column 3 to 4** is the tagger. It *re-joins* words the frequency model
  over-splits — `មូលដ្ឋាន`, `ទីក្រុង` and `រង់ចាំ` are genuinely single words, and
  no boundary penalty distinguishes them from `រូប`+`ភាព`, which really is two.
  If those three stay split, the tagger did not load: check the network tab for
  `km_kcc_tagger.json` and the console for a version warning.

`អ្វីៗ` must not change at any stage — the repetition sign never separates from
its word.

Also confirm, on a document of real text:

- segments still concatenate back to the input exactly (no characters gained or
  lost);
- no break appears immediately before or after a COENG (`្`);
- `ៗ` never starts a segment.

Those three are enforced by tests in Aksara (`lib/khmer-breaker.test.ts`) and are
worth asserting downstream too.

---

## 7. Things that will bite you

**The tagger weights are versioned.** `km_kcc_tagger.json` carries a
`FEATURE_SET_VERSION` that must match `khmer-kcc-features.ts`. Copy the two
together. A mismatch is refused at load with a console warning and the breaker
falls back to beam search — deliberately loud, because silently mismatched
weights would just quietly degrade quality.

**The sync workflow does not carry code.** It copies dictionaries and data tables
only — never `khmer-breaker.ts`, `khmer-kcc-tagger.ts` or
`khmer-kcc-features.ts`. That is exactly how tiptap ended up with a new
dictionary and old code. After any Aksara change to the breaker, the code files
must be copied by hand. Worth considering: extend
`.github/workflows/sync-dictionaries.yml` to carry them, or publish the breaker
as a package that both projects depend on.

**Do not hand-tune the constants.** They were fitted against the gold corpus with
`scripts/tune-constants.ts`. Changing one by eye will almost certainly make
things worse; the process for changing them is documented in
`docs/segmentation-policy.md`.

**Segmentation targets finer breaks.** Compounds that decompose into standalone
dictionary words get split. If a downstream product wants coarser output, that is
a policy change to discuss, not a constant to nudge — see the policy doc.

---

## 8. Reference

In the Aksara repo:

- `docs/segmentation-policy.md` — the target convention, how quality is measured,
  current numbers, and what is still worth doing
- `lib/khmer-breaker.test.ts` — invariants and quality floors
- `scripts/eval-segmentation.ts` — the measurement harness
- `scripts/train-perceptron.ts` — retrains the tagger

`KHMERLINEBREAKER.md` in this repo predates the rebuild. Its description of the
architecture is still broadly accurate, but its scoring constants and its account
of `mergeKnownCompounds` as a useful "safety net" are now wrong. Prefer
`docs/segmentation-policy.md`.
