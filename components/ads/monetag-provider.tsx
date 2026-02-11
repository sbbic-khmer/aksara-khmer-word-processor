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

interface MonetagProviderProps {
  children: ReactNode
}

// Monetag Zone IDs
// NOTE: Ad frequency/timing is controlled in your Monetag dashboard at monetag.com,
// not in code. To reduce ad frequency after user closes an ad:
// 1. Log into Monetag dashboard
// 2. Go to your zone settings
// 3. Adjust "Frequency capping" and "Re-show delay" settings
const ZONES = {
  inPagePush: "10563236",
  vignette: "10563436",
}

export function MonetagProvider({ children }: MonetagProviderProps) {
  const pathname = usePathname()
  const [config, setConfig] = useState<{ showAds: boolean; isLoading: boolean }>({
    showAds: false,
    isLoading: true,
  })
  const [hasAdConsent, setHasAdConsent] = useState<boolean | null>(null)

  // Read stored consent on mount
  useEffect(() => {
    setHasAdConsent(getStoredConsent())
  }, [])

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

  // Cleanup Monetag scripts and elements when ads shouldn't show
  useEffect(() => {
    if (!shouldShowAds && !config.isLoading) {
      // Remove any Monetag-injected elements (they use various patterns)
      const monetagElements = document.querySelectorAll(
        // Monetag uses data-zone attributes and various class/id patterns
        '[data-zone], [id*="monetag"], [class*="monetag"], ' +
        // In-page push creates fixed-position notification elements
        '[style*="z-index: 2147483647"], [style*="z-index:2147483647"], ' +
        // Iframes from ad networks
        'iframe[src*="nap5k.com"], iframe[src*="gizokraijaw.net"], ' +
        // Common ad container patterns
        '[id^="ScriptRoot"], [class*="push-notification"]'
      )
      monetagElements.forEach((el) => el.remove())

      // Remove injected scripts
      const monetagScripts = document.querySelectorAll(
        'script[src*="nap5k.com"], script[src*="gizokraijaw.net"], ' +
        'script[data-zone]'
      )
      monetagScripts.forEach((el) => el.remove())

      // Remove any lingering fixed-position elements with very high z-index (ad overlays)
      document.querySelectorAll('body > div[style]').forEach((el) => {
        const style = (el as HTMLElement).style
        const zIndex = parseInt(style.zIndex || '0', 10)
        // Monetag uses extremely high z-index values
        if (zIndex > 2000000000) {
          el.remove()
        }
      })
    }
  }, [shouldShowAds, config.isLoading])

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
