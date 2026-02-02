import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth-server"
import {
  canUserSaveDocument,
  calculateDocumentSize,
  calculateStoredSize,
  formatBytes,
  MAX_DOCUMENT_SIZE,
} from "@/lib/storage"
import { compressString, decompressString } from "@/lib/compression"

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

// Threshold for skipping quota check on auto-save (500KB)
// Documents under this size rarely cause quota issues
const AUTO_SAVE_QUOTA_SKIP_THRESHOLD = 500 * 1024

// PUT - Update a document
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const { title, content, editorState, lastSavedAt, forceOverwrite, isAutoSave } = await request.json()

    // Calculate document size before compression (for MAX_DOCUMENT_SIZE check)
    const uncompressedSize = calculateDocumentSize(content, editorState)

    // Check document size limit (2MB max per document)
    if (uncompressedSize > MAX_DOCUMENT_SIZE) {
      return NextResponse.json(
        {
          error: `Document is too large (${formatBytes(uncompressedSize)}). Maximum size is ${formatBytes(MAX_DOCUMENT_SIZE)}.`,
          code: "DOCUMENT_TOO_LARGE",
        },
        { status: 413 }
      )
    }

    // Compress editorState before storing to reduce storage size
    let compressedEditorState: string | undefined
    if (editorState !== undefined) {
      const editorStateStr = typeof editorState === "string" ? editorState : JSON.stringify(editorState)
      compressedEditorState = compressString(editorStateStr)
    }

    // Calculate the actual stored size (after compression)
    const newStoredSize = calculateStoredSize(content, compressedEditorState)

    // Get the current document to check conflict and get old size
    const currentDoc = await prisma.document.findFirst({
      where: { id, userId: user.id },
      select: { updatedAt: true, sizeBytes: true },
    })

    if (!currentDoc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    const oldStoredSize = currentDoc.sizeBytes

    // Check for conflicts if lastSavedAt is provided
    if (lastSavedAt && !forceOverwrite) {
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

    // For auto-saves of reasonably-sized documents, skip quota check
    // The quota was validated when the document was created
    const shouldCheckQuota = !isAutoSave || newStoredSize > AUTO_SAVE_QUOTA_SKIP_THRESHOLD

    if (shouldCheckQuota) {
      // Pass old size so quota check calculates delta correctly
      const quotaCheck = await canUserSaveDocument(user.id, newStoredSize, oldStoredSize)
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
    }

    // Calculate size delta for updating user's cached storage
    const sizeDelta = newStoredSize - oldStoredSize

    // Update document and user storage atomically in a transaction
    const updated = await prisma.$transaction(async (tx) => {
      // Update the document with new content and size
      const doc = await tx.document.update({
        where: { id, userId: user.id },
        data: {
          ...(title !== undefined && { title }),
          ...(content !== undefined && { content }),
          ...(compressedEditorState !== undefined && { editorState: compressedEditorState }),
          sizeBytes: newStoredSize,
        },
        select: {
          id: true,
          title: true,
          createdAt: true,
          updatedAt: true,
        },
      })

      // Update user's cached storage total
      if (sizeDelta !== 0) {
        await tx.user.update({
          where: { id: user.id },
          data: {
            storageUsedBytes: { increment: sizeDelta },
          },
        })
      }

      return doc
    })

    return NextResponse.json({
      id: updated.id,
      title: updated.title,
      created_at: updated.createdAt,
      updated_at: updated.updatedAt,
    })
  } catch (error: unknown) {
    // Prisma throws P2025 when record not found
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }
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

    // Get the document size before deleting (to update user's storage cache)
    const doc = await prisma.document.findFirst({
      where: { id, userId: user.id },
      select: { sizeBytes: true },
    })

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // Delete document and update user storage atomically
    await prisma.$transaction(async (tx) => {
      await tx.document.delete({
        where: { id, userId: user.id },
      })

      // Decrement user's storage cache
      if (doc.sizeBytes > 0) {
        await tx.user.update({
          where: { id: user.id },
          data: {
            storageUsedBytes: { decrement: doc.sizeBytes },
          },
        })
      }
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }
    console.error("[v0] Error deleting document:", error)
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 })
  }
}
