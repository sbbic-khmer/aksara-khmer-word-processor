/**
 * Password Migration Helper
 *
 * Handles verification of legacy PBKDF2 password hashes from Neon migration.
 * When a PBKDF2 hash is successfully verified, it should be re-hashed with bcrypt.
 *
 * Legacy Format (from old system):
 *   pbkdf2:salt:hash:iterations:keyLength:digest
 *   Example: pbkdf2:abc123...:def456...:100000:64:sha512
 *
 * After migration, passwords are stored with bcrypt (Better Auth default).
 */

import { pbkdf2, randomBytes, timingSafeEqual } from "crypto"
import { promisify } from "util"

const pbkdf2Async = promisify(pbkdf2)

// Constants matching the old auth system
const PBKDF2_ITERATIONS = 100000
const PBKDF2_KEY_LENGTH = 64
const PBKDF2_DIGEST = "sha512"

/**
 * Check if a password hash is a migrated PBKDF2 hash
 */
export function isPbkdf2Hash(hash: string): boolean {
  return hash.startsWith("pbkdf2:")
}

/**
 * Verify a password against a legacy PBKDF2 hash
 *
 * @param password - Plain text password to verify
 * @param storedHash - Stored hash in format "pbkdf2:salt:hash" or "pbkdf2:salt:hash:iterations:keyLength:digest"
 * @returns true if password matches
 */
export async function verifyPbkdf2Password(
  password: string,
  storedHash: string
): Promise<boolean> {
  if (!isPbkdf2Hash(storedHash)) {
    return false
  }

  try {
    // Remove the "pbkdf2:" prefix
    const hashPart = storedHash.slice(7)

    // The old system stored as: salt.hash (dot-separated, hex encoded)
    // Or it might be: salt:hash:iterations:keyLength:digest (colon-separated)
    let salt: string
    let hash: string
    let iterations = PBKDF2_ITERATIONS
    let keyLength = PBKDF2_KEY_LENGTH
    let digest = PBKDF2_DIGEST

    if (hashPart.includes(".")) {
      // Format: salt.hash (old format)
      const parts = hashPart.split(".")
      if (parts.length !== 2) {
        console.error("Invalid PBKDF2 hash format (dot-separated)")
        return false
      }
      salt = parts[0]
      hash = parts[1]
    } else if (hashPart.includes(":")) {
      // Format: salt:hash:iterations:keyLength:digest
      const parts = hashPart.split(":")
      if (parts.length < 2) {
        console.error("Invalid PBKDF2 hash format (colon-separated)")
        return false
      }
      salt = parts[0]
      hash = parts[1]
      if (parts.length >= 3) iterations = parseInt(parts[2], 10)
      if (parts.length >= 4) keyLength = parseInt(parts[3], 10)
      if (parts.length >= 5) digest = parts[4]
    } else {
      console.error("Unknown PBKDF2 hash format")
      return false
    }

    // Derive key from password
    // IMPORTANT: The old system used the salt as a plain string, not hex-decoded
    // This matches the original: crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512")
    const derivedKey = await pbkdf2Async(
      password,
      salt, // Use salt as string directly, not Buffer.from(salt, "hex")
      iterations,
      keyLength,
      digest
    )

    // Compare using timing-safe comparison
    const storedHashBuffer = Buffer.from(hash, "hex")

    if (derivedKey.length !== storedHashBuffer.length) {
      return false
    }

    return timingSafeEqual(derivedKey, storedHashBuffer)
  } catch (error) {
    console.error("Error verifying PBKDF2 password:", error)
    return false
  }
}

/**
 * Create a PBKDF2 hash (for testing purposes)
 */
export async function createPbkdf2Hash(password: string): Promise<string> {
  const salt = randomBytes(32)
  const hash = await pbkdf2Async(
    password,
    salt,
    PBKDF2_ITERATIONS,
    PBKDF2_KEY_LENGTH,
    PBKDF2_DIGEST
  )
  return `pbkdf2:${salt.toString("hex")}.${hash.toString("hex")}`
}
