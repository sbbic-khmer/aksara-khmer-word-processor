import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getCurrentUser, isAdmin } from "@/lib/auth"

// GET all master replacements (admin only)
export async function GET() {
  const admin = await isAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const result = await sql`
      SELECT mr.*, u.email as created_by_email
      FROM master_replacements mr
      LEFT JOIN users u ON mr.created_by::uuid = u.id
      ORDER BY mr.created_at DESC
    `
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching master replacements:", error)
    return NextResponse.json({ error: "Failed to fetch replacements" }, { status: 500 })
  }
}

// POST create a new master replacement (admin only)
export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  const admin = await isAdmin()
  if (!admin || !user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { incorrect_word, correct_word, notes } = await request.json()

    if (!incorrect_word || !correct_word) {
      return NextResponse.json({ error: "Both incorrect_word and correct_word are required" }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO master_replacements (incorrect_word, correct_word, notes, created_by)
      VALUES (${incorrect_word}, ${correct_word}, ${notes || null}, ${user.id})
      ON CONFLICT (incorrect_word) DO UPDATE SET
        correct_word = ${correct_word},
        notes = ${notes || null}
      RETURNING *
    `

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error creating master replacement:", error)
    return NextResponse.json({ error: "Failed to create replacement" }, { status: 500 })
  }
}
