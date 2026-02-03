import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth-server"

/**
 * GET /api/user/data-summary
 *
 * Returns a summary of the user's stored data for the "Your Data" section.
 */
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch all counts in parallel
    const [
      documentCount,
      dictionaryWordCount,
      ignoredDictionaryWordCount,
      spellCheckAddedCount,
      spellCheckIgnoredCount,
      replacementCount,
    ] = await Promise.all([
      prisma.document.count({ where: { userId: user.id } }),
      prisma.userDictionaryWord.count({ where: { userId: user.id } }),
      prisma.userIgnoredDictionaryWord.count({ where: { userId: user.id } }),
      prisma.spellCheckAddedWord.count({ where: { userId: user.id } }),
      prisma.spellCheckIgnoredWord.count({ where: { userId: user.id } }),
      prisma.userReplacement.count({ where: { userId: user.id } }),
    ])

    return NextResponse.json({
      documentCount,
      dictionaryWordCount,
      ignoredDictionaryWordCount,
      spellCheckAddedCount,
      spellCheckIgnoredCount,
      replacementCount,
      // Totals for easier display
      totalDictionaryWords: dictionaryWordCount + ignoredDictionaryWordCount,
      totalSpellCheckWords: spellCheckAddedCount + spellCheckIgnoredCount,
    })
  } catch (error) {
    console.error("Error fetching data summary:", error)
    return NextResponse.json(
      { error: "Failed to fetch data summary" },
      { status: 500 }
    )
  }
}
