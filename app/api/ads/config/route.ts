import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth-server"
import { prisma } from "@/lib/prisma"

// GET ad configuration for current user
// Returns whether ads should be shown (admin can disable per user)
export async function GET() {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Fetch showAds directly from database (session may not include this field)
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { showAds: true },
  })

  // Default to true if not found (show ads by default)
  const showAds = dbUser?.showAds ?? true

  return NextResponse.json({ showAds })
}
