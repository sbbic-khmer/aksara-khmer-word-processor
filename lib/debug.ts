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

// Cursor debug mode - for debugging click/selection/cursor jump issues
export function isCursorDebugEnabled(): boolean {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("aksara-cursor-debug-enabled")
    return stored === "true"
  }
  return false
}

export function setCursorDebugEnabled(enabled: boolean): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("aksara-cursor-debug-enabled", String(enabled))
  }
}

export function cursorDebugLog(...args: unknown[]): void {
  if (isCursorDebugEnabled()) {
    console.log("[v0:cursor]", ...args)
  }
}

// Performance debug mode - for measuring operation latency
// Enable via localStorage.setItem('aksara-perf-debug-enabled', 'true')
export function isPerfDebugEnabled(): boolean {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("aksara-perf-debug-enabled")
    return stored === "true"
  }
  return false
}

export function setPerfDebugEnabled(enabled: boolean): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("aksara-perf-debug-enabled", String(enabled))
  }
}

// Performance threshold in ms - operations exceeding this will warn
const PERF_THRESHOLD_MS = 16 // 60fps = 16.67ms per frame

/**
 * Measure execution time of a function and log if debug mode is enabled.
 * Warns if execution exceeds 16ms (1 frame at 60fps).
 *
 * Usage:
 *   const result = measurePerformance('beamSearch', () => breaker.segment(text));
 *
 * @param name - Human-readable name for the operation
 * @param fn - Function to measure
 * @returns The result of the function
 */
export function measurePerformance<T>(name: string, fn: () => T): T {
  // Early return when disabled - minimal overhead
  if (!isPerfDebugEnabled()) {
    return fn()
  }

  const start = performance.now()
  const result = fn()
  const elapsed = performance.now() - start

  if (elapsed > PERF_THRESHOLD_MS) {
    console.warn(`[Perf] ${name} took ${elapsed.toFixed(1)}ms (exceeds ${PERF_THRESHOLD_MS}ms threshold)`)
  } else {
    console.log(`[Perf] ${name}: ${elapsed.toFixed(1)}ms`)
  }

  return result
}

/**
 * Async version of measurePerformance for async functions.
 */
export async function measurePerformanceAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
  // Early return when disabled - minimal overhead
  if (!isPerfDebugEnabled()) {
    return fn()
  }

  const start = performance.now()
  const result = await fn()
  const elapsed = performance.now() - start

  if (elapsed > PERF_THRESHOLD_MS) {
    console.warn(`[Perf] ${name} took ${elapsed.toFixed(1)}ms (exceeds ${PERF_THRESHOLD_MS}ms threshold)`)
  } else {
    console.log(`[Perf] ${name}: ${elapsed.toFixed(1)}ms`)
  }

  return result
}
