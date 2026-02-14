import { NextRequest, NextResponse } from 'next/server'
import { verifyEmailToken, markUserVerified } from '@/lib/email/tokens'

const BASE_URL = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || process.env.BETTER_AUTH_URL || 'https://aksarapro.app'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(new URL('/verify-email?error=missing_token', BASE_URL))
  }

  const result = await verifyEmailToken(token)

  if (!result.valid) {
    if (result.expired) {
      return NextResponse.redirect(new URL('/verify-email?error=expired', BASE_URL))
    }
    return NextResponse.redirect(new URL('/verify-email?error=invalid_token', BASE_URL))
  }

  // Mark user as verified
  await markUserVerified(result.userId)

  // Redirect to editor with success message
  return NextResponse.redirect(new URL('/editor?verified=true', BASE_URL))
}
