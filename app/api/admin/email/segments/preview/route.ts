import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

// GET /api/admin/email/segments/preview - Get recipient count for segment criteria
export async function GET(request: NextRequest) {
  const admin = await isAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const verifiedOnly = searchParams.get('verifiedOnly') === 'true'
  const inactiveDays = searchParams.get('inactiveDays')
  const registeredAfter = searchParams.get('registeredAfter')
  const registeredBefore = searchParams.get('registeredBefore')

  try {
    // Build where clause - always exclude dev/test accounts and users who opted out
    const where: Record<string, unknown> = {
      email: { notIn: ['dev@localhost'] },
      marketingOptIn: true,
    }

    if (verifiedOnly) {
      where.emailVerified = true
    }

    if (inactiveDays) {
      const daysAgo = new Date()
      daysAgo.setDate(daysAgo.getDate() - parseInt(inactiveDays))
      // Users who haven't logged in since X days ago
      // We check sessions table for last activity
      where.sessions = {
        none: {
          updatedAt: { gte: daysAgo },
        },
      }
    }

    if (registeredAfter) {
      where.createdAt = {
        ...(where.createdAt as Record<string, unknown> || {}),
        gte: new Date(registeredAfter),
      }
    }

    if (registeredBefore) {
      where.createdAt = {
        ...(where.createdAt as Record<string, unknown> || {}),
        lte: new Date(registeredBefore),
      }
    }

    const count = await prisma.user.count({ where })

    // Also get sample of emails for preview
    const sample = await prisma.user.findMany({
      where,
      take: 5,
      select: {
        email: true,
        name: true,
      },
    })

    return NextResponse.json({ count, sample })
  } catch (error) {
    console.error('Error previewing segment:', error)
    return NextResponse.json(
      { error: 'Failed to preview segment' },
      { status: 500 }
    )
  }
}
