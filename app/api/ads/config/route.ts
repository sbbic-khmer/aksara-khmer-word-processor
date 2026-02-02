import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth-server"

// GET ad configuration for current user
export async function GET() {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Get user's showAds status (default to true if not set)
    const showAds = (user as { showAds?: boolean }).showAds ?? true

    // Get frequency schedule from app_setting
    const setting = await prisma.appSetting.findUnique({
      where: { key: "ad_frequency_schedule" },
    })

    // Default schedule if not set
    const frequencySchedule = setting?.value ?? [2, 5, 10, 15]

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
