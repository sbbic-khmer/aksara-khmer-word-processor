import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth-server"

// GET all replacements (master + user's custom)
export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Get master replacements
    const masterReplacements = await prisma.masterReplacement.findMany({
      orderBy: { incorrectWord: "asc" },
      select: {
        id: true,
        incorrectWord: true,
        correctWord: true,
      },
    })

    // Get user's custom replacements
    const userReplacements = await prisma.userReplacement.findMany({
      where: { userId: user.id },
      orderBy: { incorrectWord: "asc" },
      select: {
        id: true,
        incorrectWord: true,
        correctWord: true,
        notes: true,
        promotedToMaster: true,
      },
    })

    // Format for API response (snake_case)
    const formattedMaster = masterReplacements.map((r) => ({
      id: r.id,
      incorrect_word: r.incorrectWord,
      correct_word: r.correctWord,
      source: "master" as const,
    }))

    const formattedUser = userReplacements.map((r) => ({
      id: r.id,
      incorrect_word: r.incorrectWord,
      correct_word: r.correctWord,
      source: "user" as const,
      notes: r.notes,
      promoted_to_master: r.promotedToMaster,
    }))

    // Combine into a lookup map (user replacements override master)
    const replacementMap: Record<
      string,
      { correct_word: string; source: string }
    > = {}

    // Add master replacements first
    for (const r of formattedMaster) {
      replacementMap[r.incorrect_word] = {
        correct_word: r.correct_word,
        source: "master",
      }
    }

    // Add user replacements second - they will override master if same key exists
    for (const r of formattedUser) {
      replacementMap[r.incorrect_word] = {
        correct_word: r.correct_word,
        source: "user",
      }
    }

    return NextResponse.json({
      masterReplacements: formattedMaster,
      userReplacements: formattedUser,
      combined: replacementMap,
    })
  } catch (error) {
    console.error("Error fetching replacements:", error)
    return NextResponse.json(
      { error: "Failed to fetch replacements" },
      { status: 500 }
    )
  }
}
