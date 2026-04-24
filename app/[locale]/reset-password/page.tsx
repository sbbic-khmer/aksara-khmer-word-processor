"use client"

import { Suspense, useState } from "react"
import { useTranslations } from 'next-intl'
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Loader2, Lock, CheckCircle2, ArrowRight } from "lucide-react"
import { Link } from "@/i18n/navigation"
import { LanguageSwitcher } from "@/components/language-switcher"
import { authClient } from "@/lib/auth-client"

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50/50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  )
}

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const t = useTranslations('auth')

  const token = searchParams.get('token')
  const urlError = searchParams.get('error')

  // Initial token validity is derived from the URL — Better Auth's GET callback
  // redirects here with ?error=INVALID_TOKEN for bad/expired tokens. Held in
  // state so a failed POST can also flip these flags later.
  const [tokenInvalid, setTokenInvalid] = useState(
    urlError === 'INVALID_TOKEN' || !token
  )
  const [tokenExpired, setTokenExpired] = useState(urlError === 'INVALID_TOKEN')

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!token) {
      setTokenInvalid(true)
      return
    }

    if (password !== confirmPassword) {
      setError(t('resetPassword.passwordMismatch'))
      return
    }

    if (password.length < 8) {
      setError(t('resetPassword.requirements'))
      return
    }

    setIsLoading(true)

    const { error: resetError } = await authClient.resetPassword({
      newPassword: password,
      token,
    })

    if (resetError) {
      const code = resetError.code || ""
      const message = resetError.message || ""
      if (code === 'INVALID_TOKEN' || message.toLowerCase().includes('invalid token')) {
        setTokenInvalid(true)
        setTokenExpired(true)
      } else if (message.toLowerCase().includes('too short')) {
        setError(t('resetPassword.requirements'))
      } else {
        setError(message || 'Failed to reset password')
      }
      setIsLoading(false)
      return
    }

    setIsSuccess(true)
    setIsLoading(false)
  }

  if (tokenInvalid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50/50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 relative overflow-hidden">
        <div className="absolute top-[-200px] left-[-100px] w-[500px] h-[500px] bg-blue-400/20 dark:bg-blue-500/10 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

        <div className="absolute top-4 right-4 z-10">
          <LanguageSwitcher />
        </div>

        <Card className="w-full max-w-md relative backdrop-blur-sm bg-white/80 dark:bg-slate-900/80 border-slate-200/60 dark:border-slate-700/60 shadow-2xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
            <CardTitle className="text-2xl font-bold">
              {tokenExpired ? t('resetPassword.errorExpired') : t('resetPassword.errorInvalid')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/forgot-password">
              <Button className="w-full h-12 text-base font-semibold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white cursor-pointer">
                {t('resetPassword.requestNewLink')}
              </Button>
            </Link>
            <div className="text-center">
              <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
                {t('forgotPassword.backToLogin')}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50/50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 relative overflow-hidden">
        <div className="absolute top-[-200px] left-[-100px] w-[500px] h-[500px] bg-blue-400/20 dark:bg-blue-500/10 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

        <Card className="w-full max-w-md relative backdrop-blur-sm bg-white/80 dark:bg-slate-900/80 border-slate-200/60 dark:border-slate-700/60 shadow-2xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl font-bold">{t('resetPassword.successTitle')}</CardTitle>
            <CardDescription className="text-base">
              {t('resetPassword.success')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login">
              <Button className="w-full h-12 text-base font-semibold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white cursor-pointer gap-2">
                {t('resetPassword.signInNow')}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50/50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 relative overflow-hidden">
      <div className="absolute top-[-200px] left-[-100px] w-[500px] h-[500px] bg-blue-400/20 dark:bg-blue-500/10 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
      <div className="absolute bottom-[-150px] right-[-100px] w-[400px] h-[400px] bg-indigo-400/15 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher />
      </div>

      <Card className="w-full max-w-md relative backdrop-blur-sm bg-white/80 dark:bg-slate-900/80 border-slate-200/60 dark:border-slate-700/60 shadow-2xl shadow-slate-900/10 dark:shadow-black/30">
        <CardHeader className="text-center pb-2">
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

          <div className="mx-auto w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
            <Lock className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-2xl font-bold">{t('resetPassword.title')}</CardTitle>
          <CardDescription className="text-base">
            {t('resetPassword.subtitle')}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-3 text-sm text-destructive bg-destructive/10 dark:bg-destructive/20 p-4 rounded-xl border border-destructive/20">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                {t('resetPassword.newPassword')}
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('resetPassword.newPasswordPlaceholder')}
                required
                minLength={8}
                disabled={isLoading}
                className="h-12 px-4 rounded-xl border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">
                {t('resetPassword.confirmPassword')}
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('resetPassword.confirmPasswordPlaceholder')}
                required
                minLength={8}
                disabled={isLoading}
                className="h-12 px-4 rounded-xl border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
              />
            </div>

            <p className="text-sm text-muted-foreground">
              {t('resetPassword.requirements')}
            </p>

            <Button
              type="submit"
              disabled={isLoading || !password || !confirmPassword}
              className="w-full h-12 text-base font-semibold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {t('resetPassword.submitting')}
                </>
              ) : (
                t('resetPassword.submitButton')
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
