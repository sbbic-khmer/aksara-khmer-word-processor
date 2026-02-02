import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { SESSION_COOKIE_NAME, deleteSession } from "@/lib/auth"

export async function POST() {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)

  if (sessionToken?.value) {
    try {
      await deleteSession(sessionToken.value)
    } catch (error) {
      console.error("Error deleting session:", error)
    }
  }

  cookieStore.delete(SESSION_COOKIE_NAME)

  return NextResponse.json({ success: true })
}
