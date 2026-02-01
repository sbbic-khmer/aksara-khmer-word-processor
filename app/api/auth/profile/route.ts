import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { sql } from "@/lib/db"
import { isValidImageUrl } from "@/lib/validation"

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name, profile_picture_url } = await request.json()

    // Validate profile picture URL if provided
    if (profile_picture_url && !isValidImageUrl(profile_picture_url)) {
      return NextResponse.json(
        { error: "Invalid profile picture URL. Must be a valid HTTPS image URL." },
        { status: 400 }
      )
    }

    await sql`
      UPDATE users
      SET
        name = COALESCE(${name}, name),
        profile_picture_url = COALESCE(${profile_picture_url}, profile_picture_url),
        updated_at = NOW()
      WHERE id = ${user.id}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Profile update error:", error)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}
