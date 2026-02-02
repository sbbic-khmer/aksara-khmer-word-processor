import { auth } from "./auth"
import { headers } from "next/headers"

/**
 * Get the current session server-side (for Server Components and API routes)
 */
export async function getServerSession() {
  const headersList = await headers()
  return auth.api.getSession({
    headers: headersList,
  })
}

/**
 * Get the current user server-side
 */
export async function getCurrentUser() {
  const session = await getServerSession()
  return session?.user ?? null
}

/**
 * Check if the current user is authenticated
 */
export async function isAuthenticated() {
  const session = await getServerSession()
  return !!session?.user
}

/**
 * Check if the current user is an admin
 */
export async function isAdmin() {
  const session = await getServerSession()
  return (session?.user as { isAdmin?: boolean } | undefined)?.isAdmin ?? false
}

/**
 * Check if current user is dev (maps to isAdmin for backwards compatibility)
 */
export async function isDev() {
  return isAdmin()
}
