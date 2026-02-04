import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/admin/email/campaigns/[id]/analytics
 *
 * Get analytics for a specific campaign.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const admin = await isAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    // Get campaign with send counts
    const campaign = await prisma.emailCampaign.findUnique({
      where: { id },
      select: {
        id: true,
        subject: true,
        status: true,
        recipientCount: true,
        sentAt: true,
        createdAt: true,
      },
    })

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Get detailed send statistics
    const [totalSends, openedSends, clickedSends, failedSends] = await Promise.all([
      prisma.emailSend.count({
        where: { campaignId: id },
      }),
      prisma.emailSend.count({
        where: { campaignId: id, openedAt: { not: null } },
      }),
      prisma.emailSend.count({
        where: { campaignId: id, clickedAt: { not: null } },
      }),
      prisma.emailSend.count({
        where: { campaignId: id, status: 'failed' },
      }),
    ])

    // Calculate rates
    const sentSuccessfully = totalSends - failedSends
    const openRate = sentSuccessfully > 0 ? (openedSends / sentSuccessfully) * 100 : 0
    const clickRate = sentSuccessfully > 0 ? (clickedSends / sentSuccessfully) * 100 : 0
    const clickToOpenRate = openedSends > 0 ? (clickedSends / openedSends) * 100 : 0

    // Get recent opens/clicks timeline (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const recentOpens = await prisma.emailSend.findMany({
      where: {
        campaignId: id,
        openedAt: { gte: sevenDaysAgo },
      },
      select: { openedAt: true },
      orderBy: { openedAt: 'asc' },
    })

    const recentClicks = await prisma.emailSend.findMany({
      where: {
        campaignId: id,
        clickedAt: { gte: sevenDaysAgo },
      },
      select: { clickedAt: true },
      orderBy: { clickedAt: 'asc' },
    })

    return NextResponse.json({
      campaign,
      stats: {
        total: totalSends,
        sent: sentSuccessfully,
        failed: failedSends,
        opened: openedSends,
        clicked: clickedSends,
        openRate: Math.round(openRate * 10) / 10,
        clickRate: Math.round(clickRate * 10) / 10,
        clickToOpenRate: Math.round(clickToOpenRate * 10) / 10,
      },
      timeline: {
        opens: recentOpens.map((s) => s.openedAt),
        clicks: recentClicks.map((s) => s.clickedAt),
      },
    })
  } catch (error) {
    console.error('Error fetching campaign analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
