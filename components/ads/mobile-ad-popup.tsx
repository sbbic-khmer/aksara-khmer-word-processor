"use client"

import { useState, useEffect, useCallback } from "react"
import { AdUnit } from "./ad-unit"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

interface MobileAdPopupProps {
  isOpen: boolean
  onDismiss: () => void
  countdownDuration?: number
  testMode?: boolean
}

export function MobileAdPopup({
  isOpen,
  onDismiss,
  countdownDuration = 5,
  testMode = false,
}: MobileAdPopupProps) {
  const [countdown, setCountdown] = useState(countdownDuration)
  const canDismiss = countdown <= 0

  // Reset countdown when popup opens
  useEffect(() => {
    if (isOpen) {
      setCountdown(countdownDuration)
    }
  }, [isOpen, countdownDuration])

  // Countdown timer
  useEffect(() => {
    if (!isOpen || countdown <= 0) return

    const timer = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1))
    }, 1000)

    return () => clearInterval(timer)
  }, [isOpen, countdown])

  const handleDismiss = useCallback(() => {
    if (canDismiss) {
      onDismiss()
    }
  }, [canDismiss, onDismiss])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ad-popup-title"
    >
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl m-4 max-w-sm w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700">
          <span
            id="ad-popup-title"
            className="text-sm text-gray-500 dark:text-gray-400"
          >
            Advertisement
          </span>
          {canDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-8 w-8 p-0"
              aria-label="Close advertisement"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Ad content */}
        <div className="p-4 flex justify-center">
          <AdUnit
            slot={process.env.NEXT_PUBLIC_ADSENSE_MOBILE_SLOT || "mobile-interstitial"}
            format="rectangle"
            testMode={testMode}
          />
        </div>

        {/* Footer with countdown/dismiss */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 text-center">
          {canDismiss ? (
            <Button onClick={handleDismiss} className="w-full">
              Continue
            </Button>
          ) : (
            <p
              className="text-sm text-gray-500 dark:text-gray-400"
              aria-live="polite"
              aria-atomic="true"
            >
              You can close this in{" "}
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {countdown}
              </span>{" "}
              second{countdown !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
