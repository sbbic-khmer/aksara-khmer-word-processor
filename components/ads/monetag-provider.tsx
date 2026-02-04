"use client"

import Script from "next/script"
import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react"

export interface AdConfig {
  showAds: boolean
  isLoading: boolean
}

const AdContext = createContext<AdConfig | null>(null)

export function useAdConfig(): AdConfig {
  const context = useContext(AdContext)
  if (!context) {
    // Return default config when used outside provider (e.g., during SSR)
    return { showAds: false, isLoading: true }
  }
  return context
}

interface MonetagProviderProps {
  children: ReactNode
}

// Monetag Zone IDs - Monetag handles all timing, frequency, and device detection
const ZONES = {
  inPagePush: "10563236",
  vignette: "10563436",
  pushNotification: "10563437",
}

export function MonetagProvider({ children }: MonetagProviderProps) {
  const [config, setConfig] = useState<AdConfig>({
    showAds: false,
    isLoading: true,
  })

  // Check if user has ads enabled (admin can disable per user)
  useEffect(() => {
    async function checkAdsEnabled() {
      try {
        const response = await fetch("/api/ads/config")
        if (response.ok) {
          const data = await response.json()
          setConfig({ showAds: data.showAds ?? false, isLoading: false })
        } else {
          setConfig({ showAds: false, isLoading: false })
        }
      } catch {
        setConfig({ showAds: false, isLoading: false })
      }
    }
    checkAdsEnabled()
  }, [])

  const shouldShowAds = config.showAds && !config.isLoading

  return (
    <AdContext.Provider value={config}>
      {shouldShowAds && (
        <>
          {/* Push Notifications */}
          <Script
            id="monetag-push-notification"
            src={`https://3nbf4.com/act/files/tag.min.js?z=${ZONES.pushNotification}`}
            strategy="afterInteractive"
            data-cfasync="false"
          />

          {/* In-page push */}
          <Script
            id="monetag-inpage-push"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `(function(s){s.dataset.zone='${ZONES.inPagePush}',s.src='https://nap5k.com/tag.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))`,
            }}
          />

          {/* Vignette (full-screen interstitial) */}
          <Script
            id="monetag-vignette"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `(function(s){s.dataset.zone='${ZONES.vignette}',s.src='https://gizokraijaw.net/vignette.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))`,
            }}
          />
        </>
      )}
      {children}
    </AdContext.Provider>
  )
}
