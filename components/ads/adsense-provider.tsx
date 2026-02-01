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
  frequencySchedule: number[]
  isLoading: boolean
  isAdSenseReady: boolean
}

const AdContext = createContext<AdConfig | null>(null)

export function useAdConfig(): AdConfig {
  const context = useContext(AdContext)
  if (!context) {
    // Return default config when used outside provider (e.g., during SSR)
    return {
      showAds: false,
      frequencySchedule: [2, 5, 10, 15],
      isLoading: true,
      isAdSenseReady: false,
    }
  }
  return context
}

interface AdSenseProviderProps {
  children: ReactNode
}

export function AdSenseProvider({ children }: AdSenseProviderProps) {
  const [config, setConfig] = useState<AdConfig>({
    showAds: false,
    frequencySchedule: [2, 5, 10, 15],
    isLoading: true,
    isAdSenseReady: false,
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
            frequencySchedule: data.frequencySchedule ?? [2, 5, 10, 15],
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

  const handleAdSenseLoad = () => {
    setConfig((prev) => ({
      ...prev,
      isAdSenseReady: true,
    }))
  }

  const handleAdSenseError = () => {
    // AdSense blocked or failed to load - silently disable
    console.debug("AdSense failed to load (possibly blocked)")
    setConfig((prev) => ({
      ...prev,
      isAdSenseReady: false,
      showAds: false,
    }))
  }

  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID

  return (
    <AdContext.Provider value={config}>
      {/* Only load AdSense script if we should show ads and have a client ID */}
      {config.showAds && clientId && !config.isLoading && (
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"
          strategy="afterInteractive"
          crossOrigin="anonymous"
          data-ad-client={clientId}
          onLoad={handleAdSenseLoad}
          onError={handleAdSenseError}
        />
      )}
      {children}
    </AdContext.Provider>
  )
}
