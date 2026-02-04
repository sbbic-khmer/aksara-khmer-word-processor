import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'

// GET /api/user/email-preferences - Get current email preferences
export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { marketingOptIn: true },
    })

    return NextResponse.json({
      marketingOptIn: user?.marketingOptIn ?? true,
    })
  } catch (error) {
    console.error('Error fetching email preferences:', error)
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    )
  }
}

// PATCH /api/user/email-preferences - Update email preferences
export async function PATCH(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { marketingOptIn } = await request.json()

    if (typeof marketingOptIn !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid value for marketingOptIn' },
        { status: 400 }
      )
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { marketingOptIn },
    })

    return NextResponse.json({ success: true, marketingOptIn })
  } catch (error) {
    console.error('Error updating email preferences:', error)
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    )
  }
}
