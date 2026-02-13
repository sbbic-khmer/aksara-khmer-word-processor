"use client"

import Script from "next/script"
import { usePathname } from "next/navigation"
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react"
import { getStoredConsent } from "./cookie-consent-banner"

export interface AdConfig {
  showAds: boolean
  isLoading: boolean
  hasAdConsent: boolean | null
  setAdConsent: (advertising: boolean) => void
  adBlocked: boolean
}

const AdContext = createContext<AdConfig | null>(null)

export function useAdConfig(): AdConfig {
  const context = useContext(AdContext)
  if (!context) {
    // Return default config when used outside provider (e.g., during SSR)
    return { showAds: false, isLoading: true, hasAdConsent: null, setAdConsent: () => {}, adBlocked: false }
  }
  return context
}

const ADBLOCK_CACHE_KEY = "aksara-adblocked"

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
  // Initialize from cache so returning adblock users skip the probe entirely
  const [adBlocked, setAdBlocked] = useState(() => {
    if (typeof window === "undefined") return false
    return localStorage.getItem(ADBLOCK_CACHE_KEY) === "true"
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

  // Fast adblock detection via fetch probe.
  // A no-cors HEAD request to the ad domain fails almost instantly when blocked
  // (~ERR_CONNECTION_REFUSED or ERR_BLOCKED_BY_CLIENT) vs waiting 3s for Script
  // tag errors. We cache a positive detection in localStorage so subsequent
  // page loads go straight to NeverBlock with zero delay.
  useEffect(() => {
    if (!shouldShowAds || adBlocked) return

    const controller = new AbortController()
    fetch("https://a.magsrv.com/ad-provider.js", {
      method: "HEAD",
      mode: "no-cors",
      signal: controller.signal,
    })
      .then(() => {
        // Opaque 'ok' — ad domain is reachable, no adblock
        console.log("[ads] Probe succeeded, no adblock detected")
        localStorage.removeItem(ADBLOCK_CACHE_KEY)
      })
      .catch(() => {
        if (controller.signal.aborted) return
        console.log("[ads] Adblock detected (probe failed)")
        localStorage.setItem(ADBLOCK_CACHE_KEY, "true")
        setAdBlocked(true)
      })

    return () => controller.abort()
  }, [shouldShowAds, adBlocked])

  // Backup: if Script tags error out (e.g. probe succeeded on a CDN edge
  // but the actual script is still blocked by a content filter)
  const handleScriptLoad = useCallback(() => {
    console.log("[ads] Ad script loaded successfully")
    localStorage.removeItem(ADBLOCK_CACHE_KEY)
  }, [])

  const handleScriptError = useCallback(() => {
    console.log("[ads] Adblock detected (script error)")
    localStorage.setItem(ADBLOCK_CACHE_KEY, "true")
    setAdBlocked(true)
  }, [])

  const adConfig: AdConfig = {
    ...config,
    hasAdConsent,
    setAdConsent: setHasAdConsent,
    adBlocked,
  }

  return (
    <AdContext.Provider value={adConfig}>
      {shouldShowAds && !adBlocked && (
        <>
          {/* ExoClick ad provider scripts — only rendered when not blocked */}
          <Script
            id="magsrv-ad-provider"
            src="https://a.magsrv.com/ad-provider.js"
            strategy="afterInteractive"
            onLoad={handleScriptLoad}
            onError={handleScriptError}
          />
          <Script
            id="pemsrv-ad-provider"
            src="https://a.pemsrv.com/ad-provider.js"
            strategy="afterInteractive"
            onLoad={handleScriptLoad}
            onError={handleScriptError}
          />
        </>
      )}
      {children}
    </AdContext.Provider>
  )
}
