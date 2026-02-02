import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth-server"

// PUT update a user replacement
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  try {
    const { incorrect_word, correct_word, notes } = await request.json()

    const replacement = await prisma.userReplacement.updateMany({
      where: { id, userId: user.id },
      data: {
        ...(incorrect_word !== undefined && { incorrectWord: incorrect_word }),
        ...(correct_word !== undefined && { correctWord: correct_word }),
        notes: notes ?? null,
      },
    })

    if (replacement.count === 0) {
      return NextResponse.json(
        { error: "Replacement not found" },
        { status: 404 }
      )
    }

    // Fetch the updated replacement
    const updated = await prisma.userReplacement.findUnique({
      where: { id },
    })

    return NextResponse.json({
      id: updated!.id,
      user_id: updated!.userId,
      incorrect_word: updated!.incorrectWord,
      correct_word: updated!.correctWord,
      notes: updated!.notes,
      promoted_to_master: updated!.promotedToMaster,
      promoted_at: updated!.promotedAt,
      created_at: updated!.createdAt,
      updated_at: updated!.updatedAt,
    })
  } catch (error) {
    console.error("Error updating user replacement:", error)
    return NextResponse.json(
      { error: "Failed to update replacement" },
      { status: 500 }
    )
  }
}

// DELETE a user replacement
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  try {
    const result = await prisma.userReplacement.deleteMany({
      where: { id, userId: user.id },
    })

    if (result.count === 0) {
      return NextResponse.json(
        { error: "Replacement not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting user replacement:", error)
    return NextResponse.json(
      { error: "Failed to delete replacement" },
      { status: 500 }
    )
  }
}
