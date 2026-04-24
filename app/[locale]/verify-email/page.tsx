"use client"

import { Suspense, useState, useEffect, useCallback } from "react"
import { useTranslations } from 'next-intl'
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, AlertCircle, CheckCircle2, Loader2, RefreshCw } from "lucide-react"
import { Link } from "@/i18n/navigation"
import { LanguageSwitcher } from "@/components/language-switcher"

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50/50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  )
}

function VerifyEmailContent() {
  const t = useTranslations('auth')
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const [isResending, setIsResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [resendError, setResendError] = useState<string | null>(null)
  const [rateLimitRemaining, setRateLimitRemaining] = useState<number | null>(null)
  const [retryAfter, setRetryAfter] = useState<number | null>(null)
  const [countdown, setCountdown] = useState<number>(0)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  // Fetch current status on mount
  useEffect(() => {
    async function checkStatus() {
      try {
        const response = await fetch('/api/auth/resend-verification')
        if (response.ok) {
          const data = await response.json()
          if (data.verified) {
            // Already verified, redirect to editor
            window.location.href = '/editor'
            return
          }
          if (data.rateLimit) {
            setRateLimitRemaining(data.rateLimit.remaining)
            if (data.rateLimit.retryAfter) {
              setRetryAfter(data.rateLimit.retryAfter)
              setCountdown(data.rateLimit.retryAfter)
            }
          }
        }
      } catch (error) {
        console.error('Error checking verification status:', error)
      }
    }
    checkStatus()
  }, [])

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setRetryAfter(null)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [countdown])

  const handleResend = useCallback(async () => {
    setIsResending(true)
    setResendError(null)
    setResendSuccess(false)

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.error === 'rate_limited') {
          setRetryAfter(data.retryAfter)
          setCountdown(data.retryAfter)
          setResendError(data.message)
        } else {
          setResendError(data.error || 'Failed to resend email')
        }
        return
      }

      setResendSuccess(true)
      setRateLimitRemaining(data.remaining)
    } catch (error) {
      setResendError('Network error. Please try again.')
    } finally {
      setIsResending(false)
    }
  }, [])

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getErrorMessage = () => {
    switch (error) {
      case 'expired':
        return t('verification.errorExpired')
      case 'invalid_token':
        return t('verification.errorInvalid')
      case 'missing_token':
        return t('verification.errorMissing')
      default:
        return null
    }
  }

  const errorMessage = getErrorMessage()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50/50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 relative overflow-hidden">
      {/* Background glow orbs */}
      <div className="absolute top-[-200px] left-[-100px] w-[500px] h-[500px] bg-blue-400/20 dark:bg-blue-500/10 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
      <div className="absolute bottom-[-150px] right-[-100px] w-[400px] h-[400px] bg-indigo-400/15 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

      {/* Language switcher */}
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher />
      </div>

      <Card className="w-full max-w-md relative backdrop-blur-sm bg-white/80 dark:bg-slate-900/80 border-slate-200/60 dark:border-slate-700/60 shadow-2xl shadow-slate-900/10 dark:shadow-black/30">
        <CardHeader className="text-center pb-2">
          {/* Logo */}
          <Link href="/" className="flex items-center justify-center gap-2 sm:gap-3 mb-6 group">
            <div className="relative w-12 h-12 sm:w-14 sm:h-14 shrink-0 transition-transform duration-300 group-hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-xl sm:rounded-2xl shadow-xl shadow-blue-500/30" />
              <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-br from-white/25 via-transparent to-black/5" />
              <div className="absolute inset-[1px] rounded-[10px] sm:rounded-[14px] border border-white/25" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white text-2xl sm:text-3xl font-bold leading-none translate-y-[-2px] translate-x-[1px]">អ</span>
              </div>
            </div>
            <div className="flex flex-col items-start gap-0">
              <span
                className="flex items-baseline gap-1 text-2xl sm:text-3xl leading-none tracking-tight text-foreground whitespace-nowrap"
                style={{ fontFamily: "var(--font-moul), serif" }}
              >
                អក្សរា
                <span
                  className="text-2xl sm:text-3xl text-foreground font-semibold"
                  style={{ fontFamily: "var(--font-geist-sans), sans" }}
                >
                  Pro
                </span>
              </span>
            </div>
          </Link>

          {/* Icon */}
          <div className="mx-auto w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
            <Mail className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>

          <CardTitle className="text-2xl font-bold">{t('verification.title')}</CardTitle>
          <CardDescription className="text-base">
            {t('verification.subtitle')}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4 space-y-6">
          {/* Error message from URL */}
          {errorMessage && (
            <div className="flex items-center gap-3 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-200 dark:border-amber-800/50">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success message */}
          {resendSuccess && (
            <div className="flex items-center gap-3 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-200 dark:border-green-800/50">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <span>{t('verification.resendSuccess')}</span>
            </div>
          )}

          {/* Resend error */}
          {resendError && !resendSuccess && (
            <div className="flex items-center gap-3 text-sm text-destructive bg-destructive/10 dark:bg-destructive/20 p-4 rounded-xl border border-destructive/20">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{resendError}</span>
            </div>
          )}

          {/* Instructions */}
          <div className="text-center text-slate-600 dark:text-slate-400 space-y-2">
            <p>{t('verification.instructions')}</p>
            {userEmail && (
              <p className="font-medium text-slate-900 dark:text-white">{userEmail}</p>
            )}
          </div>

          {/* Resend button */}
          <Button
            onClick={handleResend}
            disabled={isResending || countdown > 0}
            className="w-full h-12 text-base font-semibold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isResending ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {t('verification.resending')}
              </>
            ) : countdown > 0 ? (
              <>
                <RefreshCw className="mr-2 h-5 w-5" />
                {t('verification.retryIn')} {formatCountdown(countdown)}
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-5 w-5" />
                {t('verification.resendButton')}
              </>
            )}
          </Button>

          {/* Remaining resends */}
          {rateLimitRemaining !== null && rateLimitRemaining < 3 && countdown === 0 && (
            <p className="text-center text-sm text-slate-500 dark:text-slate-400">
              {t('verification.remainingResends', { count: rateLimitRemaining })}
            </p>
          )}

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-700" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-slate-900 px-3 text-muted-foreground">
                {t('verification.orSignOut')}
              </span>
            </div>
          </div>

          {/* Sign out link */}
          <Link href="/login">
            <Button
              variant="outline"
              className="w-full h-12 text-base font-medium rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              {t('verification.signOutButton')}
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
