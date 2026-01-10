import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { isAdmin } from "@/lib/auth"

// PUT update a master replacement (admin only)
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await isAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  try {
    const { incorrect_word, correct_word, notes } = await request.json()

    const result = await sql`
      UPDATE master_replacements
      SET incorrect_word = COALESCE(${incorrect_word}, incorrect_word),
          correct_word = COALESCE(${correct_word}, correct_word),
          notes = ${notes}
      WHERE id = ${id}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Replacement not found" }, { status: 404 })
    }

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error updating master replacement:", error)
    return NextResponse.json({ error: "Failed to update replacement" }, { status: 500 })
  }
}

// DELETE a master replacement (admin only)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await isAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  try {
    const result = await sql`
      DELETE FROM master_replacements
      WHERE id = ${id}
      RETURNING id
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Replacement not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting master replacement:", error)
    return NextResponse.json({ error: "Failed to delete replacement" }, { status: 500 })
  }
}
