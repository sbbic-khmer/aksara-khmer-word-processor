import { NextRequest, NextResponse } from 'next/server'
import { verifyEmailToken, markUserVerified } from '@/lib/email/tokens'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(new URL('/verify-email?error=missing_token', request.url))
  }

  const result = await verifyEmailToken(token)

  if (!result.valid) {
    if (result.expired) {
      return NextResponse.redirect(new URL('/verify-email?error=expired', request.url))
    }
    return NextResponse.redirect(new URL('/verify-email?error=invalid_token', request.url))
  }

  // Mark user as verified
  await markUserVerified(result.userId)

  // Redirect to editor with success message
  return NextResponse.redirect(new URL('/editor?verified=true', request.url))
}
