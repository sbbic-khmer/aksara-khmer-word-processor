import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/admin/email/analytics
 *
 * Get aggregate email analytics across all campaigns.
 */
export async function GET(request: NextRequest) {
  const admin = await isAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get overall statistics
    const [
      totalCampaigns,
      sentCampaigns,
      totalSends,
      totalOpened,
      totalClicked,
      totalFailed,
    ] = await Promise.all([
      prisma.emailCampaign.count(),
      prisma.emailCampaign.count({ where: { status: 'sent' } }),
      prisma.emailSend.count({ where: { status: 'sent' } }),
      prisma.emailSend.count({ where: { openedAt: { not: null } } }),
      prisma.emailSend.count({ where: { clickedAt: { not: null } } }),
      prisma.emailSend.count({ where: { status: 'failed' } }),
    ])

    // Calculate average rates
    const avgOpenRate = totalSends > 0 ? (totalOpened / totalSends) * 100 : 0
    const avgClickRate = totalSends > 0 ? (totalClicked / totalSends) * 100 : 0

    // Get recent campaigns with their stats
    const recentCampaigns = await prisma.emailCampaign.findMany({
      where: { status: 'sent' },
      orderBy: { sentAt: 'desc' },
      take: 10,
      select: {
        id: true,
        subject: true,
        recipientCount: true,
        sentAt: true,
        _count: {
          select: { sends: true },
        },
      },
    })

    // Get open/click counts for recent campaigns
    const campaignStats = await Promise.all(
      recentCampaigns.map(async (campaign) => {
        const [opened, clicked] = await Promise.all([
          prisma.emailSend.count({
            where: { campaignId: campaign.id, openedAt: { not: null } },
          }),
          prisma.emailSend.count({
            where: { campaignId: campaign.id, clickedAt: { not: null } },
          }),
        ])
        return {
          ...campaign,
          opened,
          clicked,
          openRate: campaign._count.sends > 0 ? (opened / campaign._count.sends) * 100 : 0,
          clickRate: campaign._count.sends > 0 ? (clicked / campaign._count.sends) * 100 : 0,
        }
      })
    )

    // Get sends over time (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const sendsOverTime = await prisma.emailSend.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
      _count: { id: true },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({
      overview: {
        totalCampaigns,
        sentCampaigns,
        totalEmailsSent: totalSends,
        totalOpened,
        totalClicked,
        totalFailed,
        avgOpenRate: Math.round(avgOpenRate * 10) / 10,
        avgClickRate: Math.round(avgClickRate * 10) / 10,
      },
      recentCampaigns: campaignStats,
      sendsOverTime,
    })
  } catch (error) {
    console.error('Error fetching email analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
