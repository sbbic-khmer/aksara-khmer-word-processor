import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

// GET ad configuration for current user
export async function GET() {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Get user's show_ads status (default to true if column doesn't exist yet)
    const showAds = user.show_ads ?? true

    // Get frequency schedule from app_settings
    const settingsResult = await sql`
      SELECT value FROM app_settings WHERE key = 'ad_frequency_schedule'
    `

    // Default schedule if not set
    const frequencySchedule =
      settingsResult.length > 0 ? settingsResult[0].value : [2, 5, 10, 15]

    return NextResponse.json({
      showAds,
      frequencySchedule,
    })
  } catch (error) {
    console.error("Error fetching ad config:", error)
    return NextResponse.json(
      { error: "Failed to fetch ad configuration" },
      { status: 500 }
    )
  }
}
