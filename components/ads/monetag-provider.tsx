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
    }
  }
  return context
}

interface MonetagProviderProps {
  children: ReactNode
}

// Monetag zone ID for in-page push (desktop)
const MONETAG_ZONE_ID = "10563236"

export function MonetagProvider({ children }: MonetagProviderProps) {
  const [config, setConfig] = useState<AdConfig>({
    showAds: false,
    isLoading: true,
    isReady: false,
  })

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
    setConfig((prev) => ({
      ...prev,
      isReady: false,
    }))
  }

  return (
    <AdContext.Provider value={config}>
      {/* Only load Monetag script if we should show ads */}
      {config.showAds && !config.isLoading && (
        <Script
          id="monetag-inpage-push"
          strategy="afterInteractive"
          onLoad={handleScriptLoad}
          onError={handleScriptError}
          dangerouslySetInnerHTML={{
            __html: `(function(s){s.dataset.zone='${MONETAG_ZONE_ID}',s.src='https://nap5k.com/tag.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))`,
          }}
        />
      )}
      {children}
    </AdContext.Provider>
  )
}
