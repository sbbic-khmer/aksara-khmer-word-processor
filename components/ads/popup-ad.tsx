"use client"

import { useEffect, useRef } from "react"

export function PopupAd() {
  const hasServedRef = useRef(false)

  useEffect(() => {
    function tryServe() {
      if (hasServedRef.current) return
      // Only serve on screens below lg (1024px)
      if (window.innerWidth >= 1024) return

      hasServedRef.current = true
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
    <ins
      className="eas6a97888e33"
      data-zoneid="5851278"
      data-block-ad-types="0"
      style={{ display: "none" }}
    />
  )
}
