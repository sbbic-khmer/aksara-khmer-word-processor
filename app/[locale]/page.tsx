import type { Metadata } from "next"
import Image from "next/image"
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Mic, FileText, Type, Download, Moon, ArrowRight, Check, SpellCheck, BookCheck, Sparkles, Zap, BookOpen, Cloud } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AuthRedirect } from "@/components/auth-redirect"
import { Link } from "@/i18n/navigation"
import { routing } from "@/i18n/routing"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ScrollAnimate, FloatingElement, GlowOrb, ParallaxLayer, TextReveal, MagneticButton } from "@/components/ui/scroll-animate"

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
            <Link href="/" className="flex items-center gap-2 group shrink-0" aria-label="Aksara Pro - Home">
              {/* Logo icon */}
              <div className="relative w-8 h-8 sm:w-10 sm:h-10 shrink-0 transition-transform duration-200 group-hover:scale-105">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg sm:rounded-xl shadow-lg shadow-blue-500/25" />
                <div className="absolute inset-0 rounded-lg sm:rounded-xl bg-gradient-to-br from-white/20 via-transparent to-black/5" />
                <div className="absolute inset-[1px] rounded-[7px] sm:rounded-[10px] border border-white/20" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white text-xl sm:text-2xl font-bold leading-none translate-y-[-2px] translate-x-[1px]">អ</span>
                </div>
              </div>

              {/* Logo text - hidden on very small screens, shown on sm+ */}
              <div className="hidden xs:flex items-baseline whitespace-nowrap">
                <span
                  className="text-lg sm:text-2xl text-slate-900 dark:text-white leading-none"
                  style={{ fontFamily: "var(--font-moul), serif" }}
                >
                  អក្សរា
                </span>
                <span
                  className="ml-[3px] sm:ml-[4px] text-lg sm:text-2xl text-slate-900 dark:text-white leading-none font-medium"
                  style={{ fontFamily: "var(--font-geist-sans), sans" }}
                >
                  Pro
                </span>
              </div>
            </Link>
            <div className="flex items-center gap-1 sm:gap-3">
              <LanguageSwitcher />
              <Link href="/login" className="hidden sm:block">
                <Button variant="ghost" size="sm" className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer">
                  {t('nav.signIn')}
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm" className="gap-1 sm:gap-2 px-3 sm:px-4 bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/25 cursor-pointer text-xs sm:text-sm">
                  <span className="hidden sm:inline">{t('nav.getStarted')}</span>
                  <span className="sm:hidden">{t('nav.signIn')}</span>
                  <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </Link>
            </div>
          </nav>
        </header>

        <main>
          {/* Hero Section - 2026 trends: 3D depth, kinetic typography, meaningful motion */}
          <section className="relative overflow-hidden pt-20 sm:pt-28 lg:pt-36 min-h-[75vh] sm:min-h-[85vh] flex items-start sm:items-center" aria-labelledby="hero-heading">
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

            <div className="max-w-6xl mx-auto px-4 sm:px-6 relative w-full">
              <div className="text-center max-w-4xl mx-auto">
                {/* Badge with animated sparkle - extra top margin on mobile */}
                <ScrollAnimate variant="hero-badge" delay={0} duration={400}>
                  <div className="glass-badge inline-flex items-center gap-2 px-4 py-2 rounded-full text-blue-700 dark:text-blue-300 text-sm font-medium mt-4 sm:mt-0 mb-8 sm:mb-8">
                    <Sparkles className="h-4 w-4 animate-pulse" aria-hidden="true" />
                    {t('hero.badge')}
                  </div>
                </ScrollAnimate>

                {/* Giant brand name - 2026 Aurora gradient text effect */}
                <ScrollAnimate variant="hero-title" delay={50} duration={500}>
                  <ParallaxLayer depth={0.1} maxOffset={15}>
                    <div className={`relative ${locale === 'km' ? 'mb-8 sm:mb-10' : 'mb-6 sm:mb-8'}`}>
                      {/* Deep shadow layer - furthest back */}
                      <div className="absolute inset-0 pointer-events-none translate-y-2" aria-hidden="true">
                        <div className="inline-flex items-baseline">
                          <span
                            className="text-5xl xs:text-6xl sm:text-7xl lg:text-8xl text-blue-900/20 dark:text-blue-950/40 blur-3xl tracking-tight leading-[1.4] pr-2 sm:pr-3"
                            style={{ fontFamily: "var(--font-moul), serif" }}
                          >
                            អក្សរា
                          </span>
                          <span
                            className="text-5xl xs:text-6xl sm:text-7xl lg:text-8xl text-slate-900/15 dark:text-slate-950/30 blur-3xl font-semibold tracking-tight leading-none"
                            style={{ fontFamily: "var(--font-geist-sans), sans" }}
                          >
                            Pro
                          </span>
                        </div>
                      </div>
                      {/* Glow layer - middle */}
                      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                        <div className="inline-flex items-baseline">
                          <span
                            className="text-5xl xs:text-6xl sm:text-7xl lg:text-8xl text-blue-500/40 dark:text-blue-400/30 blur-2xl tracking-tight leading-[1.4] pr-2 sm:pr-3"
                            style={{ fontFamily: "var(--font-moul), serif" }}
                          >
                            អក្សរា
                          </span>
                          <span
                            className="text-5xl xs:text-6xl sm:text-7xl lg:text-8xl text-indigo-400/25 dark:text-indigo-300/15 blur-2xl font-semibold tracking-tight leading-none"
                            style={{ fontFamily: "var(--font-geist-sans), sans" }}
                          >
                            Pro
                          </span>
                        </div>
                      </div>
                      {/* Main text with animated gradient */}
                      <div className="relative inline-flex items-baseline drop-shadow-lg">
                        <span
                          className="text-5xl xs:text-6xl sm:text-7xl lg:text-8xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 dark:from-blue-400 dark:via-indigo-400 dark:to-violet-400 bg-clip-text text-transparent tracking-tight leading-[1.4] animate-gradient-x bg-[length:200%_auto] pr-2 sm:pr-3"
                          style={{ fontFamily: "var(--font-moul), serif" }}
                        >
                          អក្សរា
                        </span>
                        <span
                          className="text-5xl xs:text-6xl sm:text-7xl lg:text-8xl bg-gradient-to-r from-slate-800 via-slate-700 to-slate-900 dark:from-white dark:via-slate-100 dark:to-white bg-clip-text text-transparent font-semibold tracking-tight leading-none drop-shadow-sm"
                          style={{ fontFamily: "var(--font-geist-sans), sans" }}
                        >
                          Pro
                        </span>
                      </div>
                    </div>
                  </ParallaxLayer>
                </ScrollAnimate>

                {/* Headline - the identity-affirming message */}
                <ScrollAnimate variant="zoom-blur" delay={150} duration={400}>
                  <h1 id="hero-heading" className={locale === 'km' ? 'mb-8 sm:mb-10' : 'mb-6 sm:mb-8'}>
                    <span className={`block text-3xl sm:text-4xl lg:text-5xl text-slate-800 dark:text-slate-100 tracking-tight font-semibold ${locale === 'km' ? 'leading-[1.6]' : 'leading-[1.3]'}`}>
                      {t('hero.headline')}
                    </span>
                  </h1>
                </ScrollAnimate>

                {/* Subheadline - the problem/solution */}
                <ScrollAnimate variant="fade-up" delay={200} duration={350}>
                  <p className={`text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-10 sm:mb-12 ${locale === 'km' ? 'leading-[1.9]' : 'leading-[1.7]'}`}>
                    {t('hero.subheadline')}
                  </p>
                </ScrollAnimate>

                {/* CTA buttons with magnetic hover effect */}
                <ScrollAnimate variant="scale" delay={250} duration={350}>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <MagneticButton strength={0.2}>
                      <Link href="/signup">
                        <div className="relative group">
                          {/* Subtle glow behind button - appears on hover */}
                          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 rounded-xl blur opacity-0 group-hover:opacity-40 transition-opacity duration-300" aria-hidden="true" />
                          <Button size="lg" className="relative gap-2 text-base px-10 py-7 bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 hover:from-blue-700 hover:via-blue-700 hover:to-indigo-700 text-white shadow-xl shadow-blue-600/30 transition-all duration-300 hover:shadow-blue-600/50 cursor-pointer rounded-xl">
                            {t('hero.ctaStart')}
                            <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                          </Button>
                        </div>
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
                <ScrollAnimate variant="fade-up" delay={400} duration={350}>
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

                {/* Editor Screenshot - 2026 Elevated Product Showcase */}
                <ScrollAnimate variant="scale" delay={250} duration={400}>
                  <div className="mt-10 sm:mt-14 lg:mt-20 relative max-w-5xl mx-auto">
                    {/* Ambient glow layers - creates depth */}
                    <div className="absolute -inset-4 sm:-inset-8 bg-gradient-to-r from-blue-500/30 via-indigo-500/30 to-violet-500/30 rounded-[32px] sm:rounded-[48px] blur-3xl opacity-60 dark:opacity-40" aria-hidden="true" />
                    <div className="absolute -inset-2 sm:-inset-4 bg-gradient-to-br from-blue-400/20 via-transparent to-purple-400/20 rounded-[28px] sm:rounded-[40px] blur-2xl" aria-hidden="true" />

                    {/* Outer frame with gradient border */}
                    <div className="relative rounded-2xl sm:rounded-3xl p-[1.5px] bg-gradient-to-br from-white/60 via-blue-200/40 to-violet-200/60 dark:from-slate-600/60 dark:via-blue-500/40 dark:to-violet-500/60 shadow-2xl shadow-blue-900/20 dark:shadow-blue-500/10">
                      {/* Main window container */}
                      <div className="relative bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-[15px] sm:rounded-[23px] overflow-hidden">
                        {/* macOS-style window header */}
                        <div className="flex items-center px-4 py-3 bg-gradient-to-b from-slate-50 to-slate-100/80 dark:from-slate-800 dark:to-slate-850/80 border-b border-slate-200/60 dark:border-slate-700/60">
                          {/* Traffic lights */}
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-[#FF5F57] shadow-sm shadow-red-500/30" />
                            <div className="w-3 h-3 rounded-full bg-[#FFBD2E] shadow-sm shadow-yellow-500/30" />
                            <div className="w-3 h-3 rounded-full bg-[#28CA41] shadow-sm shadow-green-500/30" />
                          </div>

                          {/* Centered tab/title area */}
                          <div className="flex-1 flex justify-center">
                            <div className="flex items-center gap-2 px-4 py-1 bg-white dark:bg-slate-800 rounded-md border border-slate-200/80 dark:border-slate-700/80 shadow-inner">
                              <div className="w-3 h-3 rounded-full bg-green-500 flex items-center justify-center">
                                <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">aksara.app/editor</span>
                            </div>
                          </div>

                          {/* Right side balance */}
                          <div className="w-[52px]" />
                        </div>

                        {/* Screenshot with subtle inner shadow */}
                        <div className="relative">
                          <Image
                            src={locale === 'km' ? '/aksaraproeditor-khmer.webp' : '/aksaraproeditor-english.webp'}
                            alt={locale === 'km' ? 'Aksara Pro កម្មវិធីកែអក្សរខ្មែរ' : 'Aksara Pro Khmer word processor interface'}
                            width={1920}
                            height={1080}
                            className="w-full h-auto"
                            priority
                            quality={90}
                          />
                          {/* Inner edge shadow for depth */}
                          <div className="absolute inset-0 rounded-b-[15px] sm:rounded-b-[23px] shadow-[inset_0_0_20px_rgba(0,0,0,0.03)] dark:shadow-[inset_0_0_20px_rgba(0,0,0,0.1)] pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    {/* Reflection/shadow below */}
                    <div className="absolute -bottom-8 left-[10%] right-[10%] h-16 bg-gradient-to-b from-slate-900/15 via-slate-900/5 to-transparent dark:from-blue-500/10 dark:to-transparent blur-xl rounded-full" aria-hidden="true" />
                  </div>
                </ScrollAnimate>
              </div>
            </div>

            {/* Smooth gradient transition to next section */}
            <div className="absolute bottom-0 left-0 right-0 h-32 sm:h-48 bg-gradient-to-b from-transparent via-slate-50/50 to-slate-50 dark:via-slate-900/50 dark:to-slate-900 pointer-events-none" aria-hidden="true" />
          </section>

          {/* Features Bento Grid - with parallax and kinetic typography */}
          <section className="py-16 sm:py-24 lg:py-32 relative overflow-hidden bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950" aria-labelledby="features-heading">
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
              <ScrollAnimate variant="hero-title" duration={450}>
                <div className="text-center mb-20">
                  <ScrollAnimate variant="hero-badge" delay={0} duration={350}>
                    <div className="glass-badge inline-flex items-center gap-2 px-4 py-2 rounded-full text-blue-700 dark:text-blue-300 text-sm font-medium mb-6">
                      {t('features.badge')}
                    </div>
                  </ScrollAnimate>
                  <TextReveal
                    text={t('features.headline')}
                    className={`text-3xl sm:text-5xl font-bold text-slate-900 dark:text-white ${locale === 'km' ? 'mb-8 leading-[1.5]' : 'mb-5'}`}
                    wordDelay={40}
                    initialDelay={50}
                    duration={350}
                    as="h2"
                  />
                  <ScrollAnimate variant="zoom-blur" delay={150} duration={350}>
                    <p className={`text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto ${locale === 'km' ? 'leading-[1.9]' : ''}`}>
                      {t('features.subheadline')}
                    </p>
                  </ScrollAnimate>
                </div>
              </ScrollAnimate>

              {/* Bento Grid with staggered 3D reveals */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                {/* Feature 1 - Smart Word Breaking */}
                <ScrollAnimate variant="zoom-blur" delay={0} duration={350}>
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
                <ScrollAnimate variant="zoom-blur" delay={50} duration={350}>
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
                <ScrollAnimate variant="zoom-blur" delay={100} duration={350}>
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
                <ScrollAnimate variant="zoom-blur" delay={50} duration={350}>
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
                <ScrollAnimate variant="zoom-blur" delay={100} duration={350}>
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
                <ScrollAnimate variant="zoom-blur" delay={150} duration={350}>
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
                <ScrollAnimate variant="fade-left" delay={0} duration={350}>
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

                <ScrollAnimate variant="fade-up" delay={50} duration={350}>
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

                <ScrollAnimate variant="fade-right" delay={100} duration={350}>
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
              <ScrollAnimate variant="hero-title" duration={450}>
                <div className="text-center mb-20">
                  <ScrollAnimate variant="hero-badge" delay={0} duration={350}>
                    <div className="glass-badge inline-flex items-center gap-2 px-4 py-2 rounded-full text-blue-700 dark:text-blue-300 text-sm font-medium mb-6">
                      {t('howItWorks.badge')}
                    </div>
                  </ScrollAnimate>
                  <TextReveal
                    text={t('howItWorks.headline')}
                    className={`text-3xl sm:text-5xl font-bold text-slate-900 dark:text-white ${locale === 'km' ? 'mb-8 leading-[1.5]' : 'mb-5'}`}
                    wordDelay={40}
                    initialDelay={50}
                    duration={350}
                    as="h2"
                  />
                  <ScrollAnimate variant="zoom-blur" delay={150} duration={350}>
                    <p className={`text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto ${locale === 'km' ? 'leading-[1.9]' : ''}`}>
                      {t('howItWorks.subheadline')}
                    </p>
                  </ScrollAnimate>
                </div>
              </ScrollAnimate>

              <div className="grid md:grid-cols-3 gap-8 lg:gap-16 relative">
                {/* Animated connector line */}
                <div className="hidden md:block absolute top-10 left-[20%] right-[20%] h-1 overflow-hidden" aria-hidden="true">
                  <ScrollAnimate variant="fade" delay={150} duration={500}>
                    <div className="h-full bg-gradient-to-r from-blue-400 via-indigo-400 to-blue-400 dark:from-blue-600 dark:via-indigo-600 dark:to-blue-600 rounded-full animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
                  </ScrollAnimate>
                </div>

                <ScrollAnimate variant="scale" delay={0} duration={350}>
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

                <ScrollAnimate variant="scale" delay={75} duration={350}>
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

                <ScrollAnimate variant="scale" delay={150} duration={350}>
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
                <ScrollAnimate variant="hero-badge" delay={0} duration={400}>
                  <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/15 backdrop-blur-md text-white text-sm font-medium mb-10 border border-white/25 shadow-lg shadow-black/10">
                    <Zap className="w-4 h-4 animate-pulse" aria-hidden="true" />
                    {t('cta.badge')}
                  </div>
                </ScrollAnimate>

                <ScrollAnimate variant="hero-title" delay={50} duration={450}>
                  <TextReveal
                    text={t('cta.headline')}
                    className={`text-4xl sm:text-6xl font-bold text-white ${locale === 'km' ? 'mb-10 leading-[1.4]' : 'mb-8'}`}
                    wordDelay={50}
                    initialDelay={100}
                    duration={350}
                    as="h2"
                  />
                </ScrollAnimate>

                <ScrollAnimate variant="zoom-blur" delay={200} duration={350}>
                  <p className={`text-lg sm:text-xl text-blue-100/90 mb-12 max-w-2xl mx-auto ${locale === 'km' ? 'leading-[1.9]' : 'leading-relaxed'}`}>
                    {t('cta.subheadline')}
                  </p>
                </ScrollAnimate>

                <ScrollAnimate variant="scale" delay={300} duration={350}>
                  <MagneticButton strength={0.25}>
                    <Link href="/signup">
                      <Button size="lg" className="group gap-3 text-lg px-12 py-8 bg-white text-blue-700 hover:bg-blue-50 shadow-2xl shadow-black/20 transition-all duration-300 hover:shadow-black/30 cursor-pointer rounded-2xl font-semibold">
                        {t('cta.button')}
                        <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                      </Button>
                    </Link>
                  </MagneticButton>
                </ScrollAnimate>

                {/* Trust indicators with staggered entrance */}
                <ScrollAnimate variant="fade-up" delay={400} duration={350}>
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
                    <a
                      href="/privacy"
                      className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      {t('footer.privacy')}
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
