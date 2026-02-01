import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getCurrentUser } from "@/lib/auth"
import {
  canUserSaveDocument,
  calculateDocumentSize,
  formatBytes,
  MAX_DOCUMENT_SIZE,
} from "@/lib/storage"

const sql = neon(process.env.DATABASE_URL!)

// GET - Get a specific document
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const result = await sql`
      SELECT id, title, content, editor_state, created_at, updated_at
      FROM documents
      WHERE id = ${id}::uuid AND user_id = ${user.id}::uuid
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    return NextResponse.json(result[0])
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
      const currentDoc = await sql`
        SELECT updated_at FROM documents
        WHERE id = ${id}::uuid AND user_id = ${user.id}::uuid
      `

      if (currentDoc.length > 0) {
        const serverUpdatedAt = new Date(currentDoc[0].updated_at).getTime()
        const clientLastSavedAt = new Date(lastSavedAt).getTime()

        // If server version is newer (with 1 second tolerance for timing issues)
        if (serverUpdatedAt > clientLastSavedAt + 1000) {
          return NextResponse.json(
            {
              error: "Conflict detected",
              conflict: true,
              serverUpdatedAt: currentDoc[0].updated_at,
            },
            { status: 409 },
          )
        }
      }
    }

    const result = await sql`
      UPDATE documents
      SET 
        title = COALESCE(${title}, title),
        content = COALESCE(${content}, content),
        editor_state = COALESCE(${JSON.stringify(editorState)}, editor_state)
      WHERE id = ${id}::uuid AND user_id = ${user.id}::uuid
      RETURNING id, title, content, editor_state, created_at, updated_at
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    return NextResponse.json(result[0])
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

    const result = await sql`
      DELETE FROM documents
      WHERE id = ${id}::uuid AND user_id = ${user.id}::uuid
      RETURNING id
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting document:", error)
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 })
  }
}
