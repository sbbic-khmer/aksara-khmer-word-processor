import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { isAdmin, getCurrentUser } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const admin = await isAdmin()
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Query ignored dictionary words with user count, joined with promoted status
    const ignoredWords = await sql`
      SELECT
        uidw.word,
        COUNT(DISTINCT uidw.user_id)::int as user_count,
        MIN(uidw.created_at) as first_ignored,
        MAX(uidw.created_at) as last_ignored,
        piw.promoted_at,
        piw.notes as promoted_notes,
        pu.name as promoted_by_name
      FROM user_ignored_dictionary_words uidw
      LEFT JOIN promoted_ignored_words piw ON uidw.word = piw.word
      LEFT JOIN users pu ON piw.promoted_by = pu.id
      GROUP BY uidw.word, piw.promoted_at, piw.notes, pu.name
      ORDER BY COUNT(DISTINCT uidw.user_id) DESC, uidw.word ASC
    `

    // Get count of promoted words
    const promotedCount = await sql`
      SELECT COUNT(*)::int as count FROM promoted_ignored_words
    `

    return NextResponse.json({
      words: ignoredWords,
      promotedCount: promotedCount[0]?.count || 0,
    })
  } catch (error) {
    console.error("Error fetching ignored dictionary words:", error)
    return NextResponse.json(
      { error: "Failed to fetch ignored dictionary words" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const admin = await isAdmin()
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const currentUser = await getCurrentUser()
    const { word, notes } = await request.json()

    if (!word || typeof word !== "string") {
      return NextResponse.json({ error: "Word is required" }, { status: 400 })
    }

    // Mark word as promoted (insert or update)
    await sql`
      INSERT INTO promoted_ignored_words (word, promoted_by, notes)
      VALUES (${word.trim()}, ${currentUser?.id || null}, ${notes || null})
      ON CONFLICT (word) DO UPDATE SET
        promoted_at = NOW(),
        promoted_by = ${currentUser?.id || null},
        notes = COALESCE(${notes || null}, promoted_ignored_words.notes)
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error promoting ignored word:", error)
    return NextResponse.json(
      { error: "Failed to promote ignored word" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await isAdmin()
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const word = searchParams.get("word")

    if (!word) {
      return NextResponse.json({ error: "Word is required" }, { status: 400 })
    }

    await sql`
      DELETE FROM promoted_ignored_words WHERE word = ${word}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error unpromoting ignored word:", error)
    return NextResponse.json(
      { error: "Failed to unpromote ignored word" },
      { status: 500 }
    )
  }
}
