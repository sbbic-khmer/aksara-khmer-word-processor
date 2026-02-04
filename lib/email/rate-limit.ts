import { prisma } from '@/lib/prisma'

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfter?: number // seconds until reset
}

export type RateLimitType = 'verification_resend' | 'password_reset'

interface RateLimitConfig {
  maxRequests: number
  windowSeconds: number
}

const RATE_LIMITS: Record<RateLimitType, RateLimitConfig> = {
  verification_resend: {
    maxRequests: 3,
    windowSeconds: 60 * 60, // 1 hour
  },
  password_reset: {
    maxRequests: 3,
    windowSeconds: 60 * 60, // 1 hour
  },
}

/**
 * Check and update rate limit for an identifier
 * Returns whether the request is allowed
 */
export async function checkRateLimit(
  identifier: string,
  type: RateLimitType
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[type]
  const now = new Date()
  const windowStart = new Date(now.getTime() - config.windowSeconds * 1000)

  // Find existing rate limit record
  const existing = await prisma.emailRateLimit.findUnique({
    where: {
      identifier_type: {
        identifier,
        type,
      },
    },
  })

  // If no record or window expired, create/reset
  if (!existing || existing.windowStart < windowStart) {
    await prisma.emailRateLimit.upsert({
      where: {
        identifier_type: {
          identifier,
          type,
        },
      },
      create: {
        identifier,
        type,
        count: 1,
        windowStart: now,
      },
      update: {
        count: 1,
        windowStart: now,
      },
    })

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
    }
  }

  // Check if limit exceeded
  if (existing.count >= config.maxRequests) {
    const resetTime = new Date(existing.windowStart.getTime() + config.windowSeconds * 1000)
    const retryAfter = Math.ceil((resetTime.getTime() - now.getTime()) / 1000)

    return {
      allowed: false,
      remaining: 0,
      retryAfter,
    }
  }

  // Increment counter
  await prisma.emailRateLimit.update({
    where: {
      identifier_type: {
        identifier,
        type,
      },
    },
    data: {
      count: {
        increment: 1,
      },
    },
  })

  return {
    allowed: true,
    remaining: config.maxRequests - existing.count - 1,
  }
}

/**
 * Get current rate limit status without incrementing
 */
export async function getRateLimitStatus(
  identifier: string,
  type: RateLimitType
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[type]
  const now = new Date()
  const windowStart = new Date(now.getTime() - config.windowSeconds * 1000)

  const existing = await prisma.emailRateLimit.findUnique({
    where: {
      identifier_type: {
        identifier,
        type,
      },
    },
  })

  // No record or window expired
  if (!existing || existing.windowStart < windowStart) {
    return {
      allowed: true,
      remaining: config.maxRequests,
    }
  }

  // Check status
  if (existing.count >= config.maxRequests) {
    const resetTime = new Date(existing.windowStart.getTime() + config.windowSeconds * 1000)
    const retryAfter = Math.ceil((resetTime.getTime() - now.getTime()) / 1000)

    return {
      allowed: false,
      remaining: 0,
      retryAfter,
    }
  }

  return {
    allowed: true,
    remaining: config.maxRequests - existing.count,
  }
}

/**
 * Clean up expired rate limit records (run periodically)
 */
export async function cleanupExpiredRateLimits(): Promise<number> {
  const maxWindowSeconds = Math.max(
    ...Object.values(RATE_LIMITS).map((c) => c.windowSeconds)
  )
  const cutoff = new Date(Date.now() - maxWindowSeconds * 1000)

  const result = await prisma.emailRateLimit.deleteMany({
    where: {
      windowStart: {
        lt: cutoff,
      },
    },
  })

  return result.count
}
