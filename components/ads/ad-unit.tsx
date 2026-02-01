"use client"

import { useEffect, useRef, useState } from "react"
import { useAdConfig } from "./adsense-provider"
import { cn } from "@/lib/utils"

type AdFormat = "rectangle" | "vertical" | "horizontal"

interface AdUnitProps {
  slot: string
  format: AdFormat
  className?: string
  testMode?: boolean
}

// Ad format dimensions
const formatStyles: Record<AdFormat, { width: number; height: number }> = {
  rectangle: { width: 300, height: 250 },
  vertical: { width: 300, height: 600 },
  horizontal: { width: 728, height: 90 },
}

type AdState = "loading" | "loaded" | "error" | "no-fill" | "blocked" | "hidden"

export function AdUnit({
  slot,
  format,
  className,
  testMode = false,
}: AdUnitProps) {
  const { showAds, isAdSenseReady, isLoading } = useAdConfig()
  const adRef = useRef<HTMLModElement>(null)
  const [adState, setAdState] = useState<AdState>("loading")
  const initAttempted = useRef(false)

  const { width, height } = formatStyles[format]

  useEffect(() => {
    // Don't render if ads are disabled or still loading config
    if (!showAds || isLoading) {
      setAdState("hidden")
      return
    }

    // Wait for AdSense to be ready
    if (!isAdSenseReady) {
      setAdState("loading")
      return
    }

    // Prevent double initialization
    if (initAttempted.current) return
    initAttempted.current = true

    // Initialize the ad
    try {
      const adsbygoogle = (window as unknown as { adsbygoogle?: unknown[] })
        .adsbygoogle
      if (adsbygoogle) {
        adsbygoogle.push({})
        setAdState("loaded")
      } else {
        setAdState("blocked")
      }
    } catch (error) {
      console.debug("Ad initialization failed:", error)
      setAdState("error")
    }
  }, [showAds, isAdSenseReady, isLoading])

  // Don't render anything if ads are disabled
  if (!showAds || adState === "hidden" || adState === "blocked") {
    return null
  }

  // Show placeholder during loading
  if (adState === "loading" || isLoading) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted/30 rounded",
          className
        )}
        style={{ width, height, minWidth: width, minHeight: height }}
        aria-hidden="true"
      >
        <span className="text-muted-foreground text-sm">Loading...</span>
      </div>
    )
  }

  // Test mode - show placeholder instead of real ad
  if (testMode) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted border-2 border-dashed border-muted-foreground/30 rounded",
          className
        )}
        style={{ width, height, minWidth: width, minHeight: height }}
        aria-hidden="true"
      >
        <div className="text-center text-muted-foreground text-sm">
          <div className="font-medium">Ad Placeholder</div>
          <div className="text-xs">
            {width}x{height} ({format})
          </div>
        </div>
      </div>
    )
  }

  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID

  return (
    <div
      className={cn("overflow-hidden", className)}
      style={{ width, height, minWidth: width, minHeight: height }}
    >
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: "block", width, height }}
        data-ad-client={clientId}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  )
}
