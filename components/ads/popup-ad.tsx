"use client"

import { useEffect, useRef, useState } from "react"

export function PopupAd() {
  const hasServedRef = useRef(false)
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null)

  // Determine device type on mount
  useEffect(() => {
    setIsDesktop(window.innerWidth >= 1024)
  }, [])

  // Serve the ad once the correct <ins> tag is rendered
  useEffect(() => {
    if (isDesktop === null) return
    if (hasServedRef.current) return
    hasServedRef.current = true
    ;(window.AdProvider = window.AdProvider || []).push({ serve: {} })
  }, [isDesktop])

  if (isDesktop === null) return null

  if (isDesktop) {
    return (
      <ins
        className="eas6a97888e35"
        data-zoneid="5851398"
        data-block-ad-types="0"
        style={{ display: "none" }}
      />
    )
  }

  return (
    <ins
      className="eas6a97888e33"
      data-zoneid="5851278"
      data-block-ad-types="0"
      style={{ display: "none" }}
    />
  )
}
