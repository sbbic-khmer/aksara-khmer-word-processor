import { describe, it, expect } from "vitest"
import { normalizeKhmer } from "./khmer-normalize"

describe("normalizeKhmer", () => {
  it("returns empty string unchanged", () => {
    expect(normalizeKhmer("")).toBe("")
  })

  it("returns whitespace-only string unchanged", () => {
    expect(normalizeKhmer("   ")).toBe("   ")
  })

  it("passes through Latin text unchanged", () => {
    expect(normalizeKhmer("hello world")).toBe("hello world")
  })

  it("passes through already-canonical Khmer text", () => {
    const canonical = "ខ្មែរ"
    expect(normalizeKhmer(canonical)).toBe(canonical)
  })

  it("normalizes non-canonical combining mark order", () => {
    // Vowel before coeng cluster → coeng cluster before vowel
    const nonCanonical = "ខែ្មរ" // U+1781 U+17C2 U+17D2 U+1798 U+179A
    const canonical = "ខ្មែរ"    // U+1781 U+17D2 U+1798 U+17C2 U+179A
    expect(normalizeKhmer(nonCanonical)).toBe(canonical)
  })

  it("preserves ZWSP characters", () => {
    const withZWSP = "សួស្តី​បាទ"
    const result = normalizeKhmer(withZWSP)
    expect(result).toContain("​")
    const parts = result.split("​")
    expect(parts).toHaveLength(2)
  })

  it("preserves Word Joiner characters", () => {
    const withWJ = "សួស្តី⁠បាទ"
    const result = normalizeKhmer(withWJ)
    expect(result).toContain("⁠")
    const parts = result.split("⁠")
    expect(parts).toHaveLength(2)
  })

  it("preserves multiple ZWSP/WJ positions", () => {
    const text = "ក​ខ⁠គ​ឃ"
    const result = normalizeKhmer(text)
    expect(result.split("​")).toHaveLength(3)
    expect(result.split("⁠")).toHaveLength(2)
  })

  it("handles mixed Khmer and Latin text", () => {
    const mixed = "Hello ខ្មែរ world"
    const result = normalizeKhmer(mixed)
    expect(result).toContain("Hello")
    expect(result).toContain("world")
    expect(result).toContain("ខ្មែរ")
  })

  it("normalizes segments between ZWSP markers independently", () => {
    const nonCanonical = "ខែ្មរ​ខែ្មរ"
    const result = normalizeKhmer(nonCanonical)
    const parts = result.split("​")
    expect(parts[0]).toBe("ខ្មែរ")
    expect(parts[1]).toBe("ខ្មែរ")
  })
})
