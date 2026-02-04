import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'email-images')

interface RouteParams {
  params: Promise<{ id: string }>
}

// DELETE /api/admin/email/images/[id] - Delete an image
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const admin = await isAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    // Get the image record
    const image = await prisma.emailImage.findUnique({
      where: { id },
    })

    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 })
    }

    // Delete file from disk
    const filepath = path.join(UPLOAD_DIR, image.filename)
    if (existsSync(filepath)) {
      await unlink(filepath)
    }

    // Delete from database
    await prisma.emailImage.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting image:', error)
    return NextResponse.json(
      { error: 'Failed to delete image' },
      { status: 500 }
    )
  }
}
