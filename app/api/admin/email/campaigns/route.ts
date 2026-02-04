import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

// GET /api/admin/email/campaigns - List all campaigns
export async function GET() {
  const admin = await isAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const campaigns = await prisma.emailCampaign.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { sends: true },
        },
      },
    })

    return NextResponse.json(campaigns)
  } catch (error) {
    console.error('Error fetching campaigns:', error)
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    )
  }
}

// POST /api/admin/email/campaigns - Create a new campaign
export async function POST(request: NextRequest) {
  const admin = await isAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { subject, senderName, htmlContent, editorState } = await request.json()

    if (!subject || typeof subject !== 'string') {
      return NextResponse.json(
        { error: 'Subject is required' },
        { status: 400 }
      )
    }

    const campaign = await prisma.emailCampaign.create({
      data: {
        subject,
        senderName: senderName || null,
        htmlContent: htmlContent || '',
        editorState: editorState || null,
        status: 'draft',
      },
    })

    return NextResponse.json(campaign, { status: 201 })
  } catch (error) {
    console.error('Error creating campaign:', error)
    return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    )
  }
}
