import { NextRequest, NextResponse } from 'next/server'
import { processEmailQueue, checkScheduledCampaigns } from '@/lib/email/campaign-sender'

// Secret key for cron authentication (set in environment)
const CRON_SECRET = process.env.CRON_SECRET

/**
 * POST /api/cron/email-queue
 *
 * Process the email queue and check for scheduled campaigns.
 * Should be called by a cron job every minute.
 *
 * Requires CRON_SECRET header for authentication.
 */
export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const providedSecret = authHeader?.replace('Bearer ', '')

  if (CRON_SECRET && providedSecret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // First, check for scheduled campaigns that are due
    const scheduledCount = await checkScheduledCampaigns()

    // Then process the email queue
    const queueResult = await processEmailQueue()

    return NextResponse.json({
      success: true,
      scheduledCampaignsStarted: scheduledCount,
      emailsProcessed: queueResult.processed,
      emailsSent: queueResult.succeeded,
      emailsFailed: queueResult.failed,
    })
  } catch (error) {
    console.error('Error processing email queue:', error)
    return NextResponse.json(
      { error: 'Failed to process email queue' },
      { status: 500 }
    )
  }
}

// Also allow GET for simpler cron setups (e.g., uptime monitors)
export async function GET(request: NextRequest) {
  return POST(request)
}
