import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 1x1 transparent GIF (base64 decoded)
const TRANSPARENT_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
)

interface RouteParams {
  params: Promise<{ sendId: string }>
}

/**
 * GET /api/email/track/open/[sendId]
 *
 * Track email opens via a 1x1 transparent tracking pixel.
 * Only tracks first open (ignores subsequent loads).
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { sendId } = await params

  // Fire and forget - don't block on DB update
  try {
    // Only update if not already opened
    await prisma.emailSend.updateMany({
      where: {
        id: sendId,
        openedAt: null,
      },
      data: {
        openedAt: new Date(),
      },
    })
  } catch (error) {
    // Log but don't fail - tracking should be non-blocking
    console.error('Failed to track open:', error)
  }

  // Return 1x1 transparent GIF
  return new NextResponse(TRANSPARENT_GIF, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Content-Length': String(TRANSPARENT_GIF.length),
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  })
}
