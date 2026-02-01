import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { isAdmin } from "@/lib/auth"

// GET all users with their ad status (admin only)
export async function GET() {
  const admin = await isAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const result = await sql`
      SELECT
        id,
        email,
        name,
        role,
        show_ads,
        created_at
      FROM users
      ORDER BY created_at DESC
    `
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}
