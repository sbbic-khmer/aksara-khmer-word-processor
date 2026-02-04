import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/admin/email/campaigns/[id]/clone - Clone a campaign
export async function POST(request: NextRequest, { params }: RouteParams) {
  const admin = await isAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    // Get the original campaign
    const original = await prisma.emailCampaign.findUnique({
      where: { id },
    })

    if (!original) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Create a copy
    const clone = await prisma.emailCampaign.create({
      data: {
        subject: `Copy of ${original.subject}`,
        senderName: original.senderName,
        htmlContent: original.htmlContent,
        editorState: original.editorState,
        status: 'draft',
      },
    })

    return NextResponse.json(clone, { status: 201 })
  } catch (error) {
    console.error('Error cloning campaign:', error)
    return NextResponse.json(
      { error: 'Failed to clone campaign' },
      { status: 500 }
    )
  }
}
