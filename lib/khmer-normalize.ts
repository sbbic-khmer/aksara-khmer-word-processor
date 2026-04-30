import { khnormal } from "khmer-normalizer"

const ZWSP_WJ_SPLIT = /([​⁠])/

export function normalizeKhmer(text: string): string {
  if (!text) return text
  const parts = text.split(ZWSP_WJ_SPLIT)
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0 && parts[i].length > 0) {
      parts[i] = khnormal(parts[i])
    }
  }
  return parts.join("")
}
