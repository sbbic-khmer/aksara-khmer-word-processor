import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ sendId: string; linkId: string }>
}

/**
 * GET /api/email/track/click/[sendId]/[linkId]
 *
 * Track email link clicks and redirect to original URL.
 * Only tracks first click (ignores subsequent clicks).
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { sendId, linkId } = await params

  try {
    // Get the send record with campaign to find the original link
    const send = await prisma.emailSend.findUnique({
      where: { id: sendId },
      include: { campaign: true },
    })

    if (!send) {
      // Invalid send ID - redirect to home page
      return NextResponse.redirect(new URL('/', request.url))
    }

    // Parse tracked links from campaign content
    let originalUrl = '/'
    try {
      const trackedLinks = send.campaign.editorState
        ? JSON.parse(send.campaign.editorState)?.trackedLinks
        : null

      if (trackedLinks && typeof trackedLinks === 'object') {
        originalUrl = trackedLinks[linkId] || '/'
      }
    } catch {
      // If we can't parse links, default to home
    }

    // Track click (only first click)
    await prisma.emailSend.updateMany({
      where: {
        id: sendId,
        clickedAt: null,
      },
      data: {
        clickedAt: new Date(),
      },
    })

    // Redirect to original URL
    return NextResponse.redirect(originalUrl)
  } catch (error) {
    console.error('Failed to track click:', error)
    // On error, redirect to home
    return NextResponse.redirect(new URL('/', request.url))
  }
}
