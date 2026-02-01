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

// GET - List all documents for the current user
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const documents = await sql`
      SELECT id, title, created_at, updated_at
      FROM documents
      WHERE user_id = ${user.id}::uuid
      ORDER BY updated_at DESC
    `

    return NextResponse.json(documents)
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

    const result = await sql`
      INSERT INTO documents (user_id, title, content, editor_state)
      VALUES (${user.id}::uuid, ${title || "Untitled"}, ${content || ""}, ${JSON.stringify(editorState) || null})
      RETURNING id, title, content, editor_state, created_at, updated_at
    `

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("[v0] Error creating document:", error)
    return NextResponse.json({ error: "Failed to create document" }, { status: 500 })
  }
}
