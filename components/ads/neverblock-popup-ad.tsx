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

export function NeverBlockPopupAd({ zoneId }: { zoneId: string }) {
  const [ad, setAd] = useState<AdData | null>(null)
  const [visible, setVisible] = useState(false)
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    async function fetchAd() {
      try {
        const response = await fetch("/api/ads/serve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ zones: [zoneId] }),
        })
        if (!response.ok) return

        const data = await response.json()
        const zone = data?.zones?.find(
          (z: ZoneResult) => String(z.idzone) === zoneId,
        )
        if (zone?.data?.image && zone?.data?.url) {
          setAd(zone.data)
        }
      } catch {
        // Silently fail
      }
    }

    fetchAd()
  }, [zoneId])

  // Show popup after 5-second delay once ad data is available
  useEffect(() => {
    if (!ad) return
    const timer = setTimeout(() => setVisible(true), 5000)
    return () => clearTimeout(timer)
  }, [ad])

  if (!ad || !visible) return null

  const proxiedImage = `/api/ads/image?url=${encodeURIComponent(ad.image)}`

  return (
    <div
      onClick={() => setVisible(false)}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.6)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ position: "relative" }}
      >
        <button
          onClick={() => setVisible(false)}
          aria-label="Close"
          style={{
            position: "absolute",
            top: -12,
            right: -12,
            width: 28,
            height: 28,
            borderRadius: "50%",
            border: "none",
            backgroundColor: "#333",
            color: "#fff",
            fontSize: 16,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: 1,
          }}
        >
          ×
        </button>
        <a href={ad.url} target="_blank" rel="noopener noreferrer">
          <img
            src={proxiedImage}
            width={ad.width}
            height={ad.height}
            alt=""
            style={{ maxWidth: "90vw", maxHeight: "80vh", display: "block" }}
          />
        </a>
      </div>
    </div>
  )
}
