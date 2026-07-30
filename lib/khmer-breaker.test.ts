/**
 * Regression and invariant tests for the Khmer word breaker.
 *
 * Two kinds of test live here:
 *
 *   - Invariants that must hold for any input. These encode rules that make a
 *     segmentation valid Khmer at all (never breaking a COENG cluster, never
 *     losing characters), and they are checked over real corpus text rather than
 *     hand-picked strings.
 *   - Quality floors measured against the gold corpus. They fail if a change
 *     makes segmentation measurably worse, which is the protection this file
 *     exists to provide — the breaker's scoring constants were hand-tuned for
 *     years with nothing to catch a regression.
 *
 * The floors are deliberately a little below the numbers the current code
 * achieves, so ordinary noise does not fail the build. Run
 * `npx tsx scripts/eval-segmentation.ts` for the real figures, and raise the
 * floors deliberately when a change improves them.
 */

import { beforeAll, describe, expect, it } from "vitest"
import { existsSync, readFileSync } from "node:fs"
import { KhmerBreaker } from "./khmer-breaker"
import { KhmerBoundaryTagger } from "./khmer-kcc-tagger"
import { FEATURE_SET_VERSION } from "./khmer-kcc-features"
import { KHMER_DICTIONARY } from "./khmer-dictionary-data"
import {
  addCounts,
  buildGoldLine,
  emptyCounts,
  finalise,
  scoreLine,
} from "./segmentation-eval"

const COENG = "្"
const ZWSP = "​"

/** Kept small so the suite stays fast; the full corpus runs in the eval script. */
const SAMPLE_SIZE = 120

const CORPUS_PATH = "test-data/idml-corpus/dev.jsonl"

/**
 * The gold corpus is the full text of copyrighted books, so it is not committed.
 * Without it these tests are skipped rather than failed — run `npm run corpus:build`
 * with the IDML books in place to enable them.
 */
const hasCorpus = existsSync(CORPUS_PATH)

let breaker: KhmerBreaker
let sample: Array<{ doc: string; text: string }> = []

beforeAll(() => {
  breaker = new KhmerBreaker(KHMER_DICTIONARY)
  breaker.mergeDictionary(
    JSON.parse(readFileSync("public/dictionaries/km_frequency_dictionary.json", "utf-8")),
  )
  // Match production, which loads the tagger alongside the dictionary.
  const tagger = KhmerBoundaryTagger.fromJson(
    JSON.parse(readFileSync("public/dictionaries/km_kcc_tagger.json", "utf-8")),
  )
  if (!tagger) throw new Error("shipped tagger does not match the current feature set")
  breaker.setBoundaryTagger(tagger)

  if (!hasCorpus) return
  sample = readFileSync(CORPUS_PATH, "utf-8")
    .split("\n")
    .filter((l) => l.trim())
    .slice(0, SAMPLE_SIZE)
    .map((l) => JSON.parse(l))
})

describe.skipIf(!hasCorpus)("invariants over corpus text", () => {
  it("never loses or alters characters", () => {
    for (const line of sample) {
      const raw = buildGoldLine(line.text).raw
      expect(breaker.getSegments(raw).join("")).toBe(raw)
    }
  })

  it("never breaks immediately before or after a COENG", () => {
    for (const line of sample) {
      const raw = buildGoldLine(line.text).raw
      const segments = breaker.getSegments(raw)
      for (let i = 0; i < segments.length - 1; i++) {
        expect(segments[i].endsWith(COENG), `"${segments[i]}" ends with COENG`).toBe(false)
        expect(segments[i + 1].startsWith(COENG), `"${segments[i + 1]}" starts with COENG`).toBe(false)
      }
    }
  })

  it("keeps the repetition sign ៗ attached to its word", () => {
    for (const line of sample) {
      const raw = buildGoldLine(line.text).raw
      for (const segment of breaker.getSegments(raw)) {
        expect(segment.startsWith("ៗ"), `"${segment}" starts with the repetition sign`).toBe(false)
      }
    }
  })

  it("produces no empty segments", () => {
    for (const line of sample) {
      const raw = buildGoldLine(line.text).raw
      for (const segment of breaker.getSegments(raw)) expect(segment.length).toBeGreaterThan(0)
    }
  })

  it("is idempotent: re-segmenting its own output changes nothing", () => {
    for (const line of sample.slice(0, 40)) {
      const raw = buildGoldLine(line.text).raw
      const once = breaker.getSegments(raw)
      expect(breaker.getSegments(once.join(""))).toEqual(once)
    }
  })
})

describe("invariants on fixed inputs", () => {
  it("treats an existing ZWSP as a boundary the user chose", () => {
    // A user-inserted split must survive segmentation, including when the two
    // halves would otherwise form a dictionary word.
    const segments = breaker.getSegments(`ព្រះ${ZWSP}គម្ពីរ`)
    expect(segments).toContain("ព្រះ")
    expect(segments).toContain("គម្ពីរ")
    expect(segments.some((s) => s === "ព្រះគម្ពីរ")).toBe(false)
  })

  it("handles degenerate input without throwing", () => {
    for (const input of ["", " ", "។", ZWSP, COENG, "abc", "១២៣", "ក", "\n\t"]) {
      expect(() => breaker.getSegments(input)).not.toThrow()
    }
  })

  it("leaves non-Khmer text intact", () => {
    const segments = breaker.getSegments("Hello world")
    expect(segments.join("")).toBe("Hello world")
  })
})

describe("boundary tagger", () => {
  it("refuses weights trained against a different feature set", () => {
    // Silently loading stale weights would degrade segmentation with no error.
    expect(KhmerBoundaryTagger.fromJson({ version: FEATURE_SET_VERSION - 1, weights: { bias: 1 } })).toBeNull()
    expect(KhmerBoundaryTagger.fromJson({ weights: { bias: 1 } })).toBeNull()
    expect(KhmerBoundaryTagger.fromJson(null)).toBeNull()
  })

  it("accepts weights matching the current feature set", () => {
    const tagger = KhmerBoundaryTagger.fromJson({ version: FEATURE_SET_VERSION, weights: { bias: 1 } })
    expect(tagger).not.toBeNull()
    expect(tagger!.featureCount).toBe(1)
  })

  it("segments with beam search alone when no tagger is loaded", () => {
    const local = new KhmerBreaker(KHMER_DICTIONARY)
    local.setBoundaryTagger(null)
    const segments = local.getSegments("ព្រះជាម្ចាស់")
    expect(segments.join("")).toBe("ព្រះជាម្ចាស់")
  })
})

describe("dictionary handling", () => {
  it("reports ignored words as unknown but keeps them out of later merges", () => {
    const local = new KhmerBreaker(KHMER_DICTIONARY)
    const word = "ព្រះ"
    expect(local.isKnownWord(word)).toBe(true)

    local.addIgnoredWords([word])
    expect(local.isKnownWord(word)).toBe(false)

    // A later dictionary merge must not resurrect a word the user ignored.
    local.mergeDictionary({ [word]: 99999 })
    expect(local.isKnownWord(word)).toBe(false)
  })

  it("prioritises user words", () => {
    const local = new KhmerBreaker(KHMER_DICTIONARY)
    const invented = "ពិភពលោកថ្មី"
    local.addUserWords([invented])
    expect(local.isKnownWord(invented)).toBe(true)
    expect(local.getSegments(invented)).toEqual([invented])
  })
})

describe.skipIf(!hasCorpus)("segmentation quality against the gold corpus", () => {
  /**
   * Floors sit below current measured performance so ordinary noise does not fail
   * the build. They are a regression tripwire, not a quality measure: this sample
   * comes from dev, which the shipped tagger was trained on, so it scores higher
   * here than on unseen text. The number to trust is
   * `npm run eval:seg -- --split test`.
   */
  const WORD_F1_FLOOR = 0.96
  const BOUNDARY_F1_FLOOR = 0.985

  it("meets the word and boundary F1 floors", () => {
    const word = emptyCounts()
    const boundary = emptyCounts()

    for (const line of sample) {
      const gold = buildGoldLine(line.text, line.doc)
      if (!gold.raw) continue
      const result = scoreLine(gold, breaker.getSegments(gold.raw))
      addCounts(word, result.wordAll)
      addCounts(boundary, result.boundaryKhmer)
    }

    const wordF1 = finalise(word).f1
    const boundaryF1 = finalise(boundary).f1

    expect(wordF1, `word F1 ${(wordF1 * 100).toFixed(2)}`).toBeGreaterThan(WORD_F1_FLOOR)
    expect(boundaryF1, `boundary F1 ${(boundaryF1 * 100).toFixed(2)}`).toBeGreaterThan(BOUNDARY_F1_FLOOR)
  })
})
