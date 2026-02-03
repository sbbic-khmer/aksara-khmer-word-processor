/**
 * Prisma Encryption Extension
 *
 * Transparently encrypts/decrypts document fields using Prisma Client Extensions:
 * - title, content, editorState
 *
 * On write (create/update): encrypts these fields before saving
 * On read (findMany/findUnique/findFirst): decrypts these fields after loading
 *
 * Gracefully handles missing ENCRYPTION_KEY in development.
 */

import { Prisma } from "@prisma/client"
import {
  encrypt,
  decrypt,
  encryptJson,
  decryptJson,
  isEncrypted,
  isEncryptionEnabled,
} from "./encryption"

// Fields to encrypt in the Document model
const ENCRYPTED_DOCUMENT_FIELDS = ["title", "content"] as const
const ENCRYPTED_JSON_FIELDS = ["editorState"] as const

/**
 * Encrypt document fields in data object
 */
function encryptDocumentFields(
  data: Record<string, unknown>
): Record<string, unknown> {
  const encrypted = { ...data }

  // Encrypt string fields
  for (const field of ENCRYPTED_DOCUMENT_FIELDS) {
    if (field in encrypted && encrypted[field] !== undefined) {
      encrypted[field] = encrypt(encrypted[field] as string)
    }
  }

  // Encrypt JSON fields
  for (const field of ENCRYPTED_JSON_FIELDS) {
    if (field in encrypted && encrypted[field] !== undefined) {
      // editorState is stored as Json in Prisma, but we encrypt it as a string
      encrypted[field] = encryptJson(encrypted[field])
    }
  }

  return encrypted
}

/**
 * Decrypt document fields in result object
 */
function decryptDocumentFields<T extends Record<string, unknown>>(result: T): T {
  if (!result || typeof result !== "object") return result

  const decrypted = { ...result }

  // Decrypt string fields
  for (const field of ENCRYPTED_DOCUMENT_FIELDS) {
    if (field in decrypted && decrypted[field] !== undefined) {
      decrypted[field] = decrypt(decrypted[field] as string) as T[typeof field]
    }
  }

  // Decrypt JSON fields
  for (const field of ENCRYPTED_JSON_FIELDS) {
    if (field in decrypted && decrypted[field] !== undefined) {
      const value = decrypted[field]
      // If it's a string that looks encrypted, decrypt it
      if (typeof value === "string" && isEncrypted(value)) {
        decrypted[field] = decryptJson(value) as T[typeof field]
      }
      // If it's already an object (not encrypted or from older data), leave as-is
    }
  }

  return decrypted as T
}

/**
 * Decrypt an array of results
 */
function decryptResultArray<T extends Record<string, unknown>>(
  results: T[]
): T[] {
  return results.map((result) => decryptDocumentFields(result))
}

// Log encryption status once per session
let encryptionLogged = false

function logEncryptionStatus() {
  if (process.env.NODE_ENV === "development" && !encryptionLogged) {
    const enabled = isEncryptionEnabled()
    console.log(
      `[Encryption] ${enabled ? "Enabled" : "Disabled (no ENCRYPTION_KEY)"}`
    )
    encryptionLogged = true
  }
}

/**
 * Create Prisma extension for document encryption
 *
 * Usage:
 * ```
 * import { createEncryptionExtension } from './prisma-encryption-extension'
 * const prisma = new PrismaClient().$extends(createEncryptionExtension())
 * ```
 */
export function createEncryptionExtension() {
  return Prisma.defineExtension({
    name: "document-encryption",
    query: {
      document: {
        async create({ args, query }) {
          logEncryptionStatus()
          if (args.data) {
            args.data = encryptDocumentFields(
              args.data as Record<string, unknown>
            ) as typeof args.data
          }
          const result = await query(args)
          return decryptDocumentFields(result as Record<string, unknown>)
        },

        async createMany({ args, query }) {
          logEncryptionStatus()
          if (args.data) {
            if (Array.isArray(args.data)) {
              args.data = args.data.map((item) =>
                encryptDocumentFields(item as Record<string, unknown>)
              ) as typeof args.data
            }
          }
          return query(args)
        },

        async update({ args, query }) {
          logEncryptionStatus()
          if (args.data) {
            args.data = encryptDocumentFields(
              args.data as Record<string, unknown>
            ) as typeof args.data
          }
          const result = await query(args)
          return decryptDocumentFields(result as Record<string, unknown>)
        },

        async updateMany({ args, query }) {
          logEncryptionStatus()
          if (args.data) {
            args.data = encryptDocumentFields(
              args.data as Record<string, unknown>
            ) as typeof args.data
          }
          return query(args)
        },

        async upsert({ args, query }) {
          logEncryptionStatus()
          if (args.create) {
            args.create = encryptDocumentFields(
              args.create as Record<string, unknown>
            ) as typeof args.create
          }
          if (args.update) {
            args.update = encryptDocumentFields(
              args.update as Record<string, unknown>
            ) as typeof args.update
          }
          const result = await query(args)
          return decryptDocumentFields(result as Record<string, unknown>)
        },

        async findUnique({ args, query }) {
          logEncryptionStatus()
          const result = await query(args)
          if (result) {
            return decryptDocumentFields(result as Record<string, unknown>)
          }
          return result
        },

        async findUniqueOrThrow({ args, query }) {
          logEncryptionStatus()
          const result = await query(args)
          return decryptDocumentFields(result as Record<string, unknown>)
        },

        async findFirst({ args, query }) {
          logEncryptionStatus()
          const result = await query(args)
          if (result) {
            return decryptDocumentFields(result as Record<string, unknown>)
          }
          return result
        },

        async findFirstOrThrow({ args, query }) {
          logEncryptionStatus()
          const result = await query(args)
          return decryptDocumentFields(result as Record<string, unknown>)
        },

        async findMany({ args, query }) {
          logEncryptionStatus()
          const results = await query(args)
          if (Array.isArray(results)) {
            return decryptResultArray(results as Record<string, unknown>[])
          }
          return results
        },
      },
    },
  })
}

/**
 * Check if a document has encrypted fields
 * Useful for migration scripts
 */
export function isDocumentEncrypted(doc: {
  title?: string | null
  content?: string | null
  editorState?: unknown
}): boolean {
  if (doc.title && isEncrypted(doc.title)) return true
  if (doc.content && isEncrypted(doc.content)) return true
  if (
    doc.editorState &&
    typeof doc.editorState === "string" &&
    isEncrypted(doc.editorState)
  )
    return true
  return false
}
