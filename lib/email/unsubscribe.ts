import crypto from 'crypto'

const SECRET = process.env.BETTER_AUTH_SECRET || 'fallback-secret'

/**
 * Generate a signed unsubscribe token for a user
 * Token format: base64(userId:signature)
 */
export function generateUnsubscribeToken(userId: string): string {
  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(userId)
    .digest('hex')
    .slice(0, 16) // Shortened for URL friendliness

  const token = Buffer.from(`${userId}:${signature}`).toString('base64url')
  return token
}

/**
 * Verify and decode an unsubscribe token
 * Returns userId if valid, null if invalid
 */
export function verifyUnsubscribeToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8')
    const [userId, signature] = decoded.split(':')

    if (!userId || !signature) return null

    const expectedSignature = crypto
      .createHmac('sha256', SECRET)
      .update(userId)
      .digest('hex')
      .slice(0, 16)

    if (signature !== expectedSignature) return null

    return userId
  } catch {
    return null
  }
}

/**
 * Generate unsubscribe URL for a user
 */
export function getUnsubscribeUrl(userId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || process.env.BETTER_AUTH_URL || 'https://aksarapro.app'
  const token = generateUnsubscribeToken(userId)
  return `${baseUrl}/unsubscribe/${token}`
}

/**
 * Generate List-Unsubscribe header value
 * Includes both mailto and https options per RFC 8058
 */
export function getListUnsubscribeHeader(userId: string): {
  'List-Unsubscribe': string
  'List-Unsubscribe-Post': string
} {
  const url = getUnsubscribeUrl(userId)
  return {
    'List-Unsubscribe': `<${url}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  }
}
