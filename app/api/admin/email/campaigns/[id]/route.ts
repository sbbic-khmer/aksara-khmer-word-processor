import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/admin/email/campaigns/[id] - Get single campaign
export async function GET(request: NextRequest, { params }: RouteParams) {
  const admin = await isAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const campaign = await prisma.emailCampaign.findUnique({
      where: { id },
      include: {
        _count: {
          select: { sends: true },
        },
      },
    })

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    return NextResponse.json(campaign)
  } catch (error) {
    console.error('Error fetching campaign:', error)
    return NextResponse.json(
      { error: 'Failed to fetch campaign' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/email/campaigns/[id] - Update campaign
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const admin = await isAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const { subject, senderName, htmlContent, editorState, status } = await request.json()

    // Check campaign exists
    const existing = await prisma.emailCampaign.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Can only edit drafts or scheduled campaigns
    if (existing.status === 'sent' || existing.status === 'sending') {
      return NextResponse.json(
        { error: 'Cannot edit a sent or sending campaign' },
        { status: 400 }
      )
    }

    const campaign = await prisma.emailCampaign.update({
      where: { id },
      data: {
        subject: subject ?? existing.subject,
        senderName: senderName !== undefined ? senderName : existing.senderName,
        htmlContent: htmlContent ?? existing.htmlContent,
        editorState: editorState !== undefined ? editorState : existing.editorState,
        status: status ?? existing.status,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json(campaign)
  } catch (error) {
    console.error('Error updating campaign:', error)
    return NextResponse.json(
      { error: 'Failed to update campaign' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/email/campaigns/[id] - Delete draft campaign
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const admin = await isAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    // Check campaign exists and is a draft
    const existing = await prisma.emailCampaign.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    if (existing.status !== 'draft') {
      return NextResponse.json(
        { error: 'Can only delete draft campaigns' },
        { status: 400 }
      )
    }

    await prisma.emailCampaign.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting campaign:', error)
    return NextResponse.json(
      { error: 'Failed to delete campaign' },
      { status: 500 }
    )
  }
}
