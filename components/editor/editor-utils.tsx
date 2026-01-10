// Utility functions and constants for the Khmer editor

export const ZWSP = "\u200B"
export const WJ = "\u2060"

export const CLOSING_PUNCTUATION = new Set([
  "។",
  "៕",
  "៖",
  "!",
  "?",
  ")",
  "]",
  "}",
  "»",
  '"',
  "'",
  ",",
  ".",
  ":",
  ";",
  "៉",
  "៊",
])
export const OPENING_PUNCTUATION = new Set(["(", "[", "{", "«", '"', "'"])

export type FormattingRange = {
  start: number
  end: number
  tags: string[] // e.g., ['b', 'i', 'u', 's']
  styles: Record<string, string> // e.g., { backgroundColor: 'yellow' }
}

const FORMATTING_TAGS = new Set(["B", "STRONG", "I", "EM", "U", "S", "STRIKE", "DEL", "MARK", "SUB", "SUP"])

export function extractFormattingFromDOM(element: HTMLElement): FormattingRange[] {
  const ranges: FormattingRange[] = []
  let charIndex = 0

  function walkNode(node: Node, activeTags: string[], activeStyles: Record<string, string>) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent || "").replace(/\u200B/g, "") // Remove ZWSP for counting
      if (text.length > 0 && (activeTags.length > 0 || Object.keys(activeStyles).length > 0)) {
        ranges.push({
          start: charIndex,
          end: charIndex + text.length,
          tags: [...activeTags],
          styles: { ...activeStyles },
        })
      }
      charIndex += text.length
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement

      // Skip break markers
      if (el.classList?.contains("break-marker")) return

      // Collect formatting from this element
      const newTags = [...activeTags]
      const newStyles = { ...activeStyles }

      const tagName = el.tagName
      if (FORMATTING_TAGS.has(tagName)) {
        const normalizedTag =
          tagName === "STRONG"
            ? "B"
            : tagName === "EM"
              ? "I"
              : tagName === "STRIKE" || tagName === "DEL"
                ? "S"
                : tagName
        if (!newTags.includes(normalizedTag)) {
          newTags.push(normalizedTag)
        }
      }

      // Check for inline styles
      if (el.style.backgroundColor) {
        newStyles.backgroundColor = el.style.backgroundColor
      }
      if (el.style.color) {
        newStyles.color = el.style.color
      }
      if (el.style.fontWeight === "bold" || el.style.fontWeight === "700") {
        if (!newTags.includes("B")) newTags.push("B")
      }
      if (el.style.fontStyle === "italic") {
        if (!newTags.includes("I")) newTags.push("I")
      }
      if (el.style.textDecoration?.includes("underline")) {
        if (!newTags.includes("U")) newTags.push("U")
      }
      if (el.style.textDecoration?.includes("line-through")) {
        if (!newTags.includes("S")) newTags.push("S")
      }

      // Process children
      for (const child of Array.from(el.childNodes)) {
        walkNode(child, newTags, newStyles)
      }
    }
  }

  walkNode(element, [], {})
  return ranges
}

export function applyFormattingToChar(char: string, charIndex: number, formattingRanges: FormattingRange[]): string {
  // Find all formatting that applies to this character
  const applicableRanges = formattingRanges.filter((r) => charIndex >= r.start && charIndex < r.end)

  if (applicableRanges.length === 0) return char

  // Merge all formatting
  const allTags = new Set<string>()
  const allStyles: Record<string, string> = {}

  for (const range of applicableRanges) {
    range.tags.forEach((t) => allTags.add(t))
    Object.assign(allStyles, range.styles)
  }

  let result = char

  // Apply tags in a consistent order
  const tagOrder = ["B", "I", "U", "S", "MARK", "SUB", "SUP"]
  for (const tag of tagOrder) {
    if (allTags.has(tag)) {
      result = `<${tag.toLowerCase()}>${result}</${tag.toLowerCase()}>`
    }
  }

  // Apply styles via span if needed
  if (Object.keys(allStyles).length > 0) {
    const styleStr = Object.entries(allStyles)
      .map(([k, v]) => {
        const cssKey = k.replace(/([A-Z])/g, "-$1").toLowerCase()
        return `${cssKey}:${v}`
      })
      .join(";")
    result = `<span style="${styleStr}">${result}</span>`
  }

  return result
}
