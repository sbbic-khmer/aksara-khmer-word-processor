import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth-server"
import {
  canUserSaveDocument,
  calculateDocumentSize,
  calculateStoredSize,
  formatBytes,
  getMaxUncompressedSize,
  getUserStorageLimit,
} from "@/lib/storage"
import { compressString, isCompressed } from "@/lib/compression"

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

    const editorStateStr = editorState
      ? typeof editorState === "string" ? editorState : JSON.stringify(editorState)
      : null
    const alreadyCompressed = editorStateStr ? isCompressed(editorStateStr) : false

    // Check document size limit (skip if already compressed — client already checked)
    if (!alreadyCompressed) {
      const uncompressedSize = calculateDocumentSize(content, editorState)
      const userLimit = await getUserStorageLimit(user.id)
      const maxUncompressed = getMaxUncompressedSize(userLimit)

      if (uncompressedSize > maxUncompressed) {
        return NextResponse.json(
          {
            error: `Document is too large (${formatBytes(uncompressedSize)}). Maximum size is ${formatBytes(maxUncompressed)}.`,
            code: "DOCUMENT_TOO_LARGE",
          },
          { status: 413 }
        )
      }
    }

    // Compress editorState before storing (or use pre-compressed from client)
    let compressedEditorState: string | null = null
    if (editorStateStr) {
      compressedEditorState = alreadyCompressed ? editorStateStr : compressString(editorStateStr)
    }

    // Calculate the actual stored size (after compression)
    const storedSize = calculateStoredSize(content, compressedEditorState)

    // Check user's storage quota (new document, so existing size is 0)
    const quotaCheck = await canUserSaveDocument(user.id, storedSize, 0)
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

    // Create document and update user storage atomically
    const document = await prisma.$transaction(async (tx) => {
      const doc = await tx.document.create({
        data: {
          userId: user.id,
          title: title || "Untitled",
          content: content || "",
          editorState: compressedEditorState,
          sizeBytes: storedSize,
        },
        select: {
          id: true,
          title: true,
          createdAt: true,
          updatedAt: true,
        },
      })

      // Increment user's cached storage total
      await tx.user.update({
        where: { id: user.id },
        data: {
          storageUsedBytes: { increment: storedSize },
        },
      })

      return doc
    })

    return NextResponse.json({
      id: document.id,
      title: document.title,
      created_at: document.createdAt,
      updated_at: document.updatedAt,
    })
  } catch (error) {
    console.error("[v0] Error creating document:", error)
    return NextResponse.json({ error: "Failed to create document" }, { status: 500 })
  }
}
