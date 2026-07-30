/**
 * Segmentation evaluation metrics.
 *
 * A gold line is text carrying human-placed ZWSP word boundaries. Stripping the
 * markers yields `raw` — what a user would actually type or paste, and what the
 * segmenter is given. Gold boundaries are the marker offsets within `raw`.
 *
 * Whitespace is normalised on both sides: every position adjacent to a space is
 * counted as a boundary regardless of how either side tokenises spaces, so the
 * metric measures word-breaking decisions rather than whitespace bookkeeping.
 *
 * Two views are reported:
 *   - `all`   — every boundary/token, including those adjacent to spaces and
 *               punctuation. Comparable to published word-F1 numbers.
 *   - `khmer` — only decisions strictly inside a run of Khmer letters. These are
 *               the ones the algorithm actually has to get right; boundaries at
 *               spaces are free and inflate the `all` figures.
 */

export const ZWSP = "​"
export const WJ = "⁠"

/** Khmer letters, signs, digits and the repetition sign — excludes punctuation and currency. */
export function isKhmerLetter(ch: string | undefined): boolean {
  if (!ch) return false
  const cp = ch.codePointAt(0)!
  if (cp >= 0x1780 && cp <= 0x17d3) return true // consonants, vowels, signs
  if (cp === 0x17d7) return true // ៗ repetition sign
  if (cp === 0x17dc || cp === 0x17dd) return true // avakrahasanya, atthacan
  if (cp >= 0x17e0 && cp <= 0x17e9) return true // digits ០-៩
  return false
}

export interface GoldLine {
  doc: string
  /** Segmenter input: gold text with boundary markers removed */
  raw: string
  /** Sorted unique boundary offsets in `raw`, excluding 0 and raw.length */
  boundaries: number[]
}

function addWhitespaceBoundaries(raw: string, out: Set<number>): void {
  for (let i = 0; i < raw.length; i++) {
    if (/\s/.test(raw[i])) {
      out.add(i)
      out.add(i + 1)
    }
  }
}

function normaliseBoundaries(set: Set<number>, length: number): number[] {
  return [...set].filter((b) => b > 0 && b < length).sort((a, b) => a - b)
}

/** Build a gold line from text containing ZWSP/WJ boundary markers. */
export function buildGoldLine(text: string, doc = ""): GoldLine {
  let raw = ""
  const boundaries = new Set<number>()

  for (const ch of text) {
    if (ch === ZWSP || ch === WJ) {
      if (raw.length > 0) boundaries.add(raw.length)
      continue
    }
    raw += ch
  }

  addWhitespaceBoundaries(raw, boundaries)
  return { doc, raw, boundaries: normaliseBoundaries(boundaries, raw.length) }
}

/**
 * Recover boundary offsets from segmenter output.
 *
 * Returns null when the segments cannot be aligned onto `raw` at all, which
 * means the segmenter altered the text beyond added/dropped whitespace.
 */
export function boundariesFromSegments(segments: string[], raw: string): { boundaries: number[]; exact: boolean } | null {
  const exact = segments.join("") === raw
  const found = new Set<number>()
  let pos = 0

  for (const segment of segments) {
    if (segment.length === 0) continue
    // Tolerate whitespace the segmenter dropped or introduced.
    while (pos < raw.length && !raw.startsWith(segment, pos) && /\s/.test(raw[pos])) pos++
    if (!raw.startsWith(segment, pos)) return null
    pos += segment.length
    found.add(pos)
  }

  addWhitespaceBoundaries(raw, found)
  return { boundaries: normaliseBoundaries(found, raw.length), exact }
}

export interface Counts {
  tp: number
  fp: number
  fn: number
}

export interface Prf extends Counts {
  precision: number
  recall: number
  f1: number
}

export function emptyCounts(): Counts {
  return { tp: 0, fp: 0, fn: 0 }
}

export function addCounts(into: Counts, from: Counts): void {
  into.tp += from.tp
  into.fp += from.fp
  into.fn += from.fn
}

export function finalise(counts: Counts): Prf {
  const precision = counts.tp + counts.fp === 0 ? 1 : counts.tp / (counts.tp + counts.fp)
  const recall = counts.tp + counts.fn === 0 ? 1 : counts.tp / (counts.tp + counts.fn)
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall)
  return { ...counts, precision, recall, f1 }
}

function compareSets<T>(gold: Set<T>, predicted: Set<T>): Counts {
  let tp = 0
  for (const item of predicted) if (gold.has(item)) tp++
  return { tp, fp: predicted.size - tp, fn: gold.size - tp }
}

/** Token spans implied by a boundary list. */
export function spansFromBoundaries(boundaries: number[], length: number): Array<[number, number]> {
  const spans: Array<[number, number]> = []
  let start = 0
  for (const b of boundaries) {
    if (b > start) spans.push([start, b])
    start = b
  }
  if (length > start) spans.push([start, length])
  return spans
}

export interface LineResult {
  boundaryAll: Counts
  boundaryKhmer: Counts
  wordAll: Counts
  wordKhmer: Counts
  oov: Counts
  /** Gold tokens the segmenter missed, with what it produced instead */
  diffs: Array<{ gold: string; predicted: string }>
  /** True when segments concatenated back to the input exactly */
  exact: boolean
  aligned: boolean
}

export interface ScoreOptions {
  /** Used to split gold words into known/OOV for the OOV recall figure */
  isKnownWord?: (word: string) => boolean
  /** Collect up to this many token-level diffs per line for error reporting */
  collectDiffs?: boolean
}

export function scoreLine(gold: GoldLine, segments: string[], options: ScoreOptions = {}): LineResult {
  const raw = gold.raw
  const recovered = boundariesFromSegments(segments, raw)

  if (!recovered) {
    // Unalignable output: count every gold boundary and token as missed.
    const goldSpans = spansFromBoundaries(gold.boundaries, raw.length)
    return {
      boundaryAll: { tp: 0, fp: 0, fn: gold.boundaries.length },
      boundaryKhmer: { tp: 0, fp: 0, fn: gold.boundaries.filter((b) => isKhmerBoundary(raw, b)).length },
      wordAll: { tp: 0, fp: 0, fn: goldSpans.length },
      wordKhmer: { tp: 0, fp: 0, fn: goldSpans.filter(([s, e]) => isKhmerToken(raw.slice(s, e))).length },
      oov: emptyCounts(),
      diffs: [],
      exact: false,
      aligned: false,
    }
  }

  const goldBoundarySet = new Set(gold.boundaries)
  const predBoundarySet = new Set(recovered.boundaries)

  const goldKhmerBoundaries = new Set(gold.boundaries.filter((b) => isKhmerBoundary(raw, b)))
  const predKhmerBoundaries = new Set(recovered.boundaries.filter((b) => isKhmerBoundary(raw, b)))

  const goldSpans = spansFromBoundaries(gold.boundaries, raw.length)
  const predSpans = spansFromBoundaries(recovered.boundaries, raw.length)

  const goldSpanKeys = new Set(goldSpans.map(spanKey))
  const predSpanKeys = new Set(predSpans.map(spanKey))

  const goldKhmerSpans = goldSpans.filter(([s, e]) => isKhmerToken(raw.slice(s, e)))
  const predKhmerSpans = predSpans.filter(([s, e]) => isKhmerToken(raw.slice(s, e)))

  // OOV recall: of gold words absent from the dictionary, how many were produced?
  const oov = emptyCounts()
  if (options.isKnownWord) {
    for (const span of goldKhmerSpans) {
      const word = raw.slice(span[0], span[1])
      if (options.isKnownWord(word)) continue
      if (predSpanKeys.has(spanKey(span))) oov.tp++
      else oov.fn++
    }
  }

  const diffs: LineResult["diffs"] = []
  if (options.collectDiffs) {
    for (const span of goldKhmerSpans) {
      if (predSpanKeys.has(spanKey(span))) continue
      const overlapping = predSpans.filter(([s, e]) => s < span[1] && e > span[0])
      diffs.push({
        gold: raw.slice(span[0], span[1]),
        predicted: overlapping.map(([s, e]) => raw.slice(s, e)).join("|"),
      })
    }
  }

  return {
    boundaryAll: compareSets(goldBoundarySet, predBoundarySet),
    boundaryKhmer: compareSets(goldKhmerBoundaries, predKhmerBoundaries),
    wordAll: compareSets(goldSpanKeys, predSpanKeys),
    wordKhmer: compareSets(new Set(goldKhmerSpans.map(spanKey)), new Set(predKhmerSpans.map(spanKey))),
    oov,
    diffs,
    exact: recovered.exact,
    aligned: true,
  }
}

function spanKey(span: [number, number]): string {
  return `${span[0]}:${span[1]}`
}

/** A boundary is "Khmer-internal" when letters sit on both sides of it. */
function isKhmerBoundary(raw: string, offset: number): boolean {
  return isKhmerLetter(raw[offset - 1]) && isKhmerLetter(raw[offset])
}

/** A token counts as Khmer when it is made only of Khmer letters. */
function isKhmerToken(token: string): boolean {
  if (token.length === 0) return false
  for (const ch of token) if (!isKhmerLetter(ch)) return false
  return true
}
