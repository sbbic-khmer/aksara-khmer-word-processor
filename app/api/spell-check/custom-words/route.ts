import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth-server"
import { prisma } from "@/lib/prisma"

// GET - Fetch user's custom spell check words (both added and ignored)
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const [addedWords, ignoredWords] = await Promise.all([
      prisma.spellCheckAddedWord.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          word: true,
          createdAt: true,
        },
      }),
      prisma.spellCheckIgnoredWord.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          word: true,
          createdAt: true,
        },
      }),
    ])

    return NextResponse.json({
      added: addedWords.map((w) => ({
        id: w.id,
        word: w.word,
        created_at: w.createdAt,
      })),
      ignored: ignoredWords.map((w) => ({
        id: w.id,
        word: w.word,
        created_at: w.createdAt,
      })),
    })
  } catch (error) {
    console.error("Error fetching spell check custom words:", error)
    return NextResponse.json(
      { error: "Failed to fetch custom words" },
      { status: 500 }
    )
  }
}

// POST - Add a word to spell check custom dictionary (add or ignore)
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { word, action } = await request.json()

    if (!word || typeof word !== "string" || word.trim().length === 0) {
      return NextResponse.json({ error: "Invalid word" }, { status: 400 })
    }

    if (!action || !["add", "ignore"].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be "add" or "ignore"' },
        { status: 400 }
      )
    }

    const trimmedWord = word.trim()

    if (action === "add") {
      // Check if word already exists
      const existing = await prisma.spellCheckAddedWord.findUnique({
        where: {
          userId_word: {
            userId: user.id,
            word: trimmedWord,
          },
        },
      })

      if (existing) {
        return NextResponse.json(
          { message: "Word already added" },
          { status: 200 }
        )
      }

      const result = await prisma.spellCheckAddedWord.create({
        data: {
          userId: user.id,
          word: trimmedWord,
        },
      })

      return NextResponse.json(
        {
          word: {
            id: result.id,
            word: result.word,
            created_at: result.createdAt,
          },
          action,
        },
        { status: 201 }
      )
    } else {
      // action === "ignore"
      const existing = await prisma.spellCheckIgnoredWord.findUnique({
        where: {
          userId_word: {
            userId: user.id,
            word: trimmedWord,
          },
        },
      })

      if (existing) {
        return NextResponse.json(
          { message: "Word already ignored" },
          { status: 200 }
        )
      }

      const result = await prisma.spellCheckIgnoredWord.create({
        data: {
          userId: user.id,
          word: trimmedWord,
        },
      })

      return NextResponse.json(
        {
          word: {
            id: result.id,
            word: result.word,
            created_at: result.createdAt,
          },
          action,
        },
        { status: 201 }
      )
    }
  } catch (error) {
    console.error("Error adding custom word:", error)
    return NextResponse.json(
      { error: "Failed to add custom word" },
      { status: 500 }
    )
  }
}

// DELETE - Remove a word from spell check custom dictionary
export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const wordId = searchParams.get("id")
    const action = searchParams.get("action")

    if (!wordId) {
      return NextResponse.json({ error: "Word ID required" }, { status: 400 })
    }

    if (!action || !["add", "ignore"].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be "add" or "ignore"' },
        { status: 400 }
      )
    }

    if (action === "add") {
      await prisma.spellCheckAddedWord.deleteMany({
        where: { id: wordId, userId: user.id },
      })
    } else {
      await prisma.spellCheckIgnoredWord.deleteMany({
        where: { id: wordId, userId: user.id },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting custom word:", error)
    return NextResponse.json(
      { error: "Failed to delete custom word" },
      { status: 500 }
    )
  }
}
