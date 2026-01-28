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
    // Order: master first, then user - so user's values override master's
    const replacementMap: Record<string, { correct_word: string; source: string }> = {}

    // Debug: Check for ជីវឹត rule with codepoints
    const jeevitRules = masterReplacements.filter((r: { incorrect_word: string }) => r.incorrect_word.includes('ជីវ'))
    console.log("[v0] API: Found ជីវ rules in master:", jeevitRules.map((r: { incorrect_word: string, correct_word: string }) => {
      const incorrectCodepoints = [...r.incorrect_word].map(c => c.codePointAt(0)?.toString(16)).join(' ')
      const correctCodepoints = [...r.correct_word].map(c => c.codePointAt(0)?.toString(16)).join(' ')
      return `${r.incorrect_word} (${incorrectCodepoints}) -> ${r.correct_word} (${correctCodepoints})`
    }))
    console.log("[v0] API: Total master replacements:", masterReplacements.length)
    
    // Expected codepoints for ជីវឹត (incorrect): 1787 17b8 179c 17b9 178f
    // Expected codepoints for ជីវិត (correct): 1787 17b8 179c 17b7 178f
    // The difference is 17b9 (KHMER VOWEL SIGN OE) vs 17b7 (KHMER VOWEL SIGN I)

    // Add master replacements first
    for (const r of masterReplacements) {
      replacementMap[r.incorrect_word] = { correct_word: r.correct_word, source: "master" }
    }

    // Add user replacements second - they will override master if same key exists
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
