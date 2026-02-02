import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth-server"
import { prisma } from "@/lib/prisma"

// GET - Fetch user's ignored dictionary words
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const words = await prisma.userIgnoredDictionaryWord.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        word: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      words: words.map((w) => ({
        id: w.id,
        word: w.word,
        created_at: w.createdAt,
      })),
    })
  } catch (error) {
    console.error("Error fetching ignored dictionary words:", error)
    return NextResponse.json(
      { error: "Failed to fetch ignored words" },
      { status: 500 }
    )
  }
}

// POST - Add a word to user's ignored list
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { word } = await request.json()

    if (!word || typeof word !== "string" || word.trim().length === 0) {
      return NextResponse.json({ error: "Invalid word" }, { status: 400 })
    }

    const trimmedWord = word.trim()

    // Check if word already exists
    const existing = await prisma.userIgnoredDictionaryWord.findUnique({
      where: {
        userId_word: {
          userId: user.id,
          word: trimmedWord,
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { message: "Word already in ignore list" },
        { status: 200 }
      )
    }

    const result = await prisma.userIgnoredDictionaryWord.create({
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
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error adding word to ignore list:", error)
    return NextResponse.json(
      { error: "Failed to add word to ignore list" },
      { status: 500 }
    )
  }
}

// DELETE - Remove a word from user's ignored list (by id or word)
export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const wordId = searchParams.get("id")
    const word = searchParams.get("word")

    if (!wordId && !word) {
      return NextResponse.json(
        { error: "Word ID or word required" },
        { status: 400 }
      )
    }

    if (wordId) {
      // Delete by ID
      await prisma.userIgnoredDictionaryWord.deleteMany({
        where: { id: wordId, userId: user.id },
      })
    } else if (word) {
      // Delete by word text
      await prisma.userIgnoredDictionaryWord.deleteMany({
        where: { word, userId: user.id },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting word from ignore list:", error)
    return NextResponse.json(
      { error: "Failed to delete word" },
      { status: 500 }
    )
  }
}
