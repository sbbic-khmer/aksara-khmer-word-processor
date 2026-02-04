import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/admin/email/campaigns/[id]/cancel - Cancel a scheduled campaign
export async function POST(request: NextRequest, { params }: RouteParams) {
  const admin = await isAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    // Get campaign
    const campaign = await prisma.emailCampaign.findUnique({
      where: { id },
    })

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    if (campaign.status !== 'scheduled') {
      return NextResponse.json(
        { error: 'Only scheduled campaigns can be cancelled' },
        { status: 400 }
      )
    }

    // Revert to draft
    await prisma.emailCampaign.update({
      where: { id },
      data: {
        status: 'draft',
        scheduledAt: null,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Campaign cancelled and reverted to draft',
    })
  } catch (error) {
    console.error('Error cancelling campaign:', error)
    return NextResponse.json(
      { error: 'Failed to cancel campaign' },
      { status: 500 }
    )
  }
}
