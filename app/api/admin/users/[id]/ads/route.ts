import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { isAdmin } from "@/lib/auth"

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

    // Verify user exists
    const userCheck = await sql`
      SELECT id FROM users WHERE id = ${userId}
    `

    if (userCheck.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Update user's show_ads setting
    const result = await sql`
      UPDATE users
      SET show_ads = ${showAds}, updated_at = NOW()
      WHERE id = ${userId}
      RETURNING id, email, show_ads
    `

    return NextResponse.json(result[0])
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

    const result = await sql`
      SELECT id, email, show_ads FROM users WHERE id = ${userId}
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error fetching user ad settings:", error)
    return NextResponse.json(
      { error: "Failed to fetch user ad settings" },
      { status: 500 }
    )
  }
}
