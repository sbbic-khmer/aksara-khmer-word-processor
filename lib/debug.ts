// Debug logging utility
// In development: logging is enabled by default
// In production: logging is disabled by default, but can be enabled via File menu

const isDev = process.env.NODE_ENV === "development"

// Global debug state
let debugEnabled = isDev

export function isDebugEnabled(): boolean {
  // Check localStorage override in browser
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("aksara-debug-enabled")
    if (stored !== null) {
      return stored === "true"
    }
  }
  return debugEnabled
}

export function setDebugEnabled(enabled: boolean): void {
  debugEnabled = enabled
  if (typeof window !== "undefined") {
    localStorage.setItem("aksara-debug-enabled", String(enabled))
  }
}

export function debugLog(...args: unknown[]): void {
  if (isDebugEnabled()) {
    console.log("[v0]", ...args)
  }
}

export function debugWarn(...args: unknown[]): void {
  if (isDebugEnabled()) {
    console.warn("[v0]", ...args)
  }
}

export function debugError(...args: unknown[]): void {
  // Always log errors
  console.error("[v0]", ...args)
}
