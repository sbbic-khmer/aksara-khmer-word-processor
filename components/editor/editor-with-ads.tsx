"use client"

import { useEffect, useState } from "react"
import { KhmerLexicalEditor } from "@/components/lexical/khmer-lexical-editor"
import { MonetagProvider, useAdConfig, SidebarBannerAd, PopupAd, CookieConsentBanner } from "@/components/ads"
import { DataTransparencyNotice } from "@/components/data-transparency-notice"

function EditorContent() {
  const { showAds, hasAdConsent, setAdConsent } = useAdConfig()
  const [hasSeenDataNotice, setHasSeenDataNotice] = useState(true) // Default true to not show while loading
  const [preferencesLoaded, setPreferencesLoaded] = useState(false)
  const [screenSize, setScreenSize] = useState<"mobile" | "lg" | "xl" | null>(null)

  // Determine screen size on mount to conditionally render ad components
  useEffect(() => {
    const w = window.innerWidth
    if (w >= 1280) setScreenSize("xl")
    else if (w >= 1024) setScreenSize("lg")
    else setScreenSize("mobile")
  }, [])

  // Fetch preferences to check if user has seen data notice
  useEffect(() => {
    fetch("/api/preferences")
      .then((res) => res.json())
      .then((data) => {
        setHasSeenDataNotice(data.has_seen_data_notice ?? false)
        setPreferencesLoaded(true)
      })
      .catch(() => {
        setPreferencesLoaded(true)
      })
  }, [])

  const showLeftSidebar = showAds && (screenSize === "xl")
  const showRightSidebar = showAds && (screenSize === "lg" || screenSize === "xl")

  return (
    <>
      <div className="h-screen flex">
        {/* Left sidebar banner - xl (1280px+) only */}
        {showLeftSidebar && (
          <div className="w-[160px] shrink-0 flex">
            <SidebarBannerAd zoneId="5851370" />
          </div>
        )}

        {/* Editor column */}
        <div className="flex-1 min-w-0">
          <KhmerLexicalEditor className="h-full" />
        </div>

        {/* Right sidebar banner - lg (1024px+) */}
        {showRightSidebar && (
          <div className="w-[160px] shrink-0 flex">
            <SidebarBannerAd zoneId="5851260" />
          </div>
        )}
      </div>

      {/* Popup ad - serves mobile or desktop zone based on window width */}
      {showAds && <PopupAd />}

      {/* Data transparency notice - shown once to new users */}
      {preferencesLoaded && (
        <DataTransparencyNotice
          hasSeenNotice={hasSeenDataNotice}
          onDismiss={() => setHasSeenDataNotice(true)}
        />
      )}

      {/* Cookie consent banner - shown when ads enabled but no consent stored */}
      {showAds && hasAdConsent === null && (
        <CookieConsentBanner onConsent={(advertising) => setAdConsent(advertising)} />
      )}
    </>
  )
}

export function EditorWithAds() {
  return (
    <MonetagProvider>
      <EditorContent />
    </MonetagProvider>
  )
}
