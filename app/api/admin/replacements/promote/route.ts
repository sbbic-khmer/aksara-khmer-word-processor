import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, isAdmin } from "@/lib/auth-server"

// POST promote a user replacement to master (admin only)
export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  const admin = await isAdmin()
  if (!admin || !user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { user_replacement_id } = await request.json()

    if (!user_replacement_id) {
      return NextResponse.json(
        { error: "user_replacement_id is required" },
        { status: 400 }
      )
    }

    // Get the user replacement
    const userReplacement = await prisma.userReplacement.findUnique({
      where: { id: user_replacement_id },
    })

    if (!userReplacement) {
      return NextResponse.json(
        { error: "User replacement not found" },
        { status: 404 }
      )
    }

    // Create master replacement
    const masterReplacement = await prisma.masterReplacement.upsert({
      where: { incorrectWord: userReplacement.incorrectWord },
      update: {
        correctWord: userReplacement.correctWord,
        notes: userReplacement.notes,
        promotedFrom: userReplacement.id,
      },
      create: {
        incorrectWord: userReplacement.incorrectWord,
        correctWord: userReplacement.correctWord,
        notes: userReplacement.notes,
        createdById: user.id,
        promotedFrom: userReplacement.id,
      },
    })

    // Mark user replacement as promoted
    await prisma.userReplacement.update({
      where: { id: user_replacement_id },
      data: {
        promotedToMaster: true,
        promotedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      masterReplacement: {
        id: masterReplacement.id,
        incorrect_word: masterReplacement.incorrectWord,
        correct_word: masterReplacement.correctWord,
        notes: masterReplacement.notes,
        created_by: masterReplacement.createdById,
        promoted_from: masterReplacement.promotedFrom,
        created_at: masterReplacement.createdAt,
        updated_at: masterReplacement.updatedAt,
      },
    })
  } catch (error) {
    console.error("Error promoting replacement:", error)
    return NextResponse.json(
      { error: "Failed to promote replacement" },
      { status: 500 }
    )
  }
}
