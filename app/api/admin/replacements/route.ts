import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, isAdmin } from "@/lib/auth-server"

// GET all master replacements (admin only)
export async function GET() {
  const admin = await isAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const replacements = await prisma.masterReplacement.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: {
          select: { email: true },
        },
      },
    })

    // Format for API response (snake_case)
    return NextResponse.json(
      replacements.map((r) => ({
        id: r.id,
        incorrect_word: r.incorrectWord,
        correct_word: r.correctWord,
        notes: r.notes,
        created_by: r.createdById,
        created_by_email: r.createdBy?.email ?? null,
        promoted_from: r.promotedFrom,
        created_at: r.createdAt,
        updated_at: r.updatedAt,
      }))
    )
  } catch (error) {
    console.error("Error fetching master replacements:", error)
    return NextResponse.json(
      { error: "Failed to fetch replacements" },
      { status: 500 }
    )
  }
}

// POST create a new master replacement (admin only)
export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  const admin = await isAdmin()
  if (!admin || !user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { incorrect_word, correct_word, notes } = await request.json()

    if (!incorrect_word || !correct_word) {
      return NextResponse.json(
        { error: "Both incorrect_word and correct_word are required" },
        { status: 400 }
      )
    }

    const replacement = await prisma.masterReplacement.upsert({
      where: { incorrectWord: incorrect_word },
      update: {
        correctWord: correct_word,
        notes: notes || null,
      },
      create: {
        incorrectWord: incorrect_word,
        correctWord: correct_word,
        notes: notes || null,
        createdById: user.id,
      },
    })

    return NextResponse.json({
      id: replacement.id,
      incorrect_word: replacement.incorrectWord,
      correct_word: replacement.correctWord,
      notes: replacement.notes,
      created_by: replacement.createdById,
      promoted_from: replacement.promotedFrom,
      created_at: replacement.createdAt,
      updated_at: replacement.updatedAt,
    })
  } catch (error) {
    console.error("Error creating master replacement:", error)
    return NextResponse.json(
      { error: "Failed to create replacement" },
      { status: 500 }
    )
  }
}
