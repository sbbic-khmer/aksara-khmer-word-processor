import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { sql } from "@/lib/db"
import { hashPassword, createSession, SESSION_COOKIE_NAME } from "@/lib/auth"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SIGNUPS_ENABLED = process.env.SIGNUPS_ENABLED === "true"

export async function POST(request: NextRequest) {
  if (!SIGNUPS_ENABLED) {
    return NextResponse.json({ error: "Signups are temporarily closed" }, { status: 403 })
  }

  try {
    const { email, password, name } = await request.json()

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 })
    }

    if (!password || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
    }

    const sanitizedName = name ? String(name).slice(0, 100).trim() : null

    // Check if user already exists
    const existing = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase()}`
    if (existing.length > 0) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 })
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Create user (store email in lowercase for consistency)
    const result = await sql`
      INSERT INTO users (email, password_hash, name)
      VALUES (${email.toLowerCase()}, ${passwordHash}, ${sanitizedName})
      RETURNING id, email, name, role
    `

    const user = result[0]

    // Create default preferences
    await sql`
      INSERT INTO user_preferences (user_id)
      VALUES (${user.id})
    `

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
    console.error("Registration error:", error)
    return NextResponse.json({ error: "Registration failed" }, { status: 500 })
  }
}
