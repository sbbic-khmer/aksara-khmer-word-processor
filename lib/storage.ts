import { prisma } from "./prisma"

// Default limits
export const DEFAULT_STORAGE_LIMIT = 10 * 1024 * 1024 // 10MB
export const MAX_DOCUMENT_SIZE = 2 * 1024 * 1024 // 2MB per document

/**
 * Get the total storage used by a user (sum of all document sizes)
 */
export async function getUserStorageUsed(userId: string): Promise<number> {
  const documents = await prisma.document.findMany({
    where: { userId },
    select: {
      content: true,
      editorState: true,
    },
  })

  return documents.reduce((total, doc) => {
    const contentSize = Buffer.byteLength(doc.content || "", "utf8")
    const editorStateSize = Buffer.byteLength(
      JSON.stringify(doc.editorState) || "",
      "utf8"
    )
    return total + contentSize + editorStateSize
  }, 0)
}

/**
 * Get a user's storage limit (from their profile or default)
 */
export async function getUserStorageLimit(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { storageLimitBytes: true },
  })
  return user?.storageLimitBytes ?? DEFAULT_STORAGE_LIMIT
}

/**
 * Get both storage used and limit for a user
 */
export async function getUserStorageInfo(
  userId: string
): Promise<{ used: number; limit: number; percentage: number }> {
  const [used, limit] = await Promise.all([
    getUserStorageUsed(userId),
    getUserStorageLimit(userId),
  ])

  return {
    used,
    limit,
    percentage: Math.round((used / limit) * 100),
  }
}

/**
 * Check if a user can save a document of the given size
 * For updates, pass the existing document ID to subtract its current size
 */
export async function canUserSaveDocument(
  userId: string,
  documentSize: number,
  existingDocId?: string
): Promise<{
  allowed: boolean
  used: number
  limit: number
  message?: string
}> {
  const [used, limit] = await Promise.all([
    getUserStorageUsed(userId),
    getUserStorageLimit(userId),
  ])

  // If updating an existing doc, subtract its current size from used
  let effectiveUsed = used
  if (existingDocId) {
    const existing = await prisma.document.findFirst({
      where: { id: existingDocId, userId },
      select: {
        content: true,
        editorState: true,
      },
    })
    if (existing) {
      const contentSize = Buffer.byteLength(existing.content || "", "utf8")
      const editorStateSize = Buffer.byteLength(
        JSON.stringify(existing.editorState) || "",
        "utf8"
      )
      effectiveUsed -= contentSize + editorStateSize
    }
  }

  const newTotal = effectiveUsed + documentSize

  if (newTotal > limit) {
    return {
      allowed: false,
      used,
      limit,
      message: `Storage quota exceeded. Using ${formatBytes(used)} of ${formatBytes(limit)}. Please delete some documents to free up space.`,
    }
  }

  return { allowed: true, used, limit }
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

/**
 * Calculate the size of a document (content + editor state)
 */
export function calculateDocumentSize(
  content: string | null | undefined,
  editorState: unknown
): number {
  const contentSize = Buffer.byteLength(content || "", "utf8")
  const editorStateSize = Buffer.byteLength(
    JSON.stringify(editorState) || "",
    "utf8"
  )
  return contentSize + editorStateSize
}
