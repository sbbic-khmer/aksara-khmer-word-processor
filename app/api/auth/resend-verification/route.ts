import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { checkRateLimit, getRateLimitStatus } from '@/lib/email/rate-limit'

// POST: resend the verification email for the currently signed-in user.
// Better Auth handles the token + delivery; we just gate it with our per-email
// rate limit (stricter than Better Auth's per-IP global limiter).
export async function POST() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })

    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, emailVerified: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.emailVerified) {
      return NextResponse.json({ error: 'Email already verified' }, { status: 400 })
    }

    const rateLimit = await checkRateLimit(user.email, 'verification_resend')
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'rate_limited',
          retryAfter: rateLimit.retryAfter,
          message: `Too many requests. Please try again in ${Math.ceil(
            (rateLimit.retryAfter || 0) / 60
          )} minutes.`,
        },
        { status: 429 }
      )
    }

    try {
      await auth.api.sendVerificationEmail({
        body: { email: user.email },
        headers: await headers(),
      })
    } catch (error) {
      console.error('Failed to send verification email:', error)
      return NextResponse.json(
        { error: 'Failed to send email. Please try again later.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, remaining: rateLimit.remaining })
  } catch (error) {
    console.error('Error in resend-verification:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET: status check used by the /verify-email page to display rate-limit info.
export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, emailVerified: true },
    })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
