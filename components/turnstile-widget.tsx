"use client"

import { useRef, useCallback, useEffect } from "react"
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile"

interface TurnstileWidgetProps {
  onSuccess: (token: string) => void
  onError?: () => void
  onExpire?: () => void
  onUnconfigured?: () => void
  className?: string
}

// Check if Turnstile is configured (must be done at module level for SSR)
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

/**
 * Turnstile widget wrapper that handles configuration and lifecycle.
 * Returns null if NEXT_PUBLIC_TURNSTILE_SITE_KEY is not configured.
 */
export function TurnstileWidget({
  onSuccess,
  onError,
  onExpire,
  onUnconfigured,
  className = "",
}: TurnstileWidgetProps) {
  const turnstileRef = useRef<TurnstileInstance>(null)

  // Notify parent if Turnstile is not configured
  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) {
      onUnconfigured?.()
    }
  }, [onUnconfigured])

  const handleExpire = useCallback(() => {
    onExpire?.()
    // Reset widget to get a new token
    turnstileRef.current?.reset()
  }, [onExpire])

  // Don't render if not configured
  if (!TURNSTILE_SITE_KEY) {
    return null
  }

  return (
    <div className={`min-h-[65px] flex items-center justify-center ${className}`}>
      <Turnstile
        ref={turnstileRef}
        siteKey={TURNSTILE_SITE_KEY}
        onSuccess={onSuccess}
        onError={onError}
        onExpire={handleExpire}
        options={{
          theme: "auto",
          size: "flexible",
          retry: "auto",
          retryInterval: 8000,
        }}
      />
    </div>
  )
}

/**
 * Check if Turnstile is configured (useful for conditional logic)
 */
export function isTurnstileConfigured(): boolean {
  return !!TURNSTILE_SITE_KEY
}

/**
 * Reset the Turnstile widget externally
 * Useful after form submission to get a new token
 */
export function useTurnstileReset() {
  const [resetKey, setResetKey] = useState(0)

  const reset = useCallback(() => {
    setResetKey((prev) => prev + 1)
  }, [])

  return { resetKey, reset }
}
