"use client"

import { useRef, useCallback, useState, useEffect } from "react"
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile"
import { Shield, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"

interface TurnstileWidgetProps {
  onSuccess: (token: string) => void
  onError?: () => void
  onExpire?: () => void
  className?: string
}

type TurnstileStatus = "idle" | "loading" | "success" | "error"

/**
 * A styled Turnstile widget that integrates nicely with the app's design.
 * Handles token generation, expiration, and errors gracefully.
 */
export function TurnstileWidget({
  onSuccess,
  onError,
  onExpire,
  className = "",
}: TurnstileWidgetProps) {
  const turnstileRef = useRef<TurnstileInstance>(null)
  const [status, setStatus] = useState<TurnstileStatus>("idle")
  const [isVisible, setIsVisible] = useState(false)

  // Fade in on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const handleSuccess = useCallback(
    (token: string) => {
      setStatus("success")
      onSuccess(token)
    },
    [onSuccess]
  )

  const handleError = useCallback(() => {
    setStatus("error")
    onError?.()
  }, [onError])

  const handleExpire = useCallback(() => {
    setStatus("idle")
    onExpire?.()
    // Reset widget to get a new token
    turnstileRef.current?.reset()
  }, [onExpire])

  const handleLoad = useCallback(() => {
    setStatus("loading")
  }, [])

  // Use dummy key for development, real key for production
  const siteKey =
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "1x00000000000000000000AA"

  return (
    <div
      className={`transition-all duration-300 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      } ${className}`}
    >
      {/* Status indicator above widget */}
      <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
        {status === "idle" && (
          <>
            <Shield className="h-3.5 w-3.5" />
            <span>Security verification</span>
          </>
        )}
        {status === "loading" && (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Verifying...</span>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            <span className="text-green-600 dark:text-green-400">Verified</span>
          </>
        )}
        {status === "error" && (
          <>
            <AlertCircle className="h-3.5 w-3.5 text-destructive" />
            <span className="text-destructive">Verification failed - please try again</span>
          </>
        )}
      </div>

      {/* Turnstile widget container */}
      <div
        className={`
          relative rounded-lg overflow-hidden
          ${status === "success" ? "ring-2 ring-green-500/20" : ""}
          ${status === "error" ? "ring-2 ring-destructive/20" : ""}
        `}
      >
        <Turnstile
          ref={turnstileRef}
          siteKey={siteKey}
          onSuccess={handleSuccess}
          onError={handleError}
          onExpire={handleExpire}
          onWidgetLoad={handleLoad}
          options={{
            theme: "auto",
            size: "flexible",
            retry: "auto",
            retryInterval: 8000,
          }}
        />
      </div>
    </div>
  )
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
