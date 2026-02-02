import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { isAdmin, getCurrentUser } from "@/lib/auth-server"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const admin = await isAdmin()
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get all user ignored words with aggregated counts
    const ignoredWords = await prisma.userIgnoredDictionaryWord.groupBy({
      by: ["word"],
      _count: { userId: true },
      _min: { createdAt: true },
      _max: { createdAt: true },
    })

    // Get promoted words
    const promotedWords = await prisma.promotedIgnoredWord.findMany({
      include: {
        promoter: {
          select: { name: true },
        },
      },
    })

    // Create a map of promoted words for quick lookup
    const promotedMap = new Map(promotedWords.map((p) => [p.word, p]))

    // Format response
    const words = ignoredWords.map((iw) => {
      const promoted = promotedMap.get(iw.word)
      return {
        word: iw.word,
        user_count: iw._count.userId,
        first_ignored: iw._min.createdAt,
        last_ignored: iw._max.createdAt,
        promoted_at: promoted?.promotedAt ?? null,
        promoted_notes: promoted?.notes ?? null,
        promoted_by_name: promoted?.promoter?.name ?? null,
      }
    })

    // Sort by user_count desc, then word asc
    words.sort((a, b) => {
      if (b.user_count !== a.user_count) return b.user_count - a.user_count
      return a.word.localeCompare(b.word)
    })

    const promotedCount = promotedWords.length

    return NextResponse.json({
      words,
      promotedCount,
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
    await prisma.promotedIgnoredWord.upsert({
      where: { word: word.trim() },
      update: {
        promotedAt: new Date(),
        promotedBy: currentUser?.id || null,
        notes: notes || undefined,
      },
      create: {
        word: word.trim(),
        promotedBy: currentUser?.id || null,
        notes: notes || null,
      },
    })

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

    await prisma.promotedIgnoredWord.delete({
      where: { word },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error unpromoting ignored word:", error)
    return NextResponse.json(
      { error: "Failed to unpromote ignored word" },
      { status: 500 }
    )
  }
}
