import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { isAdmin, getCurrentUser } from "@/lib/auth-server"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const admin = await isAdmin()
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const currentUser = await getCurrentUser()
    const { word, frequency } = await request.json()

    if (!word || typeof word !== "string") {
      return NextResponse.json({ error: "Word is required" }, { status: 400 })
    }

    await prisma.promotedUserDictionaryWord.upsert({
      where: { word: word.trim() },
      update: {
        promotedAt: new Date(),
        promotedBy: currentUser?.id || null,
        frequency: frequency || 100,
      },
      create: {
        word: word.trim(),
        promotedBy: currentUser?.id || null,
        frequency: frequency || 100,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error promoting user dictionary word:", error)
    return NextResponse.json(
      { error: "Failed to promote user dictionary word" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await isAdmin()
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const word = searchParams.get("word")

    if (!word) {
      return NextResponse.json({ error: "Word is required" }, { status: 400 })
    }

    await prisma.promotedUserDictionaryWord.delete({
      where: { word },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error unpromoting user dictionary word:", error)
    return NextResponse.json(
      { error: "Failed to unpromote user dictionary word" },
      { status: 500 }
    )
  }
}
