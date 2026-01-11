import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

// GET user preferences
export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // First try to insert default preferences (will do nothing if exists)
    await sql`
      INSERT INTO user_preferences (user_id)
      VALUES (${user.id})
      ON CONFLICT (user_id) DO NOTHING
    `

    // Then always SELECT to get the current preferences
    const result = await sql`
      SELECT * FROM user_preferences WHERE user_id = ${user.id}
    `

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error fetching preferences:", error)
    return NextResponse.json({ error: "Failed to fetch preferences" }, { status: 500 })
  }
}

// PUT update user preferences
export async function PUT(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { vad_silence_threshold, vad_threshold, preferred_mic_device_id, show_breaks, theme } = body

    const result = await sql`
      INSERT INTO user_preferences (user_id, vad_silence_threshold, vad_threshold, preferred_mic_device_id, show_breaks, theme)
      VALUES (${user.id}, ${vad_silence_threshold ?? 1.0}, ${vad_threshold ?? 0.4}, ${preferred_mic_device_id ?? null}, ${show_breaks ?? true}, ${theme ?? "light"})
      ON CONFLICT (user_id) DO UPDATE SET
        vad_silence_threshold = COALESCE(${vad_silence_threshold}, user_preferences.vad_silence_threshold),
        vad_threshold = COALESCE(${vad_threshold}, user_preferences.vad_threshold),
        preferred_mic_device_id = COALESCE(${preferred_mic_device_id}, user_preferences.preferred_mic_device_id),
        show_breaks = COALESCE(${show_breaks}, user_preferences.show_breaks),
        theme = COALESCE(${theme}, user_preferences.theme)
      RETURNING *
    `

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error updating preferences:", error)
    return NextResponse.json({ error: "Failed to update preferences" }, { status: 500 })
  }
}
