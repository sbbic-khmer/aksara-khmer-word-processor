import { NextResponse } from "next/server"
import { getCurrentUser, isAdmin } from "@/lib/auth-server"
import { prisma } from "@/lib/prisma"
import { KHMER_DICTIONARY } from "@/lib/khmer-dictionary-data"

// Create a Set for O(1) lookup of words in the frequency dictionary
const frequencyDictionaryWords = new Set(
  KHMER_DICTIONARY.map((entry) => entry.word)
)

// GET - Fetch all user dictionary words with aggregation (admin only)
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const admin = await isAdmin()
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get aggregated word data using Prisma groupBy
    const wordGroups = await prisma.userDictionaryWord.groupBy({
      by: ["word"],
      _count: { userId: true },
      _min: { createdAt: true },
      _max: { createdAt: true },
    })

    // Get promoted words
    const promotedWords = await prisma.promotedUserDictionaryWord.findMany({
      include: {
        promoter: {
          select: { name: true },
        },
      },
    })

    const promotedMap = new Map(promotedWords.map((p) => [p.word, p]))

    // Format and enhance with dictionary status + promotion data
    const enhancedWords = wordGroups
      .map((w) => {
        const promoted = promotedMap.get(w.word)
        return {
          word: w.word,
          user_count: w._count.userId,
          first_added: w._min.createdAt,
          last_added: w._max.createdAt,
          in_frequency_dictionary: frequencyDictionaryWords.has(w.word),
          promoted_at: promoted?.promotedAt ?? null,
          promoted_frequency: promoted?.frequency ?? null,
          promoted_by_name: promoted?.promoter?.name ?? null,
        }
      })
      // Sort by user_count DESC, then last_added DESC
      .sort((a, b) => {
        if (b.user_count !== a.user_count) return b.user_count - a.user_count
        return (
          new Date(b.last_added!).getTime() - new Date(a.last_added!).getTime()
        )
      })

    // Calculate stats
    const inDictionaryCount = enhancedWords.filter(
      (w) => w.in_frequency_dictionary
    ).length
    const notInDictionaryCount = enhancedWords.filter(
      (w) => !w.in_frequency_dictionary
    ).length
    const promotedCount = promotedWords.length

    return NextResponse.json({
      words: enhancedWords,
      stats: {
        total: enhancedWords.length,
        inDictionary: inDictionaryCount,
        notInDictionary: notInDictionaryCount,
        promotedCount,
      },
    })
  } catch (error) {
    console.error("Error fetching admin dictionary view:", error)
    return NextResponse.json(
      { error: "Failed to fetch dictionary data" },
      { status: 500 }
    )
  }
}
