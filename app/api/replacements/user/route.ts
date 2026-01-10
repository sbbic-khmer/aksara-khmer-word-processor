import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

// GET user's custom replacements
export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await sql`
      SELECT * FROM user_replacements
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC
    `
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching user replacements:", error)
    return NextResponse.json({ error: "Failed to fetch replacements" }, { status: 500 })
  }
}

// POST create a new user replacement
export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { incorrect_word, correct_word, notes } = await request.json()

    if (!incorrect_word || !correct_word) {
      return NextResponse.json({ error: "Both incorrect_word and correct_word are required" }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO user_replacements (user_id, incorrect_word, correct_word, notes)
      VALUES (${user.id}, ${incorrect_word}, ${correct_word}, ${notes || null})
      ON CONFLICT (user_id, incorrect_word) DO UPDATE SET
        correct_word = ${correct_word},
        notes = ${notes || null}
      RETURNING *
    `

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error creating user replacement:", error)
    return NextResponse.json({ error: "Failed to create replacement" }, { status: 500 })
  }
}
