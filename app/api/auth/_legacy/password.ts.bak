import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { sql } from "@/lib/db"
import { validateSession, hashPassword, verifyPassword, SESSION_COOKIE_NAME } from "@/lib/auth"

export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)

    if (!sessionToken?.value) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const user = await validateSession(sessionToken.value)
    if (!user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    const { currentPassword, newPassword } = await request.json()

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Current and new passwords are required" }, { status: 400 })
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 })
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, user.password_hash)
    if (!isValid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 })
    }

    // Hash and update new password
    const newPasswordHash = await hashPassword(newPassword)
    await sql`
      UPDATE users 
      SET password_hash = ${newPasswordHash}, updated_at = NOW()
      WHERE id = ${user.id}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Password change error:", error)
    return NextResponse.json({ error: "Failed to change password" }, { status: 500 })
  }
}
