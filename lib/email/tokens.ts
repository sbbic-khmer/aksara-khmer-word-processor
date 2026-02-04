import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

const VERIFICATION_TOKEN_EXPIRY_HOURS = 48
const PASSWORD_RESET_TOKEN_EXPIRY_HOURS = 1

/**
 * Generate a cryptographically secure token
 */
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Hash a token for secure storage
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

// ============================================================================
// Email Verification Tokens
// ============================================================================

export interface CreateVerificationTokenResult {
  token: string
  expiresAt: Date
}

/**
 * Create a new email verification token for a user
 * Deletes any existing tokens for the user first
 */
export async function createVerificationToken(userId: string): Promise<CreateVerificationTokenResult> {
  // Delete any existing tokens for this user
  await prisma.emailVerificationToken.deleteMany({
    where: { userId },
  })

  const token = generateSecureToken()
  const tokenHash = hashToken(token)
  const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000)

  await prisma.emailVerificationToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  })

  return { token, expiresAt }
}

/**
 * Verify an email verification token
 * Returns the user ID if valid, null otherwise
 */
export async function verifyEmailToken(token: string): Promise<{ userId: string; valid: true } | { valid: false; expired: boolean }> {
  const tokenHash = hashToken(token)

  const tokenRecord = await prisma.emailVerificationToken.findFirst({
    where: { tokenHash },
  })

  if (!tokenRecord) {
    return { valid: false, expired: false }
  }

  // Check if expired
  if (tokenRecord.expiresAt < new Date()) {
    // Clean up expired token
    await prisma.emailVerificationToken.delete({
      where: { id: tokenRecord.id },
    })
    return { valid: false, expired: true }
  }

  return { valid: true, userId: tokenRecord.userId }
}

/**
 * Mark user as verified and delete the token
 */
export async function markUserVerified(userId: string): Promise<void> {
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    }),
    prisma.emailVerificationToken.deleteMany({
      where: { userId },
    }),
  ])
}

// ============================================================================
// Password Reset Tokens
// ============================================================================

export interface CreatePasswordResetTokenResult {
  token: string
  expiresAt: Date
}

/**
 * Create a new password reset token for a user
 * Deletes any existing tokens for the user first
 */
export async function createPasswordResetToken(userId: string): Promise<CreatePasswordResetTokenResult> {
  // Delete any existing tokens for this user
  await prisma.passwordResetToken.deleteMany({
    where: { userId },
  })

  const token = generateSecureToken()
  const tokenHash = hashToken(token)
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000)

  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  })

  return { token, expiresAt }
}

/**
 * Verify a password reset token
 * Returns the user ID if valid, null otherwise
 */
export async function verifyPasswordResetToken(token: string): Promise<{ userId: string; valid: true } | { valid: false; expired: boolean }> {
  const tokenHash = hashToken(token)

  const tokenRecord = await prisma.passwordResetToken.findFirst({
    where: { tokenHash },
  })

  if (!tokenRecord) {
    return { valid: false, expired: false }
  }

  // Check if expired
  if (tokenRecord.expiresAt < new Date()) {
    // Clean up expired token
    await prisma.passwordResetToken.delete({
      where: { id: tokenRecord.id },
    })
    return { valid: false, expired: true }
  }

  return { valid: true, userId: tokenRecord.userId }
}

/**
 * Delete password reset token after successful reset
 */
export async function deletePasswordResetToken(userId: string): Promise<void> {
  await prisma.passwordResetToken.deleteMany({
    where: { userId },
  })
}

/**
 * Get user by email (for password reset requests)
 */
export async function getUserByEmail(email: string): Promise<{ id: string; email: string; name: string | null } | null> {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, email: true, name: true },
  })
}
