import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getUserStorageInfo, formatBytes } from "@/lib/storage"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const storageInfo = await getUserStorageInfo(user.id)

    return NextResponse.json({
      used: storageInfo.used,
      limit: storageInfo.limit,
      usedFormatted: formatBytes(storageInfo.used),
      limitFormatted: formatBytes(storageInfo.limit),
      percentage: storageInfo.percentage,
    })
  } catch (error) {
    console.error("Error fetching storage info:", error)
    return NextResponse.json(
      { error: "Failed to fetch storage info" },
      { status: 500 }
    )
  }
}
