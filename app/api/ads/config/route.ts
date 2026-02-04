import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth-server"

// GET ad configuration for current user
// Returns whether ads should be shown (admin can disable per user)
export async function GET() {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Get user's showAds status (default to true if not set)
  const showAds = (user as { showAds?: boolean }).showAds ?? true

  return NextResponse.json({ showAds })
}
