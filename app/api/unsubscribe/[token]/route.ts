import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyUnsubscribeToken } from '@/lib/email/unsubscribe'

interface RouteParams {
  params: Promise<{ token: string }>
}

// POST /api/unsubscribe/[token] - One-click unsubscribe (RFC 8058)
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { token } = await params

  const userId = verifyUnsubscribeToken(token)
  if (!userId) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { marketingOptIn: false },
    })

    return NextResponse.json({ success: true, message: 'Unsubscribed successfully' })
  } catch (error) {
    console.error('Error unsubscribing:', error)
    return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 })
  }
}

// GET is handled by the page, but we support it for email client one-click
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { token } = await params

  const userId = verifyUnsubscribeToken(token)
  if (!userId) {
    // Redirect to error page
    const baseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'http://localhost:3000'
    return NextResponse.redirect(`${baseUrl}/unsubscribe/invalid`)
  }

  // For GET requests, redirect to the unsubscribe page for confirmation
  const baseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'http://localhost:3000'
  return NextResponse.redirect(`${baseUrl}/unsubscribe/${token}`)
}
