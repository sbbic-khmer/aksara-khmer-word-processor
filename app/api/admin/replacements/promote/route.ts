import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getCurrentUser, isAdmin } from "@/lib/auth"

// POST promote a user replacement to master (admin only)
export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  const admin = await isAdmin()
  if (!admin || !user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { user_replacement_id } = await request.json()

    if (!user_replacement_id) {
      return NextResponse.json({ error: "user_replacement_id is required" }, { status: 400 })
    }

    // Get the user replacement
    const userReplacement = await sql`
      SELECT * FROM user_replacements WHERE id = ${user_replacement_id}
    `

    if (userReplacement.length === 0) {
      return NextResponse.json({ error: "User replacement not found" }, { status: 404 })
    }

    const replacement = userReplacement[0]

    // Create master replacement
    const masterResult = await sql`
      INSERT INTO master_replacements (incorrect_word, correct_word, notes, created_by, promoted_from)
      VALUES (${replacement.incorrect_word}, ${replacement.correct_word}, ${replacement.notes}, ${user.id}, ${replacement.id})
      ON CONFLICT (incorrect_word) DO UPDATE SET
        correct_word = ${replacement.correct_word},
        notes = ${replacement.notes},
        promoted_from = ${replacement.id}
      RETURNING *
    `

    // Mark user replacement as promoted
    await sql`
      UPDATE user_replacements
      SET promoted_to_master = true, promoted_at = NOW()
      WHERE id = ${user_replacement_id}
    `

    return NextResponse.json({
      success: true,
      masterReplacement: masterResult[0],
    })
  } catch (error) {
    console.error("Error promoting replacement:", error)
    return NextResponse.json({ error: "Failed to promote replacement" }, { status: 500 })
  }
}
