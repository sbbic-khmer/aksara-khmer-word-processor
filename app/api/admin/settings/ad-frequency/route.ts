import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { isAdmin } from "@/lib/auth-server"

// GET current ad frequency schedule (admin only)
export async function GET() {
  const admin = await isAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const setting = await prisma.appSetting.findUnique({
      where: { key: "ad_frequency_schedule" },
    })

    // Default schedule if not set
    const schedule = setting?.value ?? [2, 5, 10, 15]

    return NextResponse.json({ schedule })
  } catch (error) {
    console.error("Error fetching ad frequency schedule:", error)
    return NextResponse.json(
      { error: "Failed to fetch ad frequency schedule" },
      { status: 500 }
    )
  }
}

// PUT update ad frequency schedule (admin only)
export async function PUT(request: NextRequest) {
  const admin = await isAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { schedule } = await request.json()

    // Validate schedule
    if (!Array.isArray(schedule)) {
      return NextResponse.json(
        { error: "schedule must be an array" },
        { status: 400 }
      )
    }

    if (schedule.length === 0) {
      return NextResponse.json(
        { error: "schedule must have at least one interval" },
        { status: 400 }
      )
    }

    // Validate all values are positive numbers >= 1
    for (const interval of schedule) {
      if (typeof interval !== "number" || interval < 1) {
        return NextResponse.json(
          { error: "All intervals must be numbers >= 1 minute" },
          { status: 400 }
        )
      }
    }

    // Upsert the schedule
    const result = await prisma.appSetting.upsert({
      where: { key: "ad_frequency_schedule" },
      update: { value: schedule },
      create: { key: "ad_frequency_schedule", value: schedule },
    })

    return NextResponse.json({ schedule: result.value })
  } catch (error) {
    console.error("Error updating ad frequency schedule:", error)
    return NextResponse.json(
      { error: "Failed to update ad frequency schedule" },
      { status: 500 }
    )
  }
}
