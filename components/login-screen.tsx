"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { useTranslations } from 'next-intl'
import { useAuth } from "./auth-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Loader2, ArrowRight } from "lucide-react"
import { TurnstileWidget, isTurnstileConfigured } from "./turnstile-widget"
import { useRouter } from "@/i18n/navigation"
import { LanguageSwitcher } from "@/components/language-switcher"
import { Link } from "@/i18n/navigation"

interface LoginScreenProps {
  initialMode?: "login" | "register"
}

export function LoginScreen({ initialMode = "login" }: LoginScreenProps) {
  const router = useRouter()
  const { login, register } = useAuth()
  const t = useTranslations('auth')
  const [isRegister, setIsRegister] = useState(initialMode === "register")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string>("")
  const [turnstileKey, setTurnstileKey] = useState(0)
  const [turnstileRequired, setTurnstileRequired] = useState(isTurnstileConfigured())

  const resetTurnstile = useCallback(() => {
    setTurnstileToken("")
    setTurnstileKey((prev) => prev + 1)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Check for turnstile token only if Turnstile is configured and required
    if (turnstileRequired && !turnstileToken) {
      setError(t('errors.securityVerification'))
      return
    }

    setIsLoading(true)

    let result
    if (isRegister) {
      result = await register(email, password, name || undefined, turnstileToken || undefined)
    } else {
      result = await login(email, password, turnstileToken || undefined)
    }

    if (result.success) {
      router.push("/editor")
      return
    }

    setError(result.error || (isRegister ? t('errors.registrationFailed') : t('errors.loginFailed')))
    // Reset turnstile on error (token is single-use)
    if (turnstileRequired) {
      resetTurnstile()
    }
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50/50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 relative overflow-hidden">
      {/* Background glow orbs */}
      <div className="absolute top-[-200px] left-[-100px] w-[500px] h-[500px] bg-blue-400/20 dark:bg-blue-500/10 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
      <div className="absolute bottom-[-150px] right-[-100px] w-[400px] h-[400px] bg-indigo-400/15 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-gradient-radial from-blue-400/10 via-transparent to-transparent dark:from-blue-500/5 blur-2xl pointer-events-none" aria-hidden="true" />

      {/* Language switcher in top-right corner */}
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher />
      </div>

      {/* Back to home link */}
      <Link
        href="/"
        className="absolute top-4 left-4 z-10 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
      >
        <ArrowRight className="h-4 w-4 rotate-180" />
        <span className="hidden sm:inline">{t('backToHome')}</span>
      </Link>

      <Card className="w-full max-w-md relative backdrop-blur-sm bg-white/80 dark:bg-slate-900/80 border-slate-200/60 dark:border-slate-700/60 shadow-2xl shadow-slate-900/10 dark:shadow-black/30">
        <CardHeader className="text-center pb-2">
          {/* Logo */}
          <Link href="/" className="flex items-center justify-center gap-2 sm:gap-3 mb-6 group">
            {/* Logo icon */}
            <div className="relative w-12 h-12 sm:w-14 sm:h-14 shrink-0 transition-transform duration-300 group-hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-xl sm:rounded-2xl shadow-xl shadow-blue-500/30" />
              <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-br from-white/25 via-transparent to-black/5" />
              <div className="absolute inset-[1px] rounded-[10px] sm:rounded-[14px] border border-white/25" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white text-2xl sm:text-3xl font-bold leading-none translate-y-[-2px] translate-x-[1px]">
                  អ
                </span>
              </div>
            </div>

            {/* Brand text */}
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
              <span className="text-[9px] sm:text-[10px] font-medium text-muted-foreground uppercase tracking-[0.15em] sm:tracking-[0.2em] mt-0.5 sm:mt-1">
                {t('brandTagline')}
              </span>
            </div>
          </Link>
          <CardTitle className="text-2xl font-bold">{isRegister ? t('register.title') : t('login.title')}</CardTitle>
          <CardDescription className="text-base">
            {isRegister ? t('register.subtitle') : t('login.subtitle')}
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

            {isRegister && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">{t('form.name')}</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('form.namePlaceholder')}
                  disabled={isLoading}
                  className="h-12 px-4 rounded-xl border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">{t('form.email')}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('form.emailPlaceholder')}
                required
                disabled={isLoading}
                className="h-12 px-4 rounded-xl border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">{t('form.password')}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('form.passwordPlaceholder')}
                required
                disabled={isLoading}
                minLength={6}
                className="h-12 px-4 rounded-xl border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
              />
              {!isRegister && (
                <div className="text-right">
                  <Link
                    href="/forgot-password"
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                  >
                    {t('forgotPassword.link')}
                  </Link>
                </div>
              )}
            </div>

            {/* Turnstile Security Widget - only renders if configured */}
            <TurnstileWidget
              key={turnstileKey}
              onSuccess={setTurnstileToken}
              onError={() => setTurnstileToken("")}
              onExpire={() => setTurnstileToken("")}
              onUnconfigured={() => setTurnstileRequired(false)}
            />

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 transition-all duration-300 hover:-translate-y-0.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-lg"
              disabled={isLoading || (turnstileRequired && !turnstileToken)}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {isRegister ? t('register.loading') : t('login.loading')}
                </>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  {isRegister ? t('register.button') : t('login.button')}
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-700" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-slate-900 px-3 text-muted-foreground">
                  {isRegister ? t('switchMode.hasAccount') : t('switchMode.noAccount')}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister)
                setError("")
                resetTurnstile()
              }}
              className="w-full h-12 text-base font-medium rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 text-foreground transition-all duration-200 cursor-pointer hover:border-slate-300 dark:hover:border-slate-600"
            >
              {isRegister ? t('switchMode.signIn') : t('switchMode.createOne')}
            </button>

            {/* Privacy Policy Link */}
            <p className="text-center text-xs text-muted-foreground mt-6">
              By continuing, you agree to our{' '}
              <a href="/privacy" className="text-blue-600 dark:text-blue-400 hover:underline">
                Privacy Policy
              </a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
