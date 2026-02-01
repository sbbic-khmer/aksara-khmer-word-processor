"use client"

import { useAdConfig } from "./adsense-provider"
import { AdUnit } from "./ad-unit"

interface SidebarAdProps {
  testMode?: boolean
  position?: "left" | "right"
}

export function SidebarAd({ testMode = false, position = "right" }: SidebarAdProps) {
  const { showAds, isLoading } = useAdConfig()

  // Don't render if ads are disabled or still loading
  if (!showAds || isLoading) {
    return null
  }

  // Use different slots for left vs right if configured
  const slot = position === "left"
    ? process.env.NEXT_PUBLIC_ADSENSE_SIDEBAR_LEFT_SLOT || process.env.NEXT_PUBLIC_ADSENSE_SIDEBAR_SLOT || "sidebar-left"
    : process.env.NEXT_PUBLIC_ADSENSE_SIDEBAR_SLOT || "sidebar-right"

  return (
    <div className="sticky top-4 p-4">
      <AdUnit
        slot={slot}
        format="vertical"
        testMode={testMode}
      />
    </div>
  )
}
