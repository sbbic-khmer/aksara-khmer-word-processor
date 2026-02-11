"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Cookie, Shield, Megaphone, ExternalLink, AlertTriangle } from "lucide-react"

const CONSENT_KEY = "aksara-cookie-consent"
const CONSENT_VERSION = 1
const CONSENT_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000 // 12 months

interface ConsentData {
  version: number
  timestamp: string
  advertising: boolean
}

type View = "initial" | "preferences" | "warning"

interface CookieConsentBannerProps {
  onConsent: (advertising: boolean) => void
}

export function getStoredConsent(): boolean | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(CONSENT_KEY)
    if (!raw) return null
    const data: ConsentData = JSON.parse(raw)
    if (data.version !== CONSENT_VERSION) return null
    // Check expiry
    const elapsed = Date.now() - new Date(data.timestamp).getTime()
    if (elapsed > CONSENT_MAX_AGE_MS) {
      localStorage.removeItem(CONSENT_KEY)
      return null
    }
    return data.advertising
  } catch {
    return null
  }
}

function storeConsent(advertising: boolean) {
  const data: ConsentData = {
    version: CONSENT_VERSION,
    timestamp: new Date().toISOString(),
    advertising,
  }
  localStorage.setItem(CONSENT_KEY, JSON.stringify(data))
}

export function CookieConsentBanner({ onConsent }: CookieConsentBannerProps) {
  const t = useTranslations("cookieConsent")
  const [view, setView] = useState<View>("initial")
  const [advertisingEnabled, setAdvertisingEnabled] = useState(true)

  const handleAcceptAll = () => {
    storeConsent(true)
    onConsent(true)
  }

  const handleSavePreferences = () => {
    if (!advertisingEnabled) {
      setView("warning")
      return
    }
    storeConsent(true)
    onConsent(true)
  }

  const handleConfirmReject = () => {
    storeConsent(false)
    onConsent(false)
  }

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md"
        showCloseButton={false}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        {view === "initial" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Cookie className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                {t("title")}
              </DialogTitle>
              <DialogDescription>{t("subtitle")}</DialogDescription>
            </DialogHeader>

            <div className="py-2">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t("description")}
              </p>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setView("preferences")}
              >
                {t("managePreferences")}
              </Button>
              <Button
                onClick={handleAcceptAll}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
              >
                {t("acceptAll")}
              </Button>
            </DialogFooter>
          </>
        )}

        {view === "preferences" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Cookie className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                {t("preferencesTitle")}
              </DialogTitle>
              <DialogDescription>{t("preferencesSubtitle")}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Essential cookies */}
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex-shrink-0">
                  <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {t("essential.title")}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-emerald-600 dark:text-emerald-400">
                        {t("essential.alwaysOn")}
                      </span>
                      <Switch checked disabled />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {t("essential.description")}
                  </p>
                </div>
              </div>

              {/* Advertising cookies */}
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex-shrink-0">
                  <Megaphone className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {t("advertising.title")}
                    </p>
                    <Switch
                      checked={advertisingEnabled}
                      onCheckedChange={setAdvertisingEnabled}
                    />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {t("advertising.description")}
                  </p>
                </div>
              </div>

              {/* Privacy policy link */}
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 mt-4">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {t("policyInfo")}{" "}
                  <a
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
                  >
                    {t("privacyPolicy")}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setView("initial")}
              >
                {t("back")}
              </Button>
              <Button
                onClick={handleSavePreferences}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
              >
                {t("savePreferences")}
              </Button>
            </DialogFooter>
          </>
        )}

        {view === "warning" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                {t("warning.title")}
              </DialogTitle>
              <DialogDescription>{t("warning.subtitle")}</DialogDescription>
            </DialogHeader>

            <div className="py-2">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t("warning.description")}
              </p>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setView("preferences")}
              >
                {t("warning.goBack")}
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmReject}
              >
                {t("warning.leave")}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
