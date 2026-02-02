import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { isAdmin } from "@/lib/auth-server"

// PATCH toggle user's show_ads setting (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await isAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { id: userId } = await params
    const { showAds } = await request.json()

    if (typeof showAds !== "boolean") {
      return NextResponse.json(
        { error: "showAds must be a boolean" },
        { status: 400 }
      )
    }

    // Verify user exists and update
    const user = await prisma.user.update({
      where: { id: userId },
      data: { showAds },
      select: { id: true, email: true, showAds: true },
    })

    return NextResponse.json({
      id: user.id,
      email: user.email,
      show_ads: user.showAds,
    })
  } catch (error) {
    console.error("Error updating user ad settings:", error)
    return NextResponse.json(
      { error: "Failed to update user ad settings" },
      { status: 500 }
    )
  }
}

// GET user's current ad status (admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await isAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { id: userId } = await params

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, showAds: true },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      show_ads: user.showAds,
    })
  } catch (error) {
    console.error("Error fetching user ad settings:", error)
    return NextResponse.json(
      { error: "Failed to fetch user ad settings" },
      { status: 500 }
    )
  }
}
