import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { checkRateLimit } from '@/lib/email/rate-limit'

// Public resend endpoint for users locked out by requireEmailVerification.
// Better Auth's POST /api/auth/send-verification-email handles unauthenticated
// requests too, but we keep this thin wrapper to apply per-email rate-limiting.
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

    // Always return the same enumeration-safe response.
    const successResponse = NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a verification link has been sent.',
    })

    const rateLimit = await checkRateLimit(normalizedEmail, 'verification_resend')
    if (!rateLimit.allowed) {
      return successResponse
    }

    try {
      await auth.api.sendVerificationEmail({
        body: { email: normalizedEmail },
        headers: await headers(),
      })
    } catch (error) {
      // Better Auth throws for unknown emails or already-verified emails.
      // Swallow to preserve enumeration safety.
      console.warn('sendVerificationEmail rejected:', error instanceof Error ? error.message : error)
    }

    return successResponse
  } catch (error) {
    console.error('Error in resend-verification-public:', error)
    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a verification link has been sent.',
    })
  }
}
