"use client"

import { useAdConfig } from "./adsense-provider"
import { AdUnit } from "./ad-unit"

interface SidebarAdProps {
  testMode?: boolean
}

export function SidebarAd({ testMode = false }: SidebarAdProps) {
  const { showAds, isLoading } = useAdConfig()

  // Don't render if ads are disabled or still loading
  if (!showAds || isLoading) {
    return null
  }

  return (
    <div className="sticky top-4 p-4">
      <AdUnit
        slot={process.env.NEXT_PUBLIC_ADSENSE_SIDEBAR_SLOT || "sidebar"}
        format="vertical"
        testMode={testMode}
      />
    </div>
  )
}
