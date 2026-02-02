import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"

export async function GET() {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({
      authenticated: false,
      isDev: process.env.NODE_ENV === "development",
    })
  }

  return NextResponse.json({
    authenticated: true,
    isDev: process.env.NODE_ENV === "development",
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      profile_picture_url: user.profile_picture_url,
    },
  })
}
