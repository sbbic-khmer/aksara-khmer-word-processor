import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { isAdmin } from "@/lib/auth-server"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const admin = await isAdmin()
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Query added words with user count using Prisma groupBy
    const addedWordsGroups = await prisma.spellCheckAddedWord.groupBy({
      by: ["word"],
      _count: { userId: true },
      _min: { createdAt: true },
      _max: { createdAt: true },
    })

    // Query ignored words with user count using Prisma groupBy
    const ignoredWordsGroups = await prisma.spellCheckIgnoredWord.groupBy({
      by: ["word"],
      _count: { userId: true },
      _min: { createdAt: true },
      _max: { createdAt: true },
    })

    // Format and sort added words
    const addedWords = addedWordsGroups
      .map((w) => ({
        word: w.word,
        user_count: w._count.userId,
        first_added: w._min.createdAt,
        last_added: w._max.createdAt,
      }))
      .sort((a, b) => {
        if (b.user_count !== a.user_count) return b.user_count - a.user_count
        return a.word.localeCompare(b.word)
      })

    // Format and sort ignored words
    const ignoredWords = ignoredWordsGroups
      .map((w) => ({
        word: w.word,
        user_count: w._count.userId,
        first_added: w._min.createdAt,
        last_added: w._max.createdAt,
      }))
      .sort((a, b) => {
        if (b.user_count !== a.user_count) return b.user_count - a.user_count
        return a.word.localeCompare(b.word)
      })

    return NextResponse.json({
      added: addedWords,
      ignored: ignoredWords,
    })
  } catch (error) {
    console.error("Error fetching spell check custom words:", error)
    return NextResponse.json(
      { error: "Failed to fetch spell check custom words" },
      { status: 500 }
    )
  }
}
