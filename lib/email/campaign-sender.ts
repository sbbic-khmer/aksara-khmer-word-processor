import { prisma } from '@/lib/prisma'
import { sendCampaignEmail, isEmailConfigured } from './email-service'

interface SegmentCriteria {
  verifiedOnly: boolean
  inactiveDays: number | null
  registeredAfter: string | null
  registeredBefore: string | null
}

/**
 * Queue campaign emails for all matching users
 * Returns the number of emails queued
 */
export async function queueCampaignEmails(campaignId: string): Promise<number> {
  const campaign = await prisma.emailCampaign.findUnique({
    where: { id: campaignId },
  })

  if (!campaign) {
    throw new Error('Campaign not found')
  }

  // Parse segment criteria
  const criteria: SegmentCriteria = campaign.segmentCriteria
    ? JSON.parse(campaign.segmentCriteria)
    : { verifiedOnly: true, inactiveDays: null, registeredAfter: null, registeredBefore: null }

  // Build where clause for users
  const where: Record<string, unknown> = {
    // Always exclude dev/test accounts
    email: { notIn: ['dev@localhost'] },
  }

  if (criteria.verifiedOnly) {
    where.emailVerified = true
  }

  if (criteria.inactiveDays) {
    const daysAgo = new Date()
    daysAgo.setDate(daysAgo.getDate() - criteria.inactiveDays)
    where.sessions = {
      none: {
        updatedAt: { gte: daysAgo },
      },
    }
  }

  if (criteria.registeredAfter) {
    where.createdAt = {
      ...(where.createdAt as Record<string, unknown> || {}),
      gte: new Date(criteria.registeredAfter),
    }
  }

  if (criteria.registeredBefore) {
    where.createdAt = {
      ...(where.createdAt as Record<string, unknown> || {}),
      lte: new Date(criteria.registeredBefore),
    }
  }

  // Get all matching users
  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      email: true,
      name: true,
    },
  })

  if (users.length === 0) {
    // No recipients, mark as sent
    await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: {
        status: 'sent',
        sentAt: new Date(),
        recipientCount: 0,
      },
    })
    return 0
  }

  // Create EmailSend records for all users
  await prisma.emailSend.createMany({
    data: users.map((user) => ({
      campaignId,
      userId: user.id,
      email: user.email,
      status: 'queued',
    })),
  })

  // Update campaign recipient count
  await prisma.emailCampaign.update({
    where: { id: campaignId },
    data: {
      recipientCount: users.length,
    },
  })

  return users.length
}

/**
 * Process the email queue
 * Should be called periodically (e.g., every minute via cron)
 */
export async function processEmailQueue(): Promise<{
  processed: number
  succeeded: number
  failed: number
}> {
  if (!isEmailConfigured()) {
    console.warn('Email not configured, skipping queue processing')
    return { processed: 0, succeeded: 0, failed: 0 }
  }

  let processed = 0
  let succeeded = 0
  let failed = 0

  // Get pending sends (batch of 10)
  const pendingSends = await prisma.emailSend.findMany({
    where: { status: 'queued' },
    take: 10,
    include: {
      campaign: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  for (const send of pendingSends) {
    processed++

    try {
      // Add tracking pixel to email content
      const baseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || process.env.BETTER_AUTH_URL || 'http://localhost:3000'
      const trackingPixel = `<img src="${baseUrl}/api/email/track/open/${send.id}" width="1" height="1" style="display:none" alt="" />`
      const contentWithTracking = send.campaign.htmlContent + trackingPixel

      // Send the email
      const result = await sendCampaignEmail(
        send.email,
        send.campaign.subject,
        contentWithTracking,
        send.campaign.senderName || undefined
      )

      if (result.success) {
        await prisma.emailSend.update({
          where: { id: send.id },
          data: {
            status: 'sent',
            sentAt: new Date(),
          },
        })
        succeeded++
      } else {
        await prisma.emailSend.update({
          where: { id: send.id },
          data: {
            status: 'failed',
            errorMessage: result.error || 'Unknown error',
          },
        })
        failed++
      }
    } catch (error) {
      await prisma.emailSend.update({
        where: { id: send.id },
        data: {
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      })
      failed++
    }

    // Rate limit: 1 second between emails
    await sleep(1000)
  }

  // Check if any campaigns are complete
  await checkCompletedCampaigns()

  return { processed, succeeded, failed }
}

/**
 * Check for campaigns where all sends are complete
 */
async function checkCompletedCampaigns(): Promise<void> {
  // Find campaigns that are "sending" but have no more queued sends
  const sendingCampaigns = await prisma.emailCampaign.findMany({
    where: { status: 'sending' },
    include: {
      _count: {
        select: {
          sends: { where: { status: 'queued' } },
        },
      },
    },
  })

  for (const campaign of sendingCampaigns) {
    if (campaign._count.sends === 0) {
      // All sends are complete
      await prisma.emailCampaign.update({
        where: { id: campaign.id },
        data: {
          status: 'sent',
          sentAt: new Date(),
        },
      })
    }
  }
}

/**
 * Check for scheduled campaigns that are due to send
 */
export async function checkScheduledCampaigns(): Promise<number> {
  const dueCampaigns = await prisma.emailCampaign.findMany({
    where: {
      status: 'scheduled',
      scheduledAt: { lte: new Date() },
    },
  })

  let queued = 0
  for (const campaign of dueCampaigns) {
    await prisma.emailCampaign.update({
      where: { id: campaign.id },
      data: { status: 'sending' },
    })
    queued += await queueCampaignEmails(campaign.id)
  }

  return queued
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
