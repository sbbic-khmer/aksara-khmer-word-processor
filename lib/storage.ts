import { sql } from "./db"

// Default limits
export const DEFAULT_STORAGE_LIMIT = 5 * 1024 * 1024 // 5MB
export const MAX_DOCUMENT_SIZE = 1 * 1024 * 1024 // 1MB

/**
 * Get the total storage used by a user (sum of all document sizes)
 */
export async function getUserStorageUsed(userId: string): Promise<number> {
  const result = await sql`
    SELECT COALESCE(
      SUM(
        OCTET_LENGTH(COALESCE(content, '')) +
        OCTET_LENGTH(COALESCE(editor_state::text, ''))
      ), 0
    )::bigint as total_bytes
    FROM documents
    WHERE user_id = ${userId}::uuid
  `
  return Number(result[0]?.total_bytes || 0)
}

/**
 * Get a user's storage limit (from their profile or default)
 */
export async function getUserStorageLimit(userId: string): Promise<number> {
  const result = await sql`
    SELECT storage_limit_bytes FROM users WHERE id = ${userId}::uuid
  `
  return Number(result[0]?.storage_limit_bytes || DEFAULT_STORAGE_LIMIT)
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
    const existing = await sql`
      SELECT
        OCTET_LENGTH(COALESCE(content, '')) +
        OCTET_LENGTH(COALESCE(editor_state::text, '')) as size
      FROM documents
      WHERE id = ${existingDocId}::uuid AND user_id = ${userId}::uuid
    `
    if (existing[0]?.size) {
      effectiveUsed -= Number(existing[0].size)
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
