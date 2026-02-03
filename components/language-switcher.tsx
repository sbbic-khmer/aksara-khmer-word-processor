'use client'

import { useLocale } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/navigation'
import { Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'

const locales: Record<string, string> = {
  en: 'English',
  km: 'ភាសាខ្មែរ',
}

export function LanguageSwitcher() {
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()

  // Get the OTHER locale (the one to switch to)
  const otherLocale = locale === 'en' ? 'km' : 'en'
  const otherLocaleName = locales[otherLocale]

  const handleSwitch = () => {
    // Save preference (for logged-in users, will fail silently if not logged in)
    // Fire-and-forget - don't wait for response
    fetch('/api/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: otherLocale }),
    }).catch(() => {
      // Ignore if not logged in or API fails
    })

    // Use the localized router which properly handles the NEXT_LOCALE cookie
    const targetPath = pathname || '/'
    router.replace(targetPath, { locale: otherLocale })
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleSwitch}
      className="gap-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
    >
      <Globe className="h-4 w-4" />
      <span
        className="hidden sm:inline"
        style={otherLocale === 'km' ? { fontFamily: 'var(--font-kantumruy), sans-serif' } : undefined}
      >
        {otherLocaleName}
      </span>
    </Button>
  )
}
