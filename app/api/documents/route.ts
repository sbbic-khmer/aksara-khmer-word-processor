import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth-server"
import {
  canUserSaveDocument,
  calculateDocumentSize,
  formatBytes,
  MAX_DOCUMENT_SIZE,
} from "@/lib/storage"
import { compressString, getCompressionStats } from "@/lib/compression"

// GET - List all documents for the current user
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const documents = await prisma.document.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    })

    // Map to expected format
    const result = documents.map((doc) => ({
      id: doc.id,
      title: doc.title,
      created_at: doc.createdAt,
      updated_at: doc.updatedAt,
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error("[v0] Error fetching documents:", error)
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 })
  }
}

// POST - Create a new document
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { title, content, editorState } = await request.json()

    // Calculate document size
    const documentSize = calculateDocumentSize(content, editorState)

    // Check document size limit (1MB max per document)
    if (documentSize > MAX_DOCUMENT_SIZE) {
      return NextResponse.json(
        {
          error: `Document is too large (${formatBytes(documentSize)}). Maximum size is ${formatBytes(MAX_DOCUMENT_SIZE)}.`,
          code: "DOCUMENT_TOO_LARGE",
        },
        { status: 413 }
      )
    }

    // Check user's storage quota
    const quotaCheck = await canUserSaveDocument(user.id, documentSize)
    if (!quotaCheck.allowed) {
      return NextResponse.json(
        {
          error: quotaCheck.message,
          code: "STORAGE_QUOTA_EXCEEDED",
          used: quotaCheck.used,
          limit: quotaCheck.limit,
        },
        { status: 413 }
      )
    }

    // Compress editorState before storing to reduce storage size
    let compressedEditorState: string | null = null
    if (editorState) {
      const editorStateStr = typeof editorState === "string" ? editorState : JSON.stringify(editorState)
      compressedEditorState = compressString(editorStateStr)

      // Log compression stats
      const stats = getCompressionStats(editorStateStr, compressedEditorState)
      console.log(`[New Document] Compression: ${(stats.originalSize / 1024).toFixed(1)}KB → ${(stats.compressedSize / 1024).toFixed(1)}KB (${((1 - stats.ratio) * 100).toFixed(0)}% reduction)`)
    }

    const document = await prisma.document.create({
      data: {
        userId: user.id,
        title: title || "Untitled",
        content: content || "",
        editorState: compressedEditorState,
      },
    })

    return NextResponse.json({
      id: document.id,
      title: document.title,
      content: document.content,
      editor_state: document.editorState,
      created_at: document.createdAt,
      updated_at: document.updatedAt,
    })
  } catch (error) {
    console.error("[v0] Error creating document:", error)
    return NextResponse.json({ error: "Failed to create document" }, { status: 500 })
  }
}
