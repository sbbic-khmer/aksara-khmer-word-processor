import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

// PUT update a user replacement
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  try {
    const { incorrect_word, correct_word, notes } = await request.json()

    const result = await sql`
      UPDATE user_replacements
      SET incorrect_word = COALESCE(${incorrect_word}, incorrect_word),
          correct_word = COALESCE(${correct_word}, correct_word),
          notes = ${notes}
      WHERE id = ${id} AND user_id = ${user.id}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Replacement not found" }, { status: 404 })
    }

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error updating user replacement:", error)
    return NextResponse.json({ error: "Failed to update replacement" }, { status: 500 })
  }
}

// DELETE a user replacement
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  try {
    const result = await sql`
      DELETE FROM user_replacements
      WHERE id = ${id} AND user_id = ${user.id}
      RETURNING id
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Replacement not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting user replacement:", error)
    return NextResponse.json({ error: "Failed to delete replacement" }, { status: 500 })
  }
}
