import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { sendCampaignEmail, isEmailConfigured } from '@/lib/email/email-service'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/admin/email/campaigns/[id]/test - Send a test email
export async function POST(request: NextRequest, { params }: RouteParams) {
  const admin = await isAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isEmailConfigured()) {
    return NextResponse.json(
      { error: 'Email is not configured' },
      { status: 500 }
    )
  }

  const { id } = await params

  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      )
    }

    // Get campaign
    const campaign = await prisma.emailCampaign.findUnique({
      where: { id },
    })

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    if (!campaign.htmlContent) {
      return NextResponse.json(
        { error: 'Campaign has no content' },
        { status: 400 }
      )
    }

    // Send test email with [TEST] prefix in subject
    const result = await sendCampaignEmail(
      email,
      `[TEST] ${campaign.subject}`,
      campaign.htmlContent,
      campaign.senderName || undefined
    )

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Test email sent to ${email}`,
      })
    } else {
      return NextResponse.json(
        { error: result.error || 'Failed to send test email' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error sending test email:', error)
    return NextResponse.json(
      { error: 'Failed to send test email' },
      { status: 500 }
    )
  }
}
