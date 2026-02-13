"use client"

import { useEffect, useRef } from "react"
import { useAdConfig } from "./monetag-provider"
import { NeverBlockBannerAd } from "./neverblock-banner-ad"

export function SidebarBannerAd({ zoneId }: { zoneId: string }) {
  const { adBlocked } = useAdConfig()
  const containerRef = useRef<HTMLDivElement>(null)
  const hasServedRef = useRef(false)

  useEffect(() => {
    if (adBlocked) return

    function tryServe() {
      if (hasServedRef.current) return
      // offsetParent is null when the element is hidden (display:none)
      if (containerRef.current?.offsetParent === null) return

      hasServedRef.current = true
      ;(window.AdProvider = window.AdProvider || []).push({ serve: {} })
    }

    tryServe()

    // Serve if the banner becomes visible after a breakpoint change
    function onResize() {
      tryServe()
    }

    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [adBlocked])

  if (adBlocked) {
    return <NeverBlockBannerAd zoneId={zoneId} />
  }

  return (
    <div ref={containerRef} className="flex items-center justify-center h-full">
      <ins className="eas6a97888e2" data-zoneid={zoneId} data-block-ad-types="0" />
    </div>
  )
}
