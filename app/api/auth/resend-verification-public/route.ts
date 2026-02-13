import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createVerificationToken } from '@/lib/email/tokens'
import { checkRateLimit } from '@/lib/email/rate-limit'
import { sendVerificationEmail } from '@/lib/email/email-service'

// POST /api/auth/resend-verification-public - Resend verification without auth
// This is for users who can't log in because their email isn't verified
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Find the user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true, email: true, emailVerified: true, name: true },
    })

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a verification link has been sent.',
      })
    }

    // If already verified, still return success message (no enumeration)
    if (user.emailVerified) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a verification link has been sent.',
      })
    }

    // Check rate limit (stricter for public endpoint)
    const rateLimit = await checkRateLimit(user.email, 'verification_resend')

    if (!rateLimit.allowed) {
      // Still return success to prevent enumeration, but don't actually send
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a verification link has been sent.',
      })
    }

    // Create new verification token
    const { token } = await createVerificationToken(user.id)

    // Build verification URL
    const baseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || process.env.BETTER_AUTH_URL || 'https://aksarapro.app'
    const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${token}`

    // Send verification email
    const result = await sendVerificationEmail(user.email, verificationUrl, user.name || undefined)

    if (!result.success) {
      console.error('Failed to send verification email:', result.error)
      // Still return success to prevent enumeration
    }

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a verification link has been sent.',
    })
  } catch (error) {
    console.error('Error in resend-verification-public:', error)
    // Return success to prevent enumeration even on errors
    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a verification link has been sent.',
    })
  }
}
