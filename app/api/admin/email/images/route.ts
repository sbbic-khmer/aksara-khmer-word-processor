import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { createId } from '@paralleldrive/cuid2'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'email-images')
const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

// GET /api/admin/email/images - List all uploaded images
export async function GET() {
  const admin = await isAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const images = await prisma.emailImage.findMany({
      orderBy: { uploadedAt: 'desc' },
    })

    return NextResponse.json(images)
  } catch (error) {
    console.error('Error fetching images:', error)
    return NextResponse.json(
      { error: 'Failed to fetch images' },
      { status: 500 }
    )
  }
}

// POST /api/admin/email/images - Upload a new image
export async function POST(request: NextRequest) {
  const admin = await isAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: jpg, png, gif, webp' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 2MB' },
        { status: 400 }
      )
    }

    // Ensure upload directory exists
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true })
    }

    // Generate unique filename
    const ext = path.extname(file.name) || `.${file.type.split('/')[1]}`
    const filename = `${createId()}${ext}`
    const filepath = path.join(UPLOAD_DIR, filename)

    // Write file
    const bytes = await file.arrayBuffer()
    await writeFile(filepath, Buffer.from(bytes))

    // Build URL
    const baseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || process.env.BETTER_AUTH_URL || 'http://localhost:3000'
    const url = `${baseUrl}/uploads/email-images/${filename}`

    // Save to database
    const image = await prisma.emailImage.create({
      data: {
        filename,
        url,
        size: file.size,
        mimeType: file.type,
      },
    })

    return NextResponse.json(image, { status: 201 })
  } catch (error) {
    console.error('Error uploading image:', error)
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    )
  }
}
