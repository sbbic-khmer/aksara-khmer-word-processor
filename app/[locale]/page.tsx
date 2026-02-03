import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Mic, FileText, Type, Download, Moon, ArrowRight, Check, SpellCheck, BookCheck, Sparkles, Zap, BookOpen, Cloud } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AuthRedirect } from "@/components/auth-redirect"
import { Link } from "@/i18n/navigation"
import { routing } from "@/i18n/routing"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ScrollAnimate, FloatingElement, GlowOrb, ParallaxLayer, TextReveal, MagneticButton, ShimmerText } from "@/components/ui/scroll-animate"

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'meta' })

  return {
    title: t('title'),
    description: t('description'),
    keywords: [
      "Khmer word processor",
      "Khmer typing",
      "Khmer spell checker",
      "Khmer voice to text",
      "Cambodian word processor",
      "Khmer text editor",
      "Khmer grammar checker",
      "LibreOffice Khmer",
      "Khmer word segmentation",
      "Khmer document editor",
      "Khmer line breaking",
    ],
    openGraph: {
      title: t('title'),
      description: t('description'),
      type: "website",
      url: "https://aksara.app",
    },
    twitter: {
      card: "summary_large_image",
      title: t('title'),
      description: t('description'),
    },
    alternates: {
      canonical: locale === 'en' ? 'https://aksara.app' : `https://aksara.app/${locale}`,
      languages: {
        'en': 'https://aksara.app',
        'km': 'https://aksara.app/km',
      },
    },
  }
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

// JSON-LD structured data for rich search results
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Aksara Pro",
  applicationCategory: "ProductivityApplication",
  operatingSystem: "Web Browser",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  description: "Khmer word processor with intelligent word segmentation using beam search algorithm, 77,000+ word spell checker, voice-to-text input, grammar standardization, and ODT export for LibreOffice.",
  featureList: [
    "Beam search word segmentation with 50,000+ word dictionary",
    "SymSpell spell checker with 77,000+ Khmer words",
    "Voice-to-text with smart punctuation",
    "Grammar standardization checker",
    "ODT export for LibreOffice",
    "Personal dictionary customization",
    "Cloud auto-save",
  ],
  inLanguage: ["km", "en"],
  url: "https://aksara.app",
}

export default async function LandingPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('landing')
  const tMeta = await getTranslations('meta')

  return (
    <AuthRedirect>
      <div className="min-h-screen bg-gradient-to-b from-blue-50/50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        {/* JSON-LD structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        {/* Floating Header */}
        <header className="fixed top-4 left-4 right-4 z-50">
          <nav
            className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg shadow-slate-900/5 dark:shadow-slate-900/30"
            aria-label="Main navigation"
          >
            <Link href="/" className="flex items-center gap-2 group" aria-label="Aksara Pro - Home">
              {/* Logo icon */}
              <div className="relative w-10 h-10 shrink-0 transition-transform duration-200 group-hover:scale-105">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg shadow-blue-500/25" />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 via-transparent to-black/5" />
                <div className="absolute inset-[1px] rounded-[10px] border border-white/20" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white text-2xl font-bold leading-none translate-y-[-2px] translate-x-[1px]">អ</span>
                </div>
              </div>

              {/* Logo text */}
              <div className="flex items-baseline">
                <span
                  className="text-xl sm:text-2xl text-slate-900 dark:text-white leading-none"
                  style={{ fontFamily: "var(--font-moul), serif" }}
                >
                  អក្សរា
                </span>
                <span
                  className="ml-[4px] text-base sm:text-2xl text-slate-900 dark:text-white leading-none font-medium"
                  style={{ fontFamily: "var(--font-geist-sans), sans" }}
                >
                  Pro
                </span>
              </div>
            </Link>
            <div className="flex items-center gap-2 sm:gap-3">
              <LanguageSwitcher />
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer">
                  {t('nav.signIn')}
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/25 cursor-pointer">
                  {t('nav.getStarted')}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </nav>
        </header>

        <main>
          {/* Hero Section - 2026 trends: 3D depth, kinetic typography, meaningful motion */}
          <section className="relative overflow-hidden pt-32 sm:pt-40 min-h-[90vh] flex items-center" aria-labelledby="hero-heading">
            {/* Layered parallax background for 3D depth effect */}
            <ParallaxLayer depth={0.2} maxOffset={40} className="absolute inset-0 pointer-events-none">
              <GlowOrb
                color="blue"
                size="xl"
                intensity="strong"
                floatAmplitude={25}
                floatDuration={12}
                pulseScale={1.2}
                className="top-[-150px] left-[5%]"
              />
            </ParallaxLayer>

            <ParallaxLayer depth={0.4} maxOffset={50} className="absolute inset-0 pointer-events-none">
              <GlowOrb
                color="indigo"
                size="lg"
                intensity="medium"
                floatAmplitude={30}
                floatDuration={15}
                pulseScale={1.25}
                className="top-20 right-[10%]"
              />
            </ParallaxLayer>

            <ParallaxLayer depth={0.15} maxOffset={25} className="absolute inset-0 pointer-events-none">
              <GlowOrb
                color="cyan"
                size="md"
                intensity="subtle"
                floatAmplitude={20}
                floatDuration={10}
                className="top-[60%] left-[8%]"
              />
              <GlowOrb
                color="purple"
                size="sm"
                intensity="subtle"
                floatAmplitude={15}
                floatDuration={8}
                className="top-[30%] right-[5%]"
              />
            </ParallaxLayer>

            {/* Central spotlight glow */}
            <div className="absolute top-1/2 left-1/2 w-[1000px] h-[600px] bg-gradient-radial from-blue-400/25 via-blue-400/10 to-transparent dark:from-blue-500/20 dark:via-blue-500/5 blur-3xl animate-spotlight" aria-hidden="true" />

            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 relative w-full">
              <div className="text-center max-w-4xl mx-auto">
                {/* Badge with bounce entrance */}
                <ScrollAnimate variant="hero-badge" delay={0} duration={800}>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50/90 dark:bg-blue-900/50 backdrop-blur-md text-blue-700 dark:text-blue-300 text-sm font-medium mb-8 border border-blue-200/60 dark:border-blue-700/50 shadow-lg shadow-blue-500/15">
                    <Sparkles className="w-4 h-4 animate-pulse" aria-hidden="true" />
                    {t('hero.badge')}
                  </div>
                </ScrollAnimate>

                {/* Main headline with dramatic 3D reveal */}
                <ParallaxLayer depth={0.05} maxOffset={15}>
                  <ScrollAnimate variant="hero-title" delay={100} duration={1200}>
                    <h1 id="hero-heading" className="mb-8">
                      {/* Brand name with shimmer effect */}
                      <span
                        className="flex justify-center items-center text-6xl sm:text-8xl mb-8 leading-normal"
                        style={{ fontFamily: "var(--font-moul), serif" }}
                      >
                        <ShimmerText className="from-blue-600 via-indigo-500 to-blue-600 dark:from-blue-400 dark:via-indigo-300 dark:to-blue-400 drop-shadow-lg">
                          អក្សរា
                        </ShimmerText>
                        <span
                          className="ml-3 mb-2 text-slate-900 dark:text-white font-bold relative"
                          style={{ fontFamily: "var(--font-geist-sans), sans" }}
                        >
                          Pro
                        </span>
                      </span>

                      {/* Tagline with word-by-word kinetic reveal */}
                      <TextReveal
                        text={t('hero.headline')}
                        className="block text-3xl sm:text-5xl text-slate-900 dark:text-white tracking-tight font-bold"
                        wordDelay={100}
                        initialDelay={400}
                        duration={700}
                        as="span"
                      />
                    </h1>
                  </ScrollAnimate>
                </ParallaxLayer>

                {/* Subheadline with blur reveal */}
                <ScrollAnimate variant="zoom-blur" delay={800} duration={800}>
                  <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed">
                    {t('hero.subheadline')}
                  </p>
                </ScrollAnimate>

                {/* CTA buttons with magnetic hover effect */}
                <ScrollAnimate variant="scale" delay={1000} duration={700}>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <MagneticButton strength={0.2}>
                      <Link href="/signup">
                        <Button size="lg" className="group gap-2 text-base px-10 py-7 bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 hover:from-blue-700 hover:via-blue-700 hover:to-indigo-700 text-white shadow-2xl shadow-blue-600/40 transition-all duration-300 hover:shadow-blue-600/60 cursor-pointer rounded-xl">
                          {t('hero.ctaStart')}
                          <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                        </Button>
                      </Link>
                    </MagneticButton>
                    <MagneticButton strength={0.15}>
                      <Link href="/login">
                        <Button size="lg" variant="outline" className="gap-2 text-base px-10 py-7 border-slate-300/80 dark:border-slate-600/80 text-slate-700 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-800/50 transition-all duration-300 cursor-pointer backdrop-blur-md rounded-xl shadow-lg shadow-slate-900/5">
                          {t('hero.ctaSignIn')}
                        </Button>
                      </Link>
                    </MagneticButton>
                  </div>
                </ScrollAnimate>

                {/* Trust indicators with staggered fade */}
                <ScrollAnimate variant="fade-up" delay={1200} duration={600}>
                  <div className="flex flex-wrap items-center justify-center gap-8 mt-12 text-sm text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-2 transition-all duration-200 hover:scale-105 hover:text-slate-700 dark:hover:text-slate-300">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/50 dark:to-emerald-900/50 flex items-center justify-center shadow-md shadow-green-500/10">
                        <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" aria-hidden="true" />
                      </div>
                      <span>{t('hero.trustNoInstall')}</span>
                    </div>
                    <div className="flex items-center gap-2 transition-all duration-200 hover:scale-105 hover:text-slate-700 dark:hover:text-slate-300">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/50 dark:to-emerald-900/50 flex items-center justify-center shadow-md shadow-green-500/10">
                        <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" aria-hidden="true" />
                      </div>
                      <span>{t('hero.trustBrowser')}</span>
                    </div>
                    <div className="flex items-center gap-2 transition-all duration-200 hover:scale-105 hover:text-slate-700 dark:hover:text-slate-300">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/50 dark:to-emerald-900/50 flex items-center justify-center shadow-md shadow-green-500/10">
                        <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" aria-hidden="true" />
                      </div>
                      <span>{t('hero.trustCloud')}</span>
                    </div>
                  </div>
                </ScrollAnimate>
              </div>
            </div>
          </section>

          {/* Features Bento Grid - with parallax and kinetic typography */}
          <section className="py-24 sm:py-32 relative overflow-hidden" aria-labelledby="features-heading">
            {/* Subtle background decoration */}
            <div className="absolute inset-0 pointer-events-none">
              <ParallaxLayer depth={0.1} maxOffset={20}>
                <div className="absolute top-20 right-[10%] w-64 h-64 bg-blue-400/10 dark:bg-blue-500/5 rounded-full blur-3xl" />
              </ParallaxLayer>
              <ParallaxLayer depth={0.15} maxOffset={25}>
                <div className="absolute bottom-40 left-[5%] w-48 h-48 bg-violet-400/10 dark:bg-violet-500/5 rounded-full blur-3xl" />
              </ParallaxLayer>
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 relative">
              <ScrollAnimate variant="hero-title" duration={900}>
                <div className="text-center mb-20">
                  <ScrollAnimate variant="hero-badge" delay={0} duration={700}>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100/80 dark:bg-blue-900/40 backdrop-blur-sm text-blue-700 dark:text-blue-300 text-sm font-medium mb-6 border border-blue-200/50 dark:border-blue-700/50 shadow-md">
                      {t('features.badge')}
                    </div>
                  </ScrollAnimate>
                  <TextReveal
                    text={t('features.headline')}
                    className="text-3xl sm:text-5xl font-bold text-slate-900 dark:text-white mb-5"
                    wordDelay={60}
                    initialDelay={100}
                    duration={600}
                    as="h2"
                  />
                  <ScrollAnimate variant="zoom-blur" delay={400} duration={700}>
                    <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                      {t('features.subheadline')}
                    </p>
                  </ScrollAnimate>
                </div>
              </ScrollAnimate>

              {/* Bento Grid with staggered 3D reveals */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                {/* Feature 1 - Smart Word Breaking */}
                <ScrollAnimate variant="zoom-blur" delay={0} duration={600}>
                  <MagneticButton strength={0.08} className="block h-full">
                    <article className="group h-full bg-gradient-to-br from-blue-50/90 to-cyan-50/90 dark:from-blue-950/50 dark:to-cyan-950/50 backdrop-blur-sm rounded-2xl p-7 border border-blue-100/80 dark:border-blue-900/40 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/15 cursor-pointer">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-6 shadow-xl shadow-blue-500/25 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300" aria-hidden="true">
                        <Type className="h-7 w-7 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{t('features.wordBreaking.title')}</h3>
                      <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                        {t('features.wordBreaking.description')}
                      </p>
                    </article>
                  </MagneticButton>
                </ScrollAnimate>

                {/* Feature 2 - Spell Check */}
                <ScrollAnimate variant="zoom-blur" delay={80} duration={600}>
                  <MagneticButton strength={0.08} className="block h-full">
                    <article className="group h-full bg-gradient-to-br from-violet-50/90 to-purple-50/90 dark:from-violet-950/50 dark:to-purple-950/50 backdrop-blur-sm rounded-2xl p-7 border border-violet-100/80 dark:border-violet-900/40 hover:border-violet-300 dark:hover:border-violet-700 transition-all duration-300 hover:shadow-2xl hover:shadow-violet-500/15 cursor-pointer">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center mb-6 shadow-xl shadow-violet-500/25 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300" aria-hidden="true">
                        <SpellCheck className="h-7 w-7 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{t('features.spellCheck.title')}</h3>
                      <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                        {t('features.spellCheck.description')}
                      </p>
                    </article>
                  </MagneticButton>
                </ScrollAnimate>

                {/* Feature 3 - Voice Input */}
                <ScrollAnimate variant="zoom-blur" delay={160} duration={600}>
                  <MagneticButton strength={0.08} className="block h-full">
                    <article className="group h-full bg-gradient-to-br from-rose-50/90 to-orange-50/90 dark:from-rose-950/50 dark:to-orange-950/50 backdrop-blur-sm rounded-2xl p-7 border border-rose-100/80 dark:border-rose-900/40 hover:border-rose-300 dark:hover:border-rose-700 transition-all duration-300 hover:shadow-2xl hover:shadow-rose-500/15 cursor-pointer">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center mb-6 shadow-xl shadow-rose-500/25 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300" aria-hidden="true">
                        <Mic className="h-7 w-7 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{t('features.voiceInput.title')}</h3>
                      <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                        {t('features.voiceInput.description')}
                      </p>
                    </article>
                  </MagneticButton>
                </ScrollAnimate>

                {/* Feature 4 - Grammar Check */}
                <ScrollAnimate variant="zoom-blur" delay={80} duration={600}>
                  <MagneticButton strength={0.08} className="block h-full">
                    <article className="group h-full bg-gradient-to-br from-indigo-50/90 to-blue-50/90 dark:from-indigo-950/50 dark:to-blue-950/50 backdrop-blur-sm rounded-2xl p-7 border border-indigo-100/80 dark:border-indigo-900/40 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/15 cursor-pointer">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center mb-6 shadow-xl shadow-indigo-500/25 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300" aria-hidden="true">
                        <BookCheck className="h-7 w-7 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{t('features.grammarCheck.title')}</h3>
                      <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                        {t('features.grammarCheck.description')}
                      </p>
                    </article>
                  </MagneticButton>
                </ScrollAnimate>

                {/* Feature 5 - ODT Export */}
                <ScrollAnimate variant="zoom-blur" delay={160} duration={600}>
                  <MagneticButton strength={0.08} className="block h-full">
                    <article className="group h-full bg-gradient-to-br from-emerald-50/90 to-green-50/90 dark:from-emerald-950/50 dark:to-green-950/50 backdrop-blur-sm rounded-2xl p-7 border border-emerald-100/80 dark:border-emerald-900/40 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/15 cursor-pointer">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center mb-6 shadow-xl shadow-emerald-500/25 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300" aria-hidden="true">
                        <Download className="h-7 w-7 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{t('features.odtExport.title')}</h3>
                      <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                        {t('features.odtExport.description')}
                      </p>
                    </article>
                  </MagneticButton>
                </ScrollAnimate>

                {/* Feature 6 - Personal Dictionary */}
                <ScrollAnimate variant="zoom-blur" delay={240} duration={600}>
                  <MagneticButton strength={0.08} className="block h-full">
                    <article className="group h-full bg-gradient-to-br from-amber-50/90 to-yellow-50/90 dark:from-amber-950/50 dark:to-yellow-950/50 backdrop-blur-sm rounded-2xl p-7 border border-amber-100/80 dark:border-amber-900/40 hover:border-amber-300 dark:hover:border-amber-700 transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/15 cursor-pointer">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center mb-6 shadow-xl shadow-amber-500/25 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300" aria-hidden="true">
                        <BookOpen className="h-7 w-7 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{t('features.personalDictionary.title')}</h3>
                      <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                        {t('features.personalDictionary.description')}
                      </p>
                    </article>
                  </MagneticButton>
                </ScrollAnimate>
              </div>

              {/* Secondary features row with slide-in effect */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                <ScrollAnimate variant="fade-left" delay={100} duration={500}>
                  <article className="group flex items-center gap-4 bg-white/80 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl p-5 border border-slate-200/80 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-300 hover:shadow-lg cursor-pointer">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-md" aria-hidden="true">
                      <Cloud className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm">{t('features.cloudAutoSave.title')}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t('features.cloudAutoSave.description')}</p>
                    </div>
                  </article>
                </ScrollAnimate>

                <ScrollAnimate variant="fade-up" delay={200} duration={500}>
                  <article className="group flex items-center gap-4 bg-white/80 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl p-5 border border-slate-200/80 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-300 hover:shadow-lg cursor-pointer">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-md" aria-hidden="true">
                      <Moon className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm">{t('features.darkMode.title')}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t('features.darkMode.description')}</p>
                    </div>
                  </article>
                </ScrollAnimate>

                <ScrollAnimate variant="fade-right" delay={300} duration={500}>
                  <article className="group flex items-center gap-4 bg-white/80 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl p-5 border border-slate-200/80 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-300 hover:shadow-lg cursor-pointer">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-md" aria-hidden="true">
                      <FileText className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm">{t('features.richFormatting.title')}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t('features.richFormatting.description')}</p>
                    </div>
                  </article>
                </ScrollAnimate>
              </div>
            </div>
          </section>

          {/* How it Works - with animated timeline */}
          <section className="py-24 sm:py-32 bg-gradient-to-b from-slate-50 via-slate-50/50 to-white dark:from-slate-900/50 dark:via-slate-900/30 dark:to-slate-900 relative overflow-hidden" aria-labelledby="how-it-works-heading">
            {/* Background parallax orbs */}
            <ParallaxLayer depth={0.1} maxOffset={30} className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/4 left-[5%] w-40 h-40 bg-blue-400/10 dark:bg-blue-500/5 rounded-full blur-3xl" />
              <div className="absolute bottom-1/4 right-[10%] w-56 h-56 bg-indigo-400/10 dark:bg-indigo-500/5 rounded-full blur-3xl" />
            </ParallaxLayer>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 relative">
              <ScrollAnimate variant="hero-title" duration={900}>
                <div className="text-center mb-20">
                  <ScrollAnimate variant="hero-badge" delay={0} duration={700}>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100/80 dark:bg-blue-900/40 backdrop-blur-sm text-blue-700 dark:text-blue-300 text-sm font-medium mb-6 border border-blue-200/50 dark:border-blue-700/50 shadow-md">
                      {t('howItWorks.badge')}
                    </div>
                  </ScrollAnimate>
                  <TextReveal
                    text={t('howItWorks.headline')}
                    className="text-3xl sm:text-5xl font-bold text-slate-900 dark:text-white mb-5"
                    wordDelay={60}
                    initialDelay={100}
                    duration={600}
                    as="h2"
                  />
                  <ScrollAnimate variant="zoom-blur" delay={400} duration={700}>
                    <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                      {t('howItWorks.subheadline')}
                    </p>
                  </ScrollAnimate>
                </div>
              </ScrollAnimate>

              <div className="grid md:grid-cols-3 gap-8 lg:gap-16 relative">
                {/* Animated connector line */}
                <div className="hidden md:block absolute top-10 left-[20%] right-[20%] h-1 overflow-hidden" aria-hidden="true">
                  <ScrollAnimate variant="fade" delay={400} duration={1000}>
                    <div className="h-full bg-gradient-to-r from-blue-400 via-indigo-400 to-blue-400 dark:from-blue-600 dark:via-indigo-600 dark:to-blue-600 rounded-full animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
                  </ScrollAnimate>
                </div>

                <ScrollAnimate variant="scale" delay={0} duration={700}>
                  <div className="relative text-center group">
                    <MagneticButton strength={0.15}>
                      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-blue-500/30 group-hover:shadow-blue-500/50 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 border-4 border-white/20">
                        <span className="text-3xl font-bold text-white">1</span>
                      </div>
                    </MagneticButton>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">{t('howItWorks.step1.title')}</h3>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                      {t('howItWorks.step1.description')}
                    </p>
                  </div>
                </ScrollAnimate>

                <ScrollAnimate variant="scale" delay={200} duration={700}>
                  <div className="relative text-center group">
                    <MagneticButton strength={0.15}>
                      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-blue-500/30 group-hover:shadow-blue-500/50 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 border-4 border-white/20">
                        <span className="text-3xl font-bold text-white">2</span>
                      </div>
                    </MagneticButton>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">{t('howItWorks.step2.title')}</h3>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                      {t('howItWorks.step2.description')}
                    </p>
                  </div>
                </ScrollAnimate>

                <ScrollAnimate variant="scale" delay={400} duration={700}>
                  <div className="text-center group">
                    <MagneticButton strength={0.15}>
                      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-blue-500/30 group-hover:shadow-blue-500/50 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 border-4 border-white/20">
                        <span className="text-3xl font-bold text-white">3</span>
                      </div>
                    </MagneticButton>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">{t('howItWorks.step3.title')}</h3>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                      {t('howItWorks.step3.description')}
                    </p>
                  </div>
                </ScrollAnimate>
              </div>
            </div>
          </section>

          {/* CTA Section - with immersive parallax */}
          <section className="py-28 sm:py-36 relative overflow-hidden" aria-labelledby="cta-heading">
            {/* Layered gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 dark:from-blue-800 dark:via-blue-900 dark:to-indigo-950" />
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-60" aria-hidden="true" />

            {/* Multi-layer parallax glow effects */}
            <ParallaxLayer depth={0.2} maxOffset={40} className="absolute inset-0 pointer-events-none">
              <GlowOrb color="blue" size="xl" intensity="medium" floatAmplitude={30} floatDuration={12} className="top-[-100px] left-[10%]" />
            </ParallaxLayer>
            <ParallaxLayer depth={0.3} maxOffset={50} className="absolute inset-0 pointer-events-none">
              <GlowOrb color="indigo" size="lg" intensity="subtle" floatAmplitude={25} floatDuration={15} className="bottom-[-50px] right-[15%]" />
            </ParallaxLayer>
            <ParallaxLayer depth={0.15} maxOffset={30} className="absolute inset-0 pointer-events-none">
              <GlowOrb color="cyan" size="md" intensity="subtle" floatAmplitude={20} floatDuration={10} className="top-[30%] right-[5%]" />
            </ParallaxLayer>

            {/* Central spotlight */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-gradient-radial from-white/10 via-white/5 to-transparent blur-3xl animate-spotlight" aria-hidden="true" />

            <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center relative">
              <ParallaxLayer depth={0.05} maxOffset={15}>
                <ScrollAnimate variant="hero-badge" delay={0} duration={800}>
                  <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/15 backdrop-blur-md text-white text-sm font-medium mb-10 border border-white/25 shadow-lg shadow-black/10">
                    <Zap className="w-4 h-4 animate-pulse" aria-hidden="true" />
                    {t('cta.badge')}
                  </div>
                </ScrollAnimate>

                <ScrollAnimate variant="hero-title" delay={100} duration={1000}>
                  <TextReveal
                    text={t('cta.headline')}
                    className="text-4xl sm:text-6xl font-bold text-white mb-8"
                    wordDelay={80}
                    initialDelay={200}
                    duration={600}
                    as="h2"
                  />
                </ScrollAnimate>

                <ScrollAnimate variant="zoom-blur" delay={600} duration={700}>
                  <p className="text-lg sm:text-xl text-blue-100/90 mb-12 max-w-2xl mx-auto leading-relaxed">
                    {t('cta.subheadline')}
                  </p>
                </ScrollAnimate>

                <ScrollAnimate variant="scale" delay={800} duration={600}>
                  <MagneticButton strength={0.25}>
                    <Link href="/editor">
                      <Button size="lg" className="group gap-3 text-lg px-12 py-8 bg-white text-blue-700 hover:bg-blue-50 shadow-2xl shadow-black/20 transition-all duration-300 hover:shadow-black/30 cursor-pointer rounded-2xl font-semibold">
                        {t('cta.button')}
                        <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                      </Button>
                    </Link>
                  </MagneticButton>
                </ScrollAnimate>

                {/* Trust indicators with staggered entrance */}
                <ScrollAnimate variant="fade-up" delay={1000} duration={600}>
                  <div className="flex flex-wrap items-center justify-center gap-8 mt-14">
                    <div className="flex items-center gap-2.5 text-blue-100/90 transition-all duration-200 hover:text-white hover:scale-105">
                      <div className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                        <Check className="h-4 w-4 text-white" aria-hidden="true" />
                      </div>
                      <span>{t('cta.trustNoInstall')}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-blue-100/90 transition-all duration-200 hover:text-white hover:scale-105">
                      <div className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                        <Check className="h-4 w-4 text-white" aria-hidden="true" />
                      </div>
                      <span>{t('cta.trustCloudSync')}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-blue-100/90 transition-all duration-200 hover:text-white hover:scale-105">
                      <div className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                        <Check className="h-4 w-4 text-white" aria-hidden="true" />
                      </div>
                      <span>{t('cta.trustLibreOffice')}</span>
                    </div>
                  </div>
                </ScrollAnimate>
              </ParallaxLayer>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200/50 dark:border-slate-800/50 py-12 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <ScrollAnimate variant="fade-up" duration={500}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
                {/* Logo & Description */}
                <div className="md:col-span-2">
                  <Link href="/" className="flex items-center gap-3 group transition-transform duration-200 hover:scale-105 w-fit" aria-label="Aksara Pro">
                    {/* Logo icon */}
                    <div className="relative w-10 h-10 shrink-0">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/20" />
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 via-transparent to-black/5" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-white text-xl font-bold leading-none translate-y-[-1px] translate-x-[0.5px]">អ</span>
                      </div>
                    </div>

                    {/* Logo text */}
                    <div className="flex items-baseline">
                      <span
                        className="text-xl text-slate-900 dark:text-white leading-none"
                        style={{ fontFamily: "var(--font-moul), serif" }}
                      >
                        អក្សរា
                      </span>
                      <span
                        className="ml-[4px] text-xl text-slate-500 dark:text-slate-400 leading-none font-medium"
                        style={{ fontFamily: "var(--font-geist-sans), sans" }}
                      >
                        Pro
                      </span>
                    </div>
                  </Link>
                  <p className="mt-4 text-sm text-slate-500 dark:text-slate-400 max-w-md">
                    {tMeta('tagline')}
                  </p>
                </div>

                {/* Links */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
                    {t('footer.links')}
                  </h3>
                  <nav className="flex flex-col gap-3">
                    <a
                      href="/blog"
                      className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      Blog
                    </a>
                  </nav>
                </div>
              </div>

              {/* Bottom Bar */}
              <div className="mt-10 pt-6 border-t border-slate-200/50 dark:border-slate-700/50">
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
                  © {new Date().getFullYear()} Aksara Pro. {t('footer.rights')}
                </p>
              </div>
            </ScrollAnimate>
          </div>
        </footer>
      </div>
    </AuthRedirect>
  )
}
