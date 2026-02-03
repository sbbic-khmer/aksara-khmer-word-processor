/**
 * Document Encryption Utilities
 *
 * Provides AES-256-GCM encryption for document content at rest.
 * Used by Prisma middleware to transparently encrypt/decrypt document fields.
 *
 * Key Management:
 * - ENCRYPTION_KEY environment variable (32 bytes, base64 encoded)
 * - Generate with: openssl rand -base64 32
 *
 * Encryption Format:
 * - Stored as: ENC:v1:{iv}:{ciphertext}:{authTag} (all base64)
 * - Prefix allows detecting encrypted vs plaintext data
 * - Supports future algorithm versioning
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto"

// Encryption constants
const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12 // 96 bits for GCM
const AUTH_TAG_LENGTH = 16 // 128 bits
const ENCRYPTION_PREFIX = "ENC:v1:"

/**
 * Get encryption key from environment variable
 * Returns null if not set (allows graceful degradation in development)
 */
function getEncryptionKey(): Buffer | null {
  const keyBase64 = process.env.ENCRYPTION_KEY
  if (!keyBase64) {
    return null
  }

  const key = Buffer.from(keyBase64, "base64")
  if (key.length !== 32) {
    console.error(
      "ENCRYPTION_KEY must be 32 bytes (256 bits). Generate with: openssl rand -base64 32"
    )
    return null
  }

  return key
}

/**
 * Check if a value is already encrypted
 */
export function isEncrypted(value: string | null | undefined): boolean {
  if (!value || typeof value !== "string") return false
  return value.startsWith(ENCRYPTION_PREFIX)
}

/**
 * Encrypt a plaintext string
 * Returns the encrypted value with prefix, or original value if encryption is disabled
 */
export function encrypt(plaintext: string | null | undefined): string | null {
  if (plaintext === null || plaintext === undefined) return null
  if (typeof plaintext !== "string") return plaintext

  const key = getEncryptionKey()
  if (!key) {
    // No encryption key - return plaintext (development mode)
    return plaintext
  }

  // Don't double-encrypt
  if (isEncrypted(plaintext)) {
    return plaintext
  }

  try {
    const iv = randomBytes(IV_LENGTH)
    const cipher = createCipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    })

    const encrypted = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ])

    const authTag = cipher.getAuthTag()

    // Format: ENC:v1:{iv}:{ciphertext}:{authTag}
    return `${ENCRYPTION_PREFIX}${iv.toString("base64")}:${encrypted.toString("base64")}:${authTag.toString("base64")}`
  } catch (error) {
    console.error("Encryption failed:", error)
    throw new Error("Failed to encrypt data")
  }
}

/**
 * Decrypt an encrypted string
 * Returns the decrypted value, or original value if not encrypted
 */
export function decrypt(ciphertext: string | null | undefined): string | null {
  if (ciphertext === null || ciphertext === undefined) return null
  if (typeof ciphertext !== "string") return ciphertext

  // Not encrypted - return as-is
  if (!isEncrypted(ciphertext)) {
    return ciphertext
  }

  const key = getEncryptionKey()
  if (!key) {
    // No encryption key but data is encrypted - this is a problem
    console.error(
      "Cannot decrypt: ENCRYPTION_KEY not set but data is encrypted"
    )
    throw new Error("Decryption failed: encryption key not available")
  }

  try {
    // Parse: ENC:v1:{iv}:{ciphertext}:{authTag}
    const withoutPrefix = ciphertext.slice(ENCRYPTION_PREFIX.length)
    const parts = withoutPrefix.split(":")

    if (parts.length !== 3) {
      throw new Error("Invalid encrypted data format")
    }

    const [ivBase64, encryptedBase64, authTagBase64] = parts
    const iv = Buffer.from(ivBase64, "base64")
    const encrypted = Buffer.from(encryptedBase64, "base64")
    const authTag = Buffer.from(authTagBase64, "base64")

    const decipher = createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    })
    decipher.setAuthTag(authTag)

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ])

    return decrypted.toString("utf8")
  } catch (error) {
    console.error("Decryption failed:", error)
    throw new Error("Failed to decrypt data")
  }
}

/**
 * Encrypt a JSON object
 * Serializes to JSON string, then encrypts
 */
export function encryptJson(obj: unknown): string | null {
  if (obj === null || obj === undefined) return null

  try {
    const jsonString = JSON.stringify(obj)
    return encrypt(jsonString)
  } catch (error) {
    console.error("JSON encryption failed:", error)
    throw new Error("Failed to encrypt JSON data")
  }
}

/**
 * Decrypt a JSON object
 * Decrypts, then parses JSON string
 */
export function decryptJson(ciphertext: string | null | undefined): unknown {
  if (ciphertext === null || ciphertext === undefined) return null

  try {
    const jsonString = decrypt(ciphertext)
    if (jsonString === null) return null

    return JSON.parse(jsonString)
  } catch (error) {
    console.error("JSON decryption failed:", error)
    throw new Error("Failed to decrypt JSON data")
  }
}

/**
 * Check if encryption is enabled (key is available)
 */
export function isEncryptionEnabled(): boolean {
  return getEncryptionKey() !== null
}
