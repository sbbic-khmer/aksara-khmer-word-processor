import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { createVerificationToken } from '@/lib/email/tokens'
import { checkRateLimit, getRateLimitStatus } from '@/lib/email/rate-limit'
import { sendVerificationEmail } from '@/lib/email/email-service'

export async function POST(request: NextRequest) {
  try {
    // Get current session
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Check if already verified
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, emailVerified: true, name: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { error: 'Email already verified' },
        { status: 400 }
      )
    }

    // Check rate limit
    const rateLimit = await checkRateLimit(user.email, 'verification_resend')

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'rate_limited',
          retryAfter: rateLimit.retryAfter,
          message: `Too many requests. Please try again in ${Math.ceil((rateLimit.retryAfter || 0) / 60)} minutes.`,
        },
        { status: 429 }
      )
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
      return NextResponse.json(
        { error: 'Failed to send email. Please try again later.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      remaining: rateLimit.remaining,
    })
  } catch (error) {
    console.error('Error in resend-verification:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint to check rate limit status
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, emailVerified: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (user.emailVerified) {
      return NextResponse.json({ verified: true })
    }

    const status = await getRateLimitStatus(user.email, 'verification_resend')

    return NextResponse.json({
      verified: false,
      rateLimit: {
        allowed: status.allowed,
        remaining: status.remaining,
        retryAfter: status.retryAfter,
      },
    })
  } catch (error) {
    console.error('Error checking verification status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
