import type { Metadata } from "next"
import Link from "next/link"
import { Mic, FileText, Type, Download, Moon, Keyboard, ArrowRight, Check, SpellCheck, BookCheck, Sparkles, Zap, Shield, BookOpen, Cloud } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AuthRedirect } from "@/components/auth-redirect"

// Enhanced metadata for SEO
export const metadata: Metadata = {
  title: "Aksara Pro - Khmer Word Processor with Smart Word Breaking & Spell Check",
  description: "The only Khmer text editor with intelligent word segmentation powered by beam search. 77,000+ word dictionary, voice-to-text, grammar standardization, and LibreOffice ODT export.",
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
    title: "Aksara Pro - Khmer Word Processor with Smart Word Breaking",
    description: "Intelligent Khmer text editor with automatic word segmentation, 77,000+ word spell checker, voice input, and ODT export for LibreOffice.",
    type: "website",
    url: "https://aksara.app",
  },
  twitter: {
    card: "summary_large_image",
    title: "Aksara Pro - Khmer Word Processor with Smart Word Breaking",
    description: "Intelligent Khmer text editor with automatic word segmentation, 77,000+ word spell checker, voice input, and ODT export for LibreOffice.",
  },
  alternates: {
    canonical: "https://aksara.app",
  },
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

export default function LandingPage() {
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
                  className="ml-[4px] text-base sm:text-2xl text-slate-600 dark:text-slate-400 leading-none font-medium"
                  style={{ fontFamily: "var(--font-geist-sans), sans" }}
                >
                  Pro
                </span>
              </div>
            </Link>
            <div className="flex items-center gap-2 sm:gap-3">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer">
                  Sign In
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/25 cursor-pointer">
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </nav>
        </header>

        <main>
          {/* Hero Section */}
          <section className="relative overflow-hidden pt-32 sm:pt-40" aria-labelledby="hero-heading">
            {/* Background gradient orbs */}
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-400/20 dark:bg-blue-500/10 rounded-full blur-3xl" aria-hidden="true" />
            <div className="absolute top-40 right-1/4 w-96 h-96 bg-indigo-400/15 dark:bg-indigo-500/10 rounded-full blur-3xl" aria-hidden="true" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-64 bg-gradient-to-t from-blue-100/50 to-transparent dark:from-blue-900/20 blur-2xl" aria-hidden="true" />

            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 relative">
              <div className="text-center max-w-4xl mx-auto">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium mb-8 border border-blue-200/50 dark:border-blue-700/50 shadow-sm">
                  <Sparkles className="w-4 h-4" aria-hidden="true" />
                  Khmer Text That Wraps Correctly
                </div>

                {/* Main headline */}
                <h1 id="hero-heading" className="mb-6">
                  <span
                    className="flex justify-center items-center text-5xl sm:text-7xl mb-6 leading-normal pb-2"
                    style={{ fontFamily: "var(--font-moul), serif" }}
                  >
                    <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 dark:from-blue-400 dark:via-blue-300 dark:to-indigo-400 bg-clip-text text-transparent drop-shadow-sm">អក្សរា</span>
                    <span
                      className="ml-[8px] text-slate-900 dark:text-white relative top-[-2px] font-semibold"
                      style={{ fontFamily: "var(--font-geist-sans), sans" }}
                    >
                      Pro
                    </span>
                  </span>
                  <span className="block text-3xl sm:text-5xl text-slate-900 dark:text-white tracking-tight font-bold">
                    The Khmer Word Processor That Understands Your Language
                  </span>
                </h1>

                {/* Subheadline */}
                <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                  Write with confidence using intelligent word segmentation, instant spell checking, and voice input. Export perfect documents to LibreOffice with proper Khmer line breaks.
                </p>

                {/* CTA buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link href="/signup">
                    <Button size="lg" className="gap-2 text-base px-8 py-6 bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-600/25 transition-all duration-200 hover:shadow-blue-600/40 hover:-translate-y-0.5 cursor-pointer">
                      Start Writing Now
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button size="lg" variant="outline" className="gap-2 text-base px-8 py-6 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200 cursor-pointer">
                      Sign In
                    </Button>
                  </Link>
                </div>

                {/* Trust indicators */}
                <div className="flex flex-wrap items-center justify-center gap-6 mt-10 text-sm text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                      <Check className="h-3 w-3 text-green-600 dark:text-green-400" aria-hidden="true" />
                    </div>
                    <span>No Installation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                      <Check className="h-3 w-3 text-green-600 dark:text-green-400" aria-hidden="true" />
                    </div>
                    <span>Works in Browser</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                      <Check className="h-3 w-3 text-green-600 dark:text-green-400" aria-hidden="true" />
                    </div>
                    <span>Cloud Auto-Save</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Features Bento Grid */}
          <section className="py-20 sm:py-28" aria-labelledby="features-heading">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
              <div className="text-center mb-16">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium mb-4">
                  Features
                </div>
                <h2 id="features-heading" className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
                  Built for Khmer, From the Ground Up
                </h2>
                <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                  Not a translation layer. A word processor engineered for Khmer&apos;s unique orthographic rules.
                </p>
              </div>

              {/* Bento Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {/* Feature 1 - Smart Word Breaking */}
                <article className="group bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/40 dark:to-cyan-950/40 rounded-2xl p-6 border border-blue-100/80 dark:border-blue-900/30 hover:border-blue-200 dark:hover:border-blue-800/50 transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/5 cursor-pointer">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-5 shadow-lg shadow-blue-500/20" aria-hidden="true">
                    <Type className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Beam Search Word Segmentation</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                    Our algorithm analyzes 50,000+ words to find optimal break points. Respects COENG rules, protects compound words, and never breaks incorrectly.
                  </p>
                </article>

                {/* Feature 2 - Spell Check */}
                <article className="group bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/40 dark:to-purple-950/40 rounded-2xl p-6 border border-violet-100/80 dark:border-violet-900/30 hover:border-violet-200 dark:hover:border-violet-800/50 transition-all duration-200 hover:shadow-lg hover:shadow-violet-500/5 cursor-pointer">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center mb-5 shadow-lg shadow-violet-500/20" aria-hidden="true">
                    <SpellCheck className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">77,000+ Word Spell Checker</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                    SymSpell algorithm delivers suggestions in under 200ms. Handles Khmer punctuation correctly and learns your vocabulary over time.
                  </p>
                </article>

                {/* Feature 3 - Voice Input */}
                <article className="group bg-gradient-to-br from-rose-50 to-orange-50 dark:from-rose-950/40 dark:to-orange-950/40 rounded-2xl p-6 border border-rose-100/80 dark:border-rose-900/30 hover:border-rose-200 dark:hover:border-rose-800/50 transition-all duration-200 hover:shadow-lg hover:shadow-rose-500/5 cursor-pointer">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center mb-5 shadow-lg shadow-rose-500/20" aria-hidden="true">
                    <Mic className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Voice Input with Smart Transforms</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                    Dictate naturally in Khmer. Automatic conversion of number words to numerals and voice commands to punctuation marks.
                  </p>
                </article>

                {/* Feature 4 - Grammar Check */}
                <article className="group bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/40 rounded-2xl p-6 border border-indigo-100/80 dark:border-indigo-900/30 hover:border-indigo-200 dark:hover:border-indigo-800/50 transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/5 cursor-pointer">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center mb-5 shadow-lg shadow-indigo-500/20" aria-hidden="true">
                    <BookCheck className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Grammar Standardization</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                    Detects non-standard spellings and suggests official forms. Keeps your writing consistent with accepted orthography.
                  </p>
                </article>

                {/* Feature 5 - ODT Export */}
                <article className="group bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/40 dark:to-green-950/40 rounded-2xl p-6 border border-emerald-100/80 dark:border-emerald-900/30 hover:border-emerald-200 dark:hover:border-emerald-800/50 transition-all duration-200 hover:shadow-lg hover:shadow-emerald-500/5 cursor-pointer">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center mb-5 shadow-lg shadow-emerald-500/20" aria-hidden="true">
                    <Download className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Perfect LibreOffice Export</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                    ODT files with Khmer Mondulkiri font configuration that actually works. Preserves word breaks for proper text rendering.
                  </p>
                </article>

                {/* Feature 6 - Personal Dictionary */}
                <article className="group bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/40 dark:to-yellow-950/40 rounded-2xl p-6 border border-amber-100/80 dark:border-amber-900/30 hover:border-amber-200 dark:hover:border-amber-800/50 transition-all duration-200 hover:shadow-lg hover:shadow-amber-500/5 cursor-pointer">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center mb-5 shadow-lg shadow-amber-500/20" aria-hidden="true">
                    <BookOpen className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Personal Dictionary</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                    Teach Aksara your vocabulary. Force words to join or split, add custom spellings, and sync across all your devices.
                  </p>
                </article>
              </div>

              {/* Secondary features row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 sm:mt-5">
                <article className="group flex items-center gap-4 bg-white dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200/80 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200 hover:shadow-md cursor-pointer">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0" aria-hidden="true">
                    <Cloud className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Cloud Auto-Save</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Never lose your work</p>
                  </div>
                </article>

                <article className="group flex items-center gap-4 bg-white dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200/80 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200 hover:shadow-md cursor-pointer">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0" aria-hidden="true">
                    <Moon className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Dark Mode</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Easy on your eyes</p>
                  </div>
                </article>

                <article className="group flex items-center gap-4 bg-white dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200/80 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200 hover:shadow-md cursor-pointer">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0" aria-hidden="true">
                    <FileText className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Rich Formatting</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Headings, lists, styles</p>
                  </div>
                </article>
              </div>
            </div>
          </section>

          {/* How it Works */}
          <section className="py-20 sm:py-28 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-900" aria-labelledby="how-it-works-heading">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
              <div className="text-center mb-16">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium mb-4">
                  How It Works
                </div>
                <h2 id="how-it-works-heading" className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
                  Start Writing in Seconds
                </h2>
                <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                  No installation. No plugins. Just open your browser and write.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
                <div className="relative text-center group">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-shadow duration-200">
                    <span className="text-2xl font-bold text-white">1</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Type or Speak</h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    Write Khmer text directly or dictate using voice input with automatic punctuation.
                  </p>
                  {/* Connector line */}
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-px bg-gradient-to-r from-blue-300 to-transparent dark:from-blue-700" aria-hidden="true" />
                </div>

                <div className="relative text-center group">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-shadow duration-200">
                    <span className="text-2xl font-bold text-white">2</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Auto Word Segmentation</h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    Aksara inserts invisible word boundaries so text wraps correctly in any application.
                  </p>
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-px bg-gradient-to-r from-blue-300 to-transparent dark:from-blue-700" aria-hidden="true" />
                </div>

                <div className="text-center group">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-shadow duration-200">
                    <span className="text-2xl font-bold text-white">3</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Export & Share</h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    Download as ODT for LibreOffice or copy text with word breaks preserved.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="py-20 sm:py-28 relative overflow-hidden" aria-labelledby="cta-heading">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 dark:from-blue-800 dark:via-blue-900 dark:to-indigo-900" />
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-60" aria-hidden="true" />
            {/* Glow effects */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl" aria-hidden="true" />
            <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-indigo-400/20 rounded-full blur-3xl" aria-hidden="true" />

            <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center relative">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white/90 text-sm font-medium mb-8 border border-white/20 backdrop-blur-sm">
                <Zap className="w-4 h-4" aria-hidden="true" />
                Ready to write better Khmer?
              </div>

              <h2 id="cta-heading" className="text-3xl sm:text-5xl font-bold text-white mb-6">
                Stop Fighting Your Word Processor
              </h2>
              <p className="text-lg sm:text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
                Aksara Pro handles word breaks, spell checking, and formatting so you can focus on what matters: your writing.
              </p>
              <Link href="/editor">
                <Button size="lg" className="gap-2 text-base px-10 py-7 bg-white text-blue-700 hover:bg-blue-50 shadow-xl shadow-black/10 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer">
                  Open the Editor
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>

              {/* Trust indicators */}
              <div className="flex flex-wrap items-center justify-center gap-8 mt-12">
                <div className="flex items-center gap-2 text-blue-100">
                  <div className="w-6 h-6 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center">
                    <Check className="h-4 w-4 text-white" aria-hidden="true" />
                  </div>
                  <span>No Installation</span>
                </div>
                <div className="flex items-center gap-2 text-blue-100">
                  <div className="w-6 h-6 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center">
                    <Check className="h-4 w-4 text-white" aria-hidden="true" />
                  </div>
                  <span>Cloud Sync</span>
                </div>
                <div className="flex items-center gap-2 text-blue-100">
                  <div className="w-6 h-6 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center">
                    <Check className="h-4 w-4 text-white" aria-hidden="true" />
                  </div>
                  <span>LibreOffice Compatible</span>
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200 dark:border-slate-800 py-8 bg-white dark:bg-slate-900">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <Link href="/" className="flex items-center gap-2 group" aria-label="Aksara Pro">
                {/* Logo icon */}
                <div className="relative w-8 h-8 shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white text-lg font-bold leading-none translate-y-[-0.5px] translate-x-[0.5px]">អ</span>
                  </div>
                </div>

                {/* Logo text */}
                <div className="flex items-baseline">
                  <span
                    className="text-lg text-slate-900 dark:text-white leading-none"
                    style={{ fontFamily: "var(--font-moul), serif" }}
                  >
                    អក្សរា
                  </span>
                  <span
                    className="ml-[3px] text-lg text-slate-500 dark:text-slate-400 leading-none"
                    style={{ fontFamily: "var(--font-geist-sans), sans" }}
                  >
                    Pro
                  </span>
                </div>
              </Link>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Khmer Word Processor with Intelligent Word Segmentation
              </p>
            </div>
          </div>
        </footer>
      </div>
    </AuthRedirect>
  )
}
