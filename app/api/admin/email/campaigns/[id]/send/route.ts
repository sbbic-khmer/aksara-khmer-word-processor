import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { queueCampaignEmails } from '@/lib/email/campaign-sender'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/admin/email/campaigns/[id]/send - Send or schedule a campaign
export async function POST(request: NextRequest, { params }: RouteParams) {
  const admin = await isAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const {
      scheduledAt,
      verifiedOnly = true,
      inactiveDays,
      registeredAfter,
      registeredBefore,
    } = await request.json()

    // Get campaign
    const campaign = await prisma.emailCampaign.findUnique({
      where: { id },
    })

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      return NextResponse.json(
        { error: 'Campaign cannot be sent in current status' },
        { status: 400 }
      )
    }

    // Store segment criteria in campaign
    const segmentCriteria = JSON.stringify({
      verifiedOnly,
      inactiveDays: inactiveDays || null,
      registeredAfter: registeredAfter || null,
      registeredBefore: registeredBefore || null,
    })

    if (scheduledAt) {
      // Schedule for later
      const scheduledDate = new Date(scheduledAt)
      if (scheduledDate <= new Date()) {
        return NextResponse.json(
          { error: 'Scheduled time must be in the future' },
          { status: 400 }
        )
      }

      await prisma.emailCampaign.update({
        where: { id },
        data: {
          status: 'scheduled',
          scheduledAt: scheduledDate,
          segmentCriteria,
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Campaign scheduled',
        scheduledAt: scheduledDate,
      })
    } else {
      // Send immediately
      await prisma.emailCampaign.update({
        where: { id },
        data: {
          status: 'sending',
          segmentCriteria,
        },
      })

      // Queue the emails
      const queuedCount = await queueCampaignEmails(id)

      return NextResponse.json({
        success: true,
        message: 'Campaign queued for sending',
        recipientCount: queuedCount,
      })
    }
  } catch (error) {
    console.error('Error sending campaign:', error)
    return NextResponse.json(
      { error: 'Failed to send campaign' },
      { status: 500 }
    )
  }
}
