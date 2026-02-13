import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth-server"

const SYNDICATION_URL = "https://syndication-adblock.exoclick.com/ads-multi.php"

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    console.log("[ads/serve] Unauthorized request")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { zones: string[] }
  try {
    body = await request.json()
  } catch {
    console.log("[ads/serve] Invalid JSON body")
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!Array.isArray(body.zones) || body.zones.length === 0) {
    console.log("[ads/serve] Invalid zones:", body.zones)
    return NextResponse.json({ error: "zones must be a non-empty array" }, { status: 400 })
  }

  console.log("[ads/serve] Request from user=%s zones=%s", user.id, body.zones.join(","))

  // Build syndication API URL
  const params = new URLSearchParams({ v: "1" })
  body.zones.forEach((zoneId, i) => {
    params.append(`zones[${i}][idzone]`, zoneId)
  })

  // Forward real user IP
  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "127.0.0.1"
  params.append("user_ip", ip)

  // Forward browser headers
  const userAgent = request.headers.get("user-agent") ?? ""
  const acceptLanguage = request.headers.get("accept-language") ?? ""
  const referer = request.headers.get("referer") ?? ""

  const upstreamUrl = `${SYNDICATION_URL}?${params.toString()}`
  console.log("[ads/serve] Fetching upstream ip=%s ua=%s", ip, userAgent.slice(0, 60))

  try {
    const response = await fetch(upstreamUrl, {
      headers: {
        "User-Agent": userAgent,
        "Accept-Language": acceptLanguage,
        Referer: referer,
      },
    })

    if (!response.ok) {
      const text = await response.text().catch(() => "")
      console.log("[ads/serve] Upstream error status=%d body=%s", response.status, text.slice(0, 200))
      return NextResponse.json(
        { error: "Upstream error", status: response.status },
        { status: 502 },
      )
    }

    const data = await response.json()
    const zoneCount = Array.isArray(data?.zones) ? data.zones.length : 0
    console.log("[ads/serve] Success zones_returned=%d", zoneCount)
    return NextResponse.json(data)
  } catch (err) {
    console.error("[ads/serve] Fetch failed:", err)
    return NextResponse.json({ error: "Failed to fetch ads" }, { status: 502 })
  }
}
