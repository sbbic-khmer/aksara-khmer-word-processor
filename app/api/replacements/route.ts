import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

// GET all replacements (master + user's custom)
export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Get master replacements
    const masterReplacements = await sql`
      SELECT id, incorrect_word, correct_word, 'master' as source
      FROM master_replacements
      ORDER BY incorrect_word
    `

    // Get user's custom replacements
    const userReplacements = await sql`
      SELECT id, incorrect_word, correct_word, 'user' as source, notes, promoted_to_master
      FROM user_replacements
      WHERE user_id = ${user.id}
      ORDER BY incorrect_word
    `

    // Combine into a lookup map (user replacements override master)
    const replacementMap: Record<string, { correct_word: string; source: string }> = {}

    for (const r of masterReplacements) {
      replacementMap[r.incorrect_word] = { correct_word: r.correct_word, source: "master" }
    }

    for (const r of userReplacements) {
      replacementMap[r.incorrect_word] = { correct_word: r.correct_word, source: "user" }
    }

    return NextResponse.json({
      masterReplacements,
      userReplacements,
      combined: replacementMap,
    })
  } catch (error) {
    console.error("Error fetching replacements:", error)
    return NextResponse.json({ error: "Failed to fetch replacements" }, { status: 500 })
  }
}
