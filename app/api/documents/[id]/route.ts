import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth-server"
import {
  canUserSaveDocument,
  calculateDocumentSize,
  formatBytes,
  MAX_DOCUMENT_SIZE,
} from "@/lib/storage"
import { compressString, decompressString, getCompressionStats } from "@/lib/compression"

// GET - Get a specific document
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const document = await prisma.document.findFirst({
      where: { id, userId: user.id },
    })

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // Decompress editorState if it was stored compressed
    // This handles both old (uncompressed) and new (compressed) documents
    let editorState = document.editorState
    if (typeof editorState === "string") {
      const decompressed = decompressString(editorState)
      // Parse the JSON string back to object
      try {
        editorState = JSON.parse(decompressed)
      } catch {
        // If parsing fails, it might already be an object (shouldn't happen but be safe)
        editorState = document.editorState
      }
    }

    return NextResponse.json({
      id: document.id,
      title: document.title,
      content: document.content,
      editor_state: editorState,
      created_at: document.createdAt,
      updated_at: document.updatedAt,
    })
  } catch (error) {
    console.error("[v0] Error fetching document:", error)
    return NextResponse.json({ error: "Failed to fetch document" }, { status: 500 })
  }
}

// PUT - Update a document
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const { title, content, editorState, lastSavedAt, forceOverwrite } = await request.json()

    // Calculate document size for validation
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

    // Check user's storage quota (pass existing doc ID to account for replacement)
    const quotaCheck = await canUserSaveDocument(user.id, documentSize, id)
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

    // If lastSavedAt is provided and we're not forcing overwrite, check for conflicts
    if (lastSavedAt && !forceOverwrite) {
      const currentDoc = await prisma.document.findFirst({
        where: { id, userId: user.id },
        select: { updatedAt: true },
      })

      if (currentDoc) {
        const serverUpdatedAt = new Date(currentDoc.updatedAt).getTime()
        const clientLastSavedAt = new Date(lastSavedAt).getTime()

        // If server version is newer (with 1 second tolerance for timing issues)
        if (serverUpdatedAt > clientLastSavedAt + 1000) {
          return NextResponse.json(
            {
              error: "Conflict detected",
              conflict: true,
              serverUpdatedAt: currentDoc.updatedAt,
            },
            { status: 409 }
          )
        }
      }
    }

    // Compress editorState before storing to reduce storage size
    // Typically reduces size by 60-80%
    let compressedEditorState: string | undefined
    if (editorState !== undefined) {
      const editorStateStr = typeof editorState === "string" ? editorState : JSON.stringify(editorState)
      compressedEditorState = compressString(editorStateStr)

      // Log compression stats
      const stats = getCompressionStats(editorStateStr, compressedEditorState)
      console.log(`[Document ${id}] Compression: ${(stats.originalSize / 1024).toFixed(1)}KB → ${(stats.compressedSize / 1024).toFixed(1)}KB (${((1 - stats.ratio) * 100).toFixed(0)}% reduction)`)
    }

    const document = await prisma.document.updateMany({
      where: { id, userId: user.id },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(compressedEditorState !== undefined && { editorState: compressedEditorState }),
      },
    })

    if (document.count === 0) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // Fetch the updated document
    const updated = await prisma.document.findUnique({
      where: { id },
    })

    return NextResponse.json({
      id: updated!.id,
      title: updated!.title,
      content: updated!.content,
      editor_state: updated!.editorState,
      created_at: updated!.createdAt,
      updated_at: updated!.updatedAt,
    })
  } catch (error) {
    console.error("[v0] Error updating document:", error)
    return NextResponse.json({ error: "Failed to update document" }, { status: 500 })
  }
}

// DELETE - Delete a document
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const result = await prisma.document.deleteMany({
      where: { id, userId: user.id },
    })

    if (result.count === 0) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting document:", error)
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 })
  }
}
