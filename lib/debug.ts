// Debug logging utility
// In development: logging is ALWAYS enabled (ignores localStorage)
// In production: logging is disabled by default, but can be enabled via File menu
//
// WORDBREAKER DEBUG MODE:
// Separate toggle for verbose word breaker logging (very noisy)
// - In dev AND prod: disabled by default, can be enabled via File menu
// - Uses separate localStorage key: "aksara-wordbreaker-debug-enabled"

// Check if we're in development mode (only client-safe checks)
function isDev(): boolean {
  return (
    process.env.NEXT_PUBLIC_VERCEL_ENV === "preview" ||
    (typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname.includes("v0.app") ||
        window.location.hostname.includes("vusercontent.net")))
  )
}

export function isDebugEnabled(): boolean {
  // Check localStorage in both dev and production
  let storedValue: string | null = null
  if (typeof window !== "undefined") {
    storedValue = localStorage.getItem("aksara-debug-enabled")
  }

  return isDev() || storedValue === "true"
}

export function setDebugEnabled(enabled: boolean): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("aksara-debug-enabled", String(enabled))
  }
}

export function isWordBreakerDebugEnabled(): boolean {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("aksara-wordbreaker-debug-enabled")
    return stored === "true"
  }
  return false
}

export function setWordBreakerDebugEnabled(enabled: boolean): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("aksara-wordbreaker-debug-enabled", String(enabled))
  }
}

export function debugLog(...args: unknown[]): void {
  if (isDebugEnabled()) {
    console.log("[v0]", ...args)
  }
}

export function wordBreakerDebugLog(...args: unknown[]): void {
  if (isWordBreakerDebugEnabled()) {
    console.log("[v0:wb]", ...args)
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
