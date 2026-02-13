import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth-server"

const ALLOWED_DOMAINS = [
  "exoclick.com",
  "exosrv.com",
  "magsrv.com",
  "pemsrv.com",
  "realsrv.com",
]

function isDomainAllowed(url: string): boolean {
  try {
    const hostname = new URL(url).hostname
    return ALLOWED_DOMAINS.some(
      (d) => hostname === d || hostname.endsWith(`.${d}`),
    )
  } catch {
    return false
  }
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    console.log("[ads/image] Unauthorized request")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = request.nextUrl.searchParams.get("url")
  if (!url) {
    console.log("[ads/image] Missing url parameter")
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 })
  }

  if (!isDomainAllowed(url)) {
    console.log("[ads/image] Domain not allowed: %s", url)
    return NextResponse.json({ error: "Domain not allowed" }, { status: 403 })
  }

  console.log("[ads/image] Proxying url=%s user=%s", url, user.id)

  try {
    const response = await fetch(url)
    if (!response.ok) {
      console.log("[ads/image] Upstream error status=%d url=%s", response.status, url)
      return NextResponse.json(
        { error: "Upstream error", status: response.status },
        { status: 502 },
      )
    }

    const contentType = response.headers.get("content-type") ?? "image/jpeg"
    const buffer = await response.arrayBuffer()

    console.log("[ads/image] Success type=%s size=%d", contentType, buffer.byteLength)

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch (err) {
    console.error("[ads/image] Fetch failed:", err)
    return NextResponse.json({ error: "Failed to fetch image" }, { status: 502 })
  }
}
