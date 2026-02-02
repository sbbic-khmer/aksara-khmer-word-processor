import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth-server"

// GET user's custom replacements
export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const replacements = await prisma.userReplacement.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    })

    // Format for API response (snake_case)
    return NextResponse.json(
      replacements.map((r) => ({
        id: r.id,
        user_id: r.userId,
        incorrect_word: r.incorrectWord,
        correct_word: r.correctWord,
        notes: r.notes,
        promoted_to_master: r.promotedToMaster,
        promoted_at: r.promotedAt,
        created_at: r.createdAt,
        updated_at: r.updatedAt,
      }))
    )
  } catch (error) {
    console.error("Error fetching user replacements:", error)
    return NextResponse.json(
      { error: "Failed to fetch replacements" },
      { status: 500 }
    )
  }
}

// POST create a new user replacement
export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { incorrect_word, correct_word, notes } = await request.json()

    if (!incorrect_word || !correct_word) {
      return NextResponse.json(
        { error: "Both incorrect_word and correct_word are required" },
        { status: 400 }
      )
    }

    const replacement = await prisma.userReplacement.upsert({
      where: {
        userId_incorrectWord: {
          userId: user.id,
          incorrectWord: incorrect_word,
        },
      },
      update: {
        correctWord: correct_word,
        notes: notes || null,
      },
      create: {
        userId: user.id,
        incorrectWord: incorrect_word,
        correctWord: correct_word,
        notes: notes || null,
      },
    })

    return NextResponse.json({
      id: replacement.id,
      user_id: replacement.userId,
      incorrect_word: replacement.incorrectWord,
      correct_word: replacement.correctWord,
      notes: replacement.notes,
      promoted_to_master: replacement.promotedToMaster,
      promoted_at: replacement.promotedAt,
      created_at: replacement.createdAt,
      updated_at: replacement.updatedAt,
    })
  } catch (error) {
    console.error("Error creating user replacement:", error)
    return NextResponse.json(
      { error: "Failed to create replacement" },
      { status: 500 }
    )
  }
}
