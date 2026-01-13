import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { isAdmin } from "@/lib/auth"

// GET all user replacements (admin only, for review)
export async function GET() {
  const admin = await isAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const result = await sql`
      SELECT ur.*, u.email as user_email, u.name as user_name
      FROM user_replacements ur
      JOIN users u ON ur.user_id::text = u.id::text
      ORDER BY ur.created_at DESC
    `
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching user replacements:", error)
    return NextResponse.json({ error: "Failed to fetch user replacements" }, { status: 500 })
  }
}
