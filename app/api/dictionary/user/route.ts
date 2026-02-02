import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth-server"
import { prisma } from "@/lib/prisma"

// GET - Fetch user's custom dictionary words
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const words = await prisma.userDictionaryWord.findMany({
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
    console.error("Error fetching user dictionary:", error)
    return NextResponse.json(
      { error: "Failed to fetch dictionary" },
      { status: 500 }
    )
  }
}

// POST - Add a word to user's dictionary
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
    const existing = await prisma.userDictionaryWord.findUnique({
      where: {
        userId_word: {
          userId: user.id,
          word: trimmedWord,
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { message: "Word already in dictionary" },
        { status: 200 }
      )
    }

    const result = await prisma.userDictionaryWord.create({
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
    console.error("Error adding word to dictionary:", error)
    return NextResponse.json({ error: "Failed to add word" }, { status: 500 })
  }
}

// DELETE - Remove a word from user's dictionary (by id or word)
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
      await prisma.userDictionaryWord.deleteMany({
        where: { id: wordId, userId: user.id },
      })
    } else if (word) {
      // Delete by word text
      await prisma.userDictionaryWord.deleteMany({
        where: { word, userId: user.id },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting word from dictionary:", error)
    return NextResponse.json(
      { error: "Failed to delete word" },
      { status: 500 }
    )
  }
}
