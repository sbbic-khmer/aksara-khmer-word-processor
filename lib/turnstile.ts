/**
 * Cloudflare Turnstile server-side validation
 *
 * Validates Turnstile tokens server-side using the Siteverify API.
 * Tokens are single-use and expire after 5 minutes.
 */

interface TurnstileVerifyResponse {
  success: boolean
  challenge_ts?: string
  hostname?: string
  "error-codes"?: string[]
  action?: string
  cdata?: string
}

/**
 * Validates a Turnstile token server-side
 *
 * @param token - The Turnstile token from the client
 * @param remoteIp - The client's IP address (optional but recommended)
 * @returns Object with success status and optional error message
 */
export async function verifyTurnstileToken(
  token: string | null | undefined,
  remoteIp?: string | null
): Promise<{ success: boolean; error?: string }> {
  // Check if Turnstile is configured
  const secretKey = process.env.TURNSTILE_SECRET_KEY

  // If no secret key configured, skip validation (development mode)
  if (!secretKey) {
    console.warn("TURNSTILE_SECRET_KEY not configured, skipping validation")
    return { success: true }
  }

  // Validate token is present
  if (!token) {
    return { success: false, error: "Please complete the security challenge" }
  }

  try {
    const formData = new FormData()
    formData.append("secret", secretKey)
    formData.append("response", token)

    // Pass client IP if available (recommended by Cloudflare)
    if (remoteIp) {
      formData.append("remoteip", remoteIp)
    }

    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: formData,
      }
    )

    if (!response.ok) {
      console.error("Turnstile API error:", response.status, response.statusText)
      return { success: false, error: "Security verification failed. Please try again." }
    }

    const result: TurnstileVerifyResponse = await response.json()

    if (!result.success) {
      // Log error codes for debugging
      console.error("Turnstile verification failed:", result["error-codes"])

      // Map common error codes to user-friendly messages
      const errorCodes = result["error-codes"] || []

      if (errorCodes.includes("timeout-or-duplicate")) {
        return { success: false, error: "Security challenge expired. Please try again." }
      }

      if (errorCodes.includes("invalid-input-response")) {
        return { success: false, error: "Invalid security response. Please refresh and try again." }
      }

      return { success: false, error: "Security verification failed. Please try again." }
    }

    return { success: true }
  } catch (error) {
    console.error("Turnstile verification error:", error)
    return { success: false, error: "Security verification failed. Please try again." }
  }
}

/**
 * Gets the client IP from Next.js request headers
 * Works with Vercel, Cloudflare, and standard proxies
 */
export function getClientIp(headers: Headers): string | null {
  // Try Cloudflare header first
  const cfIp = headers.get("CF-Connecting-IP")
  if (cfIp) return cfIp

  // Try X-Forwarded-For (standard proxy header)
  const forwardedFor = headers.get("X-Forwarded-For")
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    return forwardedFor.split(",")[0].trim()
  }

  // Try X-Real-IP (nginx)
  const realIp = headers.get("X-Real-IP")
  if (realIp) return realIp

  return null
}
