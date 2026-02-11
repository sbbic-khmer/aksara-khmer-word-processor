"use client"

import { useEffect, useRef } from "react"

export function PopupAd() {
  const hasServedMobileRef = useRef(false)
  const hasServedDesktopRef = useRef(false)

  useEffect(() => {
    function tryServe() {
      if (window.innerWidth >= 1024) {
        if (hasServedDesktopRef.current) return
        hasServedDesktopRef.current = true
      } else {
        if (hasServedMobileRef.current) return
        hasServedMobileRef.current = true
      }
      ;(window.AdProvider = window.AdProvider || []).push({ serve: {} })
    }

    tryServe()

    function onResize() {
      tryServe()
    }

    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  return (
    <>
      {/* Mobile/tablet popup (below lg) */}
      <ins
        className="eas6a97888e33"
        data-zoneid="5851278"
        data-block-ad-types="0"
        style={{ display: "none" }}
      />
      {/* Desktop fullscreen popup (lg+) */}
      <ins
        className="eas6a97888e35"
        data-zoneid="5851398"
        data-block-ad-types="0"
        style={{ display: "none" }}
      />
    </>
  )
}
