import { prisma } from "./prisma"

// Default limits
export const DEFAULT_STORAGE_LIMIT = 10 * 1024 * 1024 // 10MB
export const MAX_DOCUMENT_SIZE = 2 * 1024 * 1024 // 2MB per document

/**
 * Get the total storage used by a user from cached value.
 * This is O(1) - just reads a field from the user record.
 * The cached value is maintained atomically on document create/update/delete.
 */
export async function getUserStorageUsed(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { storageUsedBytes: true },
  })
  return user?.storageUsedBytes ?? 0
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
 * Get both storage used and limit for a user in a single query.
 * This is the preferred method for efficiency.
 */
export async function getUserStorageInfo(
  userId: string
): Promise<{ used: number; limit: number; percentage: number }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      storageUsedBytes: true,
      storageLimitBytes: true,
    },
  })

  const used = user?.storageUsedBytes ?? 0
  const limit = user?.storageLimitBytes ?? DEFAULT_STORAGE_LIMIT

  return {
    used,
    limit,
    percentage: Math.round((used / limit) * 100),
  }
}

/**
 * Check if a user can save a document of the given size.
 * For updates, pass the existing document's current size to calculate the delta.
 *
 * This is now O(1) - just compares cached values.
 */
export async function canUserSaveDocument(
  userId: string,
  newDocumentSize: number,
  existingDocumentSize: number = 0
): Promise<{
  allowed: boolean
  used: number
  limit: number
  message?: string
}> {
  const { used, limit } = await getUserStorageInfo(userId)

  // Calculate what the new total would be
  // For updates: subtract old size, add new size
  const delta = newDocumentSize - existingDocumentSize
  const newTotal = used + delta

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
 * Get the current size of a document from the database.
 * Used to calculate delta for quota checks on updates.
 */
export async function getDocumentSize(docId: string, userId: string): Promise<number> {
  const doc = await prisma.document.findFirst({
    where: { id: docId, userId },
    select: { sizeBytes: true },
  })
  return doc?.sizeBytes ?? 0
}

/**
 * Calculate the stored size of a document (content + compressed editorState).
 * This is the size that will be stored in sizeBytes.
 */
export function calculateStoredSize(
  content: string | null | undefined,
  compressedEditorState: string | null | undefined
): number {
  const contentSize = Buffer.byteLength(content || "", "utf8")
  const editorStateSize = Buffer.byteLength(compressedEditorState || "", "utf8")
  return contentSize + editorStateSize
}

/**
 * Calculate the size of a document before compression (for validation).
 * Used to check MAX_DOCUMENT_SIZE before compression.
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
 * Recalculate and fix a user's storage usage from their actual documents.
 * Use this if the cached value gets out of sync.
 */
export async function recalculateUserStorage(userId: string): Promise<number> {
  const result = await prisma.document.aggregate({
    where: { userId },
    _sum: { sizeBytes: true },
  })

  const totalSize = result._sum.sizeBytes ?? 0

  await prisma.user.update({
    where: { id: userId },
    data: { storageUsedBytes: totalSize },
  })

  return totalSize
}

/**
 * Recalculate storage for all users. Admin function.
 */
export async function recalculateAllUsersStorage(): Promise<void> {
  // Get all users
  const users = await prisma.user.findMany({
    select: { id: true },
  })

  // Update each user's storage
  for (const user of users) {
    await recalculateUserStorage(user.id)
  }
}
