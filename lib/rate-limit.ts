/**
 * Simple in-memory rate limiting for serverless environments.
 *
 * Note: This resets on cold starts, which provides natural recovery
 * and is acceptable for launch. For persistent rate limiting,
 * consider Upstash Redis in the future.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

// In-memory store for rate limit attempts
const attempts = new Map<string, RateLimitEntry>()

// Clean up old entries every 5 minutes to prevent memory leaks
if (typeof setInterval !== "undefined") {
  setInterval(
    () => {
      const now = Date.now()
      for (const [key, entry] of attempts.entries()) {
        if (entry.resetAt < now) {
          attempts.delete(key)
        }
      }
    },
    5 * 60 * 1000
  )
}

export interface RateLimitConfig {
  maxAttempts: number
  windowMs: number
}

/**
 * Pre-configured rate limits for different actions
 */
export const RATE_LIMITS = {
  // Login: 5 attempts per 15 minutes per IP
  login: { maxAttempts: 5, windowMs: 15 * 60 * 1000 },
  // Registration: 3 attempts per hour per IP
  register: { maxAttempts: 3, windowMs: 60 * 60 * 1000 },
} as const

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetIn: number // seconds until reset
}

/**
 * Check if an action is allowed under rate limiting
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now()
  const entry = attempts.get(key)

  // If no entry or expired, allow the request
  if (!entry || entry.resetAt < now) {
    return {
      allowed: true,
      remaining: config.maxAttempts,
      resetIn: 0,
    }
  }

  // Check if limit exceeded
  if (entry.count >= config.maxAttempts) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: Math.ceil((entry.resetAt - now) / 1000),
    }
  }

  // Still within limit
  return {
    allowed: true,
    remaining: config.maxAttempts - entry.count,
    resetIn: Math.ceil((entry.resetAt - now) / 1000),
  }
}

/**
 * Record a failed attempt (call after auth failure)
 */
export function recordAttempt(key: string, config: RateLimitConfig): void {
  const now = Date.now()
  const entry = attempts.get(key)

  if (!entry || entry.resetAt < now) {
    // Start a new window
    attempts.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    })
  } else {
    // Increment existing count
    entry.count++
  }
}

/**
 * Clear rate limit attempts (call after successful auth)
 */
export function clearAttempts(key: string): void {
  attempts.delete(key)
}

/**
 * Get a rate limit key for login attempts
 */
export function getLoginRateLimitKey(ip: string): string {
  return `login:${ip}`
}

/**
 * Get a rate limit key for registration attempts
 */
export function getRegisterRateLimitKey(ip: string): string {
  return `register:${ip}`
}
