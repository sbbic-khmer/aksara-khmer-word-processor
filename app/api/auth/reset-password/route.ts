import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPasswordResetToken, deletePasswordResetToken } from '@/lib/email/tokens'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json()

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // Verify token
    const result = await verifyPasswordResetToken(token)

    if (!result.valid) {
      return NextResponse.json(
        {
          error: result.expired ? 'expired' : 'invalid',
          message: result.expired
            ? 'This reset link has expired. Please request a new one.'
            : 'This reset link is invalid.',
        },
        { status: 400 }
      )
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Update password and invalidate all sessions
    await prisma.$transaction([
      // Update password in account table (Better Auth uses account.password)
      prisma.account.updateMany({
        where: {
          userId: result.userId,
          providerId: 'credential',
        },
        data: {
          password: hashedPassword,
        },
      }),
      // Delete all sessions for this user
      prisma.session.deleteMany({
        where: { userId: result.userId },
      }),
      // Delete the reset token
      prisma.passwordResetToken.deleteMany({
        where: { userId: result.userId },
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in reset-password:', error)
    return NextResponse.json(
      { error: 'Failed to reset password. Please try again.' },
      { status: 500 }
    )
  }
}
