import { NextRequest, NextResponse } from 'next/server'
import { verifyPasswordResetToken } from '@/lib/email/tokens'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json(
      { valid: false, error: 'missing_token' },
      { status: 400 }
    )
  }

  const result = await verifyPasswordResetToken(token)

  if (!result.valid) {
    return NextResponse.json({
      valid: false,
      expired: result.expired,
    })
  }

  return NextResponse.json({ valid: true })
}
