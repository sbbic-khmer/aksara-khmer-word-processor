import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { isAdmin } from "@/lib/auth-server"

// PUT update a master replacement (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await isAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  try {
    const { incorrect_word, correct_word, notes } = await request.json()

    const replacement = await prisma.masterReplacement.update({
      where: { id },
      data: {
        ...(incorrect_word !== undefined && { incorrectWord: incorrect_word }),
        ...(correct_word !== undefined && { correctWord: correct_word }),
        notes: notes ?? null,
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
    console.error("Error updating master replacement:", error)
    // Check if it's a "not found" error
    if (
      error instanceof Error &&
      error.message.includes("Record to update not found")
    ) {
      return NextResponse.json(
        { error: "Replacement not found" },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: "Failed to update replacement" },
      { status: 500 }
    )
  }
}

// DELETE a master replacement (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await isAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  try {
    await prisma.masterReplacement.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting master replacement:", error)
    // Check if it's a "not found" error
    if (
      error instanceof Error &&
      error.message.includes("Record to delete does not exist")
    ) {
      return NextResponse.json(
        { error: "Replacement not found" },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: "Failed to delete replacement" },
      { status: 500 }
    )
  }
}
