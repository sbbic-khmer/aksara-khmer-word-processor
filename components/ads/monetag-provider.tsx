"use client"

import Script from "next/script"
import { usePathname } from "next/navigation"
import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react"
import { getStoredConsent } from "./cookie-consent-banner"

export interface AdConfig {
  showAds: boolean
  isLoading: boolean
  hasAdConsent: boolean | null
  setAdConsent: (advertising: boolean) => void
}

const AdContext = createContext<AdConfig | null>(null)

export function useAdConfig(): AdConfig {
  const context = useContext(AdContext)
  if (!context) {
    // Return default config when used outside provider (e.g., during SSR)
    return { showAds: false, isLoading: true, hasAdConsent: null, setAdConsent: () => {} }
  }
  return context
}

interface AdProviderProps {
  children: ReactNode
}

export function MonetagProvider({ children }: AdProviderProps) {
  const pathname = usePathname()
  const [config, setConfig] = useState<{ showAds: boolean; isLoading: boolean }>({
    showAds: false,
    isLoading: true,
  })
  const [hasAdConsent, setHasAdConsent] = useState<boolean | null>(() => {
    // Read synchronously during init to avoid flash of consent banner
    if (typeof window === "undefined") return null
    return getStoredConsent()
  })

  // Only show ads on the editor page
  const isEditorPage = pathname?.includes("/editor")

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

  const shouldShowAds = config.showAds && !config.isLoading && isEditorPage && hasAdConsent === true

  const adConfig: AdConfig = {
    ...config,
    hasAdConsent,
    setAdConsent: setHasAdConsent,
  }

  return (
    <AdContext.Provider value={adConfig}>
      {shouldShowAds && (
        <>
          {/* ExoClick ad provider scripts */}
          <Script
            id="magsrv-ad-provider"
            src="https://a.magsrv.com/ad-provider.js"
            strategy="afterInteractive"
          />
          <Script
            id="pemsrv-ad-provider"
            src="https://a.pemsrv.com/ad-provider.js"
            strategy="afterInteractive"
          />
        </>
      )}
      {children}
    </AdContext.Provider>
  )
}
