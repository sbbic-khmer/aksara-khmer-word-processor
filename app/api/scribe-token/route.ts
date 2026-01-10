import { NextResponse } from "next/server"
import { isAuthenticated } from "@/lib/auth"

export async function GET() {
  const authenticated = await isAuthenticated()
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const apiKey = process.env.ELEVENLABS_API_KEY

  if (!apiKey) {
    return NextResponse.json({ error: "ElevenLabs API key not configured" }, { status: 500 })
  }

  try {
    const response = await fetch("https://api.elevenlabs.io/v1/single-use-token/realtime_scribe", {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
      },
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error("ElevenLabs token error:", errorData)
      return NextResponse.json(
        { error: "Failed to get token from ElevenLabs", detail: errorData },
        { status: response.status },
      )
    }

    const data = await response.json()
    return NextResponse.json({ token: data.token })
  } catch (error) {
    console.error("Token fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch token" }, { status: 500 })
  }
}
