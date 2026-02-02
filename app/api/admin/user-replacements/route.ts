import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { isAdmin } from "@/lib/auth-server"

// GET all user replacements (admin only, for review)
export async function GET() {
  const admin = await isAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const replacements = await prisma.userReplacement.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { email: true, name: true },
        },
      },
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
        user_email: r.user.email,
        user_name: r.user.name,
      }))
    )
  } catch (error) {
    console.error("Error fetching user replacements:", error)
    return NextResponse.json(
      { error: "Failed to fetch user replacements" },
      { status: 500 }
    )
  }
}
