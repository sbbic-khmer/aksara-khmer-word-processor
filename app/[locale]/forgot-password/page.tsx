"use client"

import { useState } from "react"
import { useTranslations, useLocale } from 'next-intl'
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Loader2, Mail, CheckCircle2 } from "lucide-react"
import { Link } from "@/i18n/navigation"
import { LanguageSwitcher } from "@/components/language-switcher"

export default function ForgotPasswordPage() {
  const t = useTranslations('auth')
  const locale = useLocale()
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // The locale-aware redirect target is handled server-side in our
    // sendResetPassword callback, but we pass `redirectTo` for completeness.
    const localePrefix = locale === 'en' ? '' : `/${locale}`
    const redirectTo = `${window.location.origin}${localePrefix}/reset-password`

    // Always show success (Better Auth never throws for unknown emails — it
    // simulates the work to mitigate timing attacks).
    await authClient.requestPasswordReset({ email, redirectTo }).catch(() => {})
    setIsSuccess(true)
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50/50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 relative overflow-hidden">
      {/* Background glow orbs */}
      <div className="absolute top-[-200px] left-[-100px] w-[500px] h-[500px] bg-blue-400/20 dark:bg-blue-500/10 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
      <div className="absolute bottom-[-150px] right-[-100px] w-[400px] h-[400px] bg-indigo-400/15 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

      {/* Language switcher */}
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher />
      </div>

      {/* Back to login */}
      <Link
        href="/login"
        className="absolute top-4 left-4 z-10 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="hidden sm:inline">{t('forgotPassword.backToLogin')}</span>
      </Link>

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

          {isSuccess ? (
            <>
              <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-2xl font-bold">{t('forgotPassword.successTitle')}</CardTitle>
              <CardDescription className="text-base">
                {t('forgotPassword.successMessage')}
              </CardDescription>
            </>
          ) : (
            <>
              <div className="mx-auto w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                <Mail className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-2xl font-bold">{t('forgotPassword.title')}</CardTitle>
              <CardDescription className="text-base">
                {t('forgotPassword.subtitle')}
              </CardDescription>
            </>
          )}
        </CardHeader>

        <CardContent className="pt-4">
          {isSuccess ? (
            <div className="space-y-6">
              <p className="text-center text-slate-600 dark:text-slate-400">
                {t('forgotPassword.checkInbox')}
              </p>
              <Link href="/login">
                <Button
                  className="w-full h-12 text-base font-semibold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-600/25 cursor-pointer"
                >
                  {t('forgotPassword.backToLogin')}
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  {t('forgotPassword.emailLabel')}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('forgotPassword.emailPlaceholder')}
                  required
                  disabled={isLoading}
                  className="h-12 px-4 rounded-xl border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading || !email}
                className="w-full h-12 text-base font-semibold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {t('forgotPassword.submitting')}
                  </>
                ) : (
                  t('forgotPassword.submitButton')
                )}
              </Button>

              <div className="text-center">
                <Link
                  href="/login"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('forgotPassword.backToLogin')}
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
