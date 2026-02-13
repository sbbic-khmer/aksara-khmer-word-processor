import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createPasswordResetToken, getUserByEmail } from '@/lib/email/tokens'
import { checkRateLimit } from '@/lib/email/rate-limit'
import { sendPasswordResetEmail, isEmailConfigured } from '@/lib/email/email-service'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Always return success to prevent email enumeration
    // But internally, check if user exists and rate limit

    // Check rate limit first (prevents enumeration via timing)
    const rateLimit = await checkRateLimit(normalizedEmail, 'password_reset')
    if (!rateLimit.allowed) {
      // Still return success to prevent enumeration
      return NextResponse.json({ success: true })
    }

    // Check if email service is configured
    if (!isEmailConfigured()) {
      console.error('Password reset requested but email is not configured')
      return NextResponse.json({ success: true })
    }

    // Find user by email
    const user = await getUserByEmail(normalizedEmail)
    if (!user) {
      // Don't reveal that user doesn't exist
      return NextResponse.json({ success: true })
    }

    // Create reset token
    const { token } = await createPasswordResetToken(user.id)

    // Build reset URL
    const baseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || process.env.BETTER_AUTH_URL || 'https://aksarapro.app'
    const resetUrl = `${baseUrl}/reset-password/${token}`

    // Send reset email
    const result = await sendPasswordResetEmail(user.email, resetUrl)

    if (!result.success) {
      console.error('Failed to send password reset email:', result.error)
      // Still return success to prevent enumeration
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in forgot-password:', error)
    // Return success even on error to prevent enumeration
    return NextResponse.json({ success: true })
  }
}
