import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return NextResponse.json({ authenticated: false })
    }

    // Get emailVerified status from database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { emailVerified: true },
    })

    return NextResponse.json({
      authenticated: true,
      emailVerified: user?.emailVerified ?? false,
    })
  } catch (error) {
    console.error('Auth check error:', error)
    return NextResponse.json({ authenticated: false })
  }
}
