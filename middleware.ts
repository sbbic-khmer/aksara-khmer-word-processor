import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Content Security Policy
  // Configured to allow necessary third-party services
  const csp = [
    "default-src 'self'",
    // Scripts: self + inline (for Next.js hydration) + eval (for some libs) + third parties
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://pagead2.googlesyndication.com https://challenges.cloudflare.com https://www.googletagservices.com https://adservice.google.com",
    // Styles: self + inline (for styled components, Tailwind)
    "style-src 'self' 'unsafe-inline'",
    // Images: self + https (for user avatars, ads) + data (for inline images)
    "img-src 'self' https: data:",
    // Fonts: self
    "font-src 'self'",
    // Connect: self + required APIs
    "connect-src 'self' https://api.elevenlabs.io https://challenges.cloudflare.com https://pagead2.googlesyndication.com wss://*.elevenlabs.io",
    // Frames: required for Turnstile and ads
    "frame-src https://challenges.cloudflare.com https://googleads.g.doubleclick.net https://www.google.com https://tpc.googlesyndication.com",
    // Prevent this site from being embedded in iframes
    "frame-ancestors 'none'",
    // Media: self + ElevenLabs for voice
    "media-src 'self' https://*.elevenlabs.io blob:",
    // Worker: self for web workers
    "worker-src 'self' blob:",
  ].join("; ")

  // Set security headers
  response.headers.set("Content-Security-Policy", csp)
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set("X-XSS-Protection", "1; mode=block")

  // HSTS - only in production
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    )
  }

  return response
}

// Apply middleware to all routes except static files
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.ico$).*)",
  ],
}
