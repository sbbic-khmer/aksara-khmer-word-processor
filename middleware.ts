import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import createIntlMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

// Create the next-intl middleware
const intlMiddleware = createIntlMiddleware(routing)

// Security headers configuration
function addSecurityHeaders(response: NextResponse) {
  // Content Security Policy
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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip i18n middleware for API routes, admin, blog, and privacy (English only)
  if (pathname.startsWith('/api') || pathname.startsWith('/admin') || pathname.startsWith('/blog') || pathname.startsWith('/privacy')) {
    const response = NextResponse.next()
    return addSecurityHeaders(response)
  }

  // Run next-intl middleware for locale handling
  const response = intlMiddleware(request)

  // Add security headers to the response
  return addSecurityHeaders(response)
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
     * - workers (web workers)
     * - dictionaries (dictionary files)
     * - lib (library files)
     */
    "/((?!_next/static|_next/image|favicon.ico|workers|dictionaries|lib|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.webp$|.*\\.gif$|.*\\.svg$|.*\\.ico$|.*\\.txt$|.*\\.js$).*)",
  ],
}
