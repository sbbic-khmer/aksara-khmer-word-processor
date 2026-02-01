/**
 * Input validation utilities for security hardening
 */

/**
 * Validate that a URL is a valid HTTPS image URL
 */
export function isValidImageUrl(url: string | null | undefined): boolean {
  // Empty/null is valid (optional field)
  if (!url) return true

  try {
    const parsed = new URL(url)

    // Only allow https
    if (parsed.protocol !== "https:") {
      return false
    }

    // Block dangerous protocols that might be URL-encoded
    const pathname = parsed.pathname.toLowerCase()
    if (pathname.includes("javascript:") || pathname.includes("data:")) {
      return false
    }

    // Check for valid image extensions
    const validExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"]
    const hasValidExtension = validExtensions.some((ext) =>
      pathname.endsWith(ext)
    )

    // Allow URLs with valid extensions OR dynamic image URLs (no extension)
    // Examples: https://example.com/avatar/123 or https://gravatar.com/avatar/hash
    const isDynamicUrl = !pathname.split("/").pop()?.includes(".")

    return hasValidExtension || isDynamicUrl
  } catch {
    // URL parsing failed
    return false
  }
}

/**
 * Sanitize error messages for production
 * Returns generic message in production, detailed message in development
 */
export function sanitizeErrorMessage(
  error: unknown,
  fallbackMessage = "An unexpected error occurred"
): string {
  const isProduction = process.env.NODE_ENV === "production"

  if (!isProduction) {
    // In development, return the actual error
    if (error instanceof Error) {
      return error.message
    }
    return String(error)
  }

  // In production, return generic message
  return fallbackMessage
}

/**
 * Validate that a string is a valid UUID
 */
export function isValidUUID(str: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}
