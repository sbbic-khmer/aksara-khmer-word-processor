"use client"

import { useTranslations } from 'next-intl'
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"
import { LoginScreen } from "@/components/login-screen"
import { Link } from "@/i18n/navigation"
import { LanguageSwitcher } from "@/components/language-switcher"

const SIGNUPS_ENABLED = process.env.NEXT_PUBLIC_SIGNUPS_ENABLED === "true"

export default function SignupPage() {
  const t = useTranslations('auth')

  if (!SIGNUPS_ENABLED) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50/50 to-background dark:from-blue-950/20 flex flex-col">
        {/* Header */}
        <header className="p-4 sm:p-6 flex justify-between items-center">
          <Link href="/" className="inline-flex items-center gap-2 sm:gap-3">
            {/* Logo icon */}
            <div className="relative w-8 h-8 sm:w-10 sm:h-10 shrink-0">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl sm:rounded-2xl shadow-lg shadow-blue-500/25" />
              <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-br from-white/20 via-transparent to-black/5" />
              <div className="absolute inset-[1px] rounded-[9px] sm:rounded-[13px] border border-white/20" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white text-xl sm:text-2xl font-bold leading-none translate-y-[-2px] translate-x-[1px]">អ</span>
              </div>
            </div>

            {/* Brand text */}
            <div className="flex flex-col items-start gap-0">
              <span
                className="flex items-baseline gap-1 text-lg sm:text-xl leading-none tracking-tight text-foreground whitespace-nowrap"
                style={{ fontFamily: "var(--font-moul), serif" }}
              >
                អក្សរា
                <span
                  className="text-lg sm:text-xl text-foreground"
                  style={{ fontFamily: "var(--font-geist-sans), sans" }}
                >
                  Pro
                </span>
              </span>
              <span className="text-[8px] sm:text-[9px] font-medium text-muted-foreground uppercase tracking-[0.12em] sm:tracking-[0.15em] mt-0.5">
                {t('brandTagline')}
              </span>
            </div>
          </Link>
          <LanguageSwitcher />
        </header>

        {/* Main content */}
        <main className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-md">
            <div className="bg-card rounded-2xl border border-border shadow-xl p-8 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
                <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">{t('signupsClosed.title')}</h1>
              <p className="text-muted-foreground mb-6">
                {t('signupsClosed.description')}
              </p>
              <div className="flex flex-col gap-3">
                <Button asChild variant="outline" className="w-full bg-transparent">
                  <Link href="/login">{t('signupsClosed.signInExisting')}</Link>
                </Button>
                <Button asChild variant="ghost" className="w-full">
                  <Link href="/">{t('signupsClosed.backToHome')}</Link>
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return <LoginScreen initialMode="register" />
}
