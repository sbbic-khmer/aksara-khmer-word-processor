"use client"

import { useEffect, useRef, useState } from "react"

interface AdData {
  image: string
  url: string
  width: number
  height: number
}

interface ZoneResult {
  idzone: string
  type: string
  data: AdData
}

export function NeverBlockBannerAd({ zoneId }: { zoneId: string }) {
  const [ad, setAd] = useState<AdData | null>(null)
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    async function fetchAd() {
      try {
        console.log("[neverblock-banner] Fetching ad for zone=%s", zoneId)
        const response = await fetch("/api/ads/serve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ zones: [zoneId] }),
        })
        if (!response.ok) {
          console.log("[neverblock-banner] Serve responded %d", response.status)
          return
        }

        const data = await response.json()
        console.log("[neverblock-banner] Response:", JSON.stringify(data).slice(0, 300))
        const zone = data?.zones?.find(
          (z: ZoneResult) => String(z.idzone) === zoneId,
        )
        if (zone?.data?.image && zone?.data?.url) {
          console.log("[neverblock-banner] Ad found, rendering image=%s", zone.data.image.slice(0, 80))
          setAd(zone.data)
        } else {
          console.log("[neverblock-banner] No ad data for zone=%s", zoneId)
        }
      } catch (err) {
        console.error("[neverblock-banner] Fetch failed:", err)
      }
    }

    fetchAd()
  }, [zoneId])

  if (!ad) return null

  const proxiedImage = `/api/ads/image?url=${encodeURIComponent(ad.image)}`

  return (
    <div className="flex items-center justify-center h-full">
      <a href={ad.url} target="_blank" rel="noopener noreferrer">
        <img
          src={proxiedImage}
          width={ad.width}
          height={ad.height}
          alt=""
          style={{ maxWidth: "100%", height: "auto" }}
        />
      </a>
    </div>
  )
}
