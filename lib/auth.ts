import { cookies } from "next/headers"
import crypto from "crypto"
import { sql, type User } from "./db"

const SESSION_COOKIE_NAME = "aksara_session"

// Hash password using crypto (bcrypt alternative without native deps)
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex")
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex")
  return `${salt}:${hash}`
}

// Verify password
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, hash] = storedHash.split(":")
  const verifyHash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex")
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(verifyHash, "hex"))
}

// Generate a secure session token
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex")
}

// Hash session token for storage
export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex")
}

// Create a new session in the database
export async function createSession(userId: string): Promise<string> {
  const token = generateSessionToken()
  const tokenHash = hashSessionToken(token)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  await sql`
    INSERT INTO sessions (user_id, token_hash, expires_at)
    VALUES (${userId}, ${tokenHash}, ${expiresAt})
  `

  return token
}

// Validate session and return user
export async function validateSession(token: string): Promise<User | null> {
  const tokenHash = hashSessionToken(token)

  const result = await sql`
    SELECT u.* FROM users u
    JOIN sessions s ON s.user_id = u.id
    WHERE s.token_hash = ${tokenHash}
    AND s.expires_at > NOW()
  `

  if (result.length === 0) return null
  return result[0] as User
}

// Delete session
export async function deleteSession(token: string): Promise<void> {
  const tokenHash = hashSessionToken(token)
  await sql`DELETE FROM sessions WHERE token_hash = ${tokenHash}`
}

// Delete all sessions for a user
export async function deleteUserSessions(userId: string): Promise<void> {
  await sql`DELETE FROM sessions WHERE user_id = ${userId}`
}

// Clean up expired sessions
export async function cleanupExpiredSessions(): Promise<void> {
  await sql`DELETE FROM sessions WHERE expires_at < NOW()`
}

// Get current authenticated user from cookies
export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)

  if (!sessionToken?.value) {
    // This prevents accidental production exposure
    if (process.env.NODE_ENV === "development" && process.env.ALLOW_DEV_AUTH_BYPASS === "true") {
      return {
        id: "00000000-0000-0000-0000-000000000001",
        email: "dev@localhost",
        password_hash: "",
        name: "Developer",
        role: "admin",
        created_at: new Date(),
        updated_at: new Date(),
      }
    }
    return null
  }

  return validateSession(sessionToken.value)
}

// Check if current request is authenticated
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser()
  return user !== null
}

// Check if current user is admin
export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser()
  return user?.role === "admin"
}

export { SESSION_COOKIE_NAME }
