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
  isReady: boolean
  isMobile: boolean
}

const AdContext = createContext<AdConfig | null>(null)

export function useAdConfig(): AdConfig {
  const context = useContext(AdContext)
  if (!context) {
    // Return default config when used outside provider (e.g., during SSR)
    return {
      showAds: false,
      isLoading: true,
      isReady: false,
      isMobile: false,
    }
  }
  return context
}

interface MonetagProviderProps {
  children: ReactNode
}

// Monetag Zone IDs
const ZONES = {
  inPagePush: "10563236",  // Desktop: In-page push notifications
  vignette: "10563436",    // Mobile: Full-screen vignette/interstitial
  pushNotification: "10563437", // Both: Browser push notifications (requires permission)
}

export function MonetagProvider({ children }: MonetagProviderProps) {
  const [config, setConfig] = useState<AdConfig>({
    showAds: false,
    isLoading: true,
    isReady: false,
    isMobile: false,
  })

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const isMobile = window.matchMedia("(max-width: 1023px)").matches ||
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      setConfig((prev) => ({ ...prev, isMobile }))
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // Fetch ad configuration from API
  useEffect(() => {
    async function fetchAdConfig() {
      try {
        const response = await fetch("/api/ads/config")
        if (response.ok) {
          const data = await response.json()
          setConfig((prev) => ({
            ...prev,
            showAds: data.showAds ?? false,
            isLoading: false,
          }))
        } else {
          // User not authenticated or error - disable ads
          setConfig((prev) => ({
            ...prev,
            showAds: false,
            isLoading: false,
          }))
        }
      } catch (error) {
        console.error("Failed to fetch ad config:", error)
        setConfig((prev) => ({
          ...prev,
          showAds: false,
          isLoading: false,
        }))
      }
    }

    fetchAdConfig()
  }, [])

  const handleScriptLoad = () => {
    setConfig((prev) => ({
      ...prev,
      isReady: true,
    }))
  }

  const handleScriptError = () => {
    console.debug("Monetag script failed to load (possibly blocked)")
  }

  const shouldShowAds = config.showAds && !config.isLoading

  return (
    <AdContext.Provider value={config}>
      {shouldShowAds && (
        <>
          {/* Push Notifications - Both desktop and mobile (browser permission-based) */}
          <Script
            id="monetag-push-notification"
            src={`https://3nbf4.com/act/files/tag.min.js?z=${ZONES.pushNotification}`}
            strategy="afterInteractive"
            data-cfasync="false"
            async
            onError={handleScriptError}
          />

          {/* Desktop: In-page push */}
          {!config.isMobile && (
            <Script
              id="monetag-inpage-push"
              strategy="afterInteractive"
              onLoad={handleScriptLoad}
              onError={handleScriptError}
              dangerouslySetInnerHTML={{
                __html: `(function(s){s.dataset.zone='${ZONES.inPagePush}',s.src='https://nap5k.com/tag.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))`,
              }}
            />
          )}

          {/* Mobile: Vignette (full-screen interstitial) */}
          {config.isMobile && (
            <Script
              id="monetag-vignette"
              strategy="afterInteractive"
              onLoad={handleScriptLoad}
              onError={handleScriptError}
              dangerouslySetInnerHTML={{
                __html: `(function(s){s.dataset.zone='${ZONES.vignette}',s.src='https://gizokraijaw.net/vignette.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))`,
              }}
            />
          )}
        </>
      )}
      {children}
    </AdContext.Provider>
  )
}
