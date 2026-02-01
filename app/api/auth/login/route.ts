import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { sql } from "@/lib/db"
import { verifyPassword, createSession, SESSION_COOKIE_NAME } from "@/lib/auth"
import { verifyTurnstileToken, getClientIp } from "@/lib/turnstile"
import {
  checkRateLimit,
  recordAttempt,
  clearAttempts,
  getLoginRateLimitKey,
  RATE_LIMITS,
} from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request.headers)
    const rateLimitKey = getLoginRateLimitKey(clientIp)

    // Check rate limit before processing
    const rateCheck = checkRateLimit(rateLimitKey, RATE_LIMITS.login)
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: `Too many login attempts. Please try again in ${Math.ceil(rateCheck.resetIn / 60)} minutes.`,
        },
        { status: 429 }
      )
    }

    const { email, password, turnstileToken } = await request.json()

    // Verify Turnstile token first (before any expensive operations)
    const turnstileResult = await verifyTurnstileToken(turnstileToken, clientIp)
    if (!turnstileResult.success) {
      return NextResponse.json({ error: turnstileResult.error }, { status: 400 })
    }

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    const normalizedEmail = String(email).toLowerCase().trim()

    // Find user by email
    const result = await sql`
      SELECT id, email, password_hash, name, role
      FROM users
      WHERE email = ${normalizedEmail}
    `

    // This prevents user enumeration attacks
    if (result.length === 0) {
      // Record failed attempt for rate limiting
      recordAttempt(rateLimitKey, RATE_LIMITS.login)
      // Add small delay to prevent timing attacks
      await new Promise((resolve) => setTimeout(resolve, 100))
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    const user = result[0]

    // Verify password
    const isValid = await verifyPassword(password, user.password_hash)
    if (!isValid) {
      // Record failed attempt for rate limiting
      recordAttempt(rateLimitKey, RATE_LIMITS.login)
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    // Clear rate limit on successful login
    clearAttempts(rateLimitKey)

    // Create session
    const sessionToken = await createSession(user.id)

    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Login failed" }, { status: 500 })
  }
}
