import type { Metadata } from "next"
import Link from "next/link"
import { Mic, FileText, Type, Download, Moon, Keyboard, ArrowRight, Check, SpellCheck, BookCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AuthRedirect } from "@/components/auth-redirect"

// Enhanced metadata for SEO
export const metadata: Metadata = {
  title: "Aksara Pro - Free Khmer Word Processor with Spell Check & Voice Input",
  description: "Write beautiful Khmer documents with automatic word segmentation, voice-to-text, spelling and grammar checkers. Free online Khmer typing tool with ODT export for LibreOffice.",
  keywords: [
    "Khmer word processor",
    "Khmer typing",
    "Khmer spell checker",
    "Khmer voice to text",
    "Cambodian word processor",
    "Khmer text editor",
    "Khmer grammar checker",
    "LibreOffice Khmer",
    "free Khmer typing tool",
    "Khmer document editor",
  ],
  openGraph: {
    title: "Aksara Pro - Free Khmer Word Processor",
    description: "Write beautiful Khmer documents with automatic word segmentation, voice-to-text, and spell checking.",
    type: "website",
    url: "https://aksara.app",
  },
  twitter: {
    card: "summary_large_image",
    title: "Aksara Pro - Free Khmer Word Processor",
    description: "Write beautiful Khmer documents with automatic word segmentation, voice-to-text, and spell checking.",
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
  description: "Free online Khmer word processor with automatic word segmentation, voice-to-text input, spelling and grammar checkers, and ODT export.",
  featureList: [
    "Automatic Khmer word segmentation",
    "Voice-to-text input in Khmer",
    "Khmer spell checker",
    "Khmer grammar checker",
    "ODT export for LibreOffice",
    "Dark mode support",
    "Rich text formatting",
  ],
  inLanguage: ["km", "en"],
  url: "https://aksara.app",
}

export default function LandingPage() {
  return (
    <AuthRedirect>
      <div className="min-h-screen bg-background">
        {/* JSON-LD structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        {/* Header with semantic nav */}
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
          <nav className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between" aria-label="Main navigation">
            <Link href="/" className="flex items-center gap-2" aria-label="Aksara Pro - Home">
              {/* Logo icon */}
              <div className="relative w-10 h-10 shrink-0">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg shadow-blue-500/25" />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 via-transparent to-black/5" />
                <div className="absolute inset-[1px] rounded-[14px] border border-white/20" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white text-2xl font-bold leading-none translate-y-[-2px] translate-x-[1px]">អ</span>
                </div>
              </div>

              {/* Logo text */}
              <div className="flex items-baseline">
                <span
                  className="text-xl sm:text-2xl text-foreground leading-none"
                  style={{ fontFamily: "var(--font-moul), serif" }}
                >
                  អក្សរា
                </span>
                <span
                  className="ml-[4px] text-base sm:text-2xl text-foreground/80 leading-none"
                  style={{ fontFamily: "var(--font-geist-sans), sans" }}
                >
                  Pro
                </span>
              </div>
            </Link>
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/signup">
                <Button variant="default" size="sm" className="gap-2">
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </nav>
        </header>

        <main>
          {/* Hero Section */}
          <section className="relative overflow-hidden" aria-labelledby="hero-heading">
            <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 to-transparent dark:from-blue-950/20" />
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-32 relative">
              <div className="text-center max-w-3xl mx-auto">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium mb-8">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" aria-hidden="true" />
                  Smart Khmer Writing
                </div>

                {/* Main headline - H1 with keywords */}
                <h1 id="hero-heading" className="mb-6">
                  <span
                    className="flex justify-center items-center text-5xl sm:text-7xl mb-4 leading-tight"
                    style={{ fontFamily: "var(--font-moul), serif" }}
                  >
                    <span className="text-primary">អក្សរា</span>
                    <span
                      className="ml-[8px] text-foreground relative top-[-2px]"
                      style={{ fontFamily: "var(--font-geist-sans), sans" }}
                    >
                      Pro
                    </span>
                  </span>
                  <span className="block text-3xl sm:text-5xl text-foreground tracking-tight">
                    Free Khmer Word Processor
                  </span>
                </h1>

                {/* Subheadline with keywords */}
                <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
                  The best free online tool for writing Khmer documents. Features automatic word segmentation,
                  voice-to-text input, Khmer spell checker, and grammar correction.
                  Export to ODT for LibreOffice with proper line-breaking.
                </p>

                {/* CTA buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link href="/signup">
                    <Button size="lg" className="gap-2 text-base px-8 py-6 cursor-pointer">
                      Start Writing Free
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button size="lg" variant="outline" className="gap-2 text-base px-8 py-6 bg-transparent cursor-pointer">
                      Sign In
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Features Grid */}
          <section className="py-20 sm:py-28 bg-muted/30" aria-labelledby="features-heading">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
              <div className="text-center mb-16">
                <h2 id="features-heading" className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                  Everything You Need to Write in Khmer
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Aksara Pro combines powerful features to make Khmer typing effortless and professional.
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Feature 1 - Voice Input */}
                <article className="bg-card rounded-2xl p-6 border border-border hover:border-primary/50 transition-colors cursor-pointer">
                  <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4" aria-hidden="true">
                    <Mic className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Khmer Voice to Text</h3>
                  <p className="text-muted-foreground">
                    Speak naturally in Khmer and watch your words appear on screen. Powered by advanced speech recognition.
                  </p>
                </article>

                {/* Feature 2 - Auto Segmentation */}
                <article className="bg-card rounded-2xl p-6 border border-border hover:border-primary/50 transition-colors cursor-pointer">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4" aria-hidden="true">
                    <Type className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Smart Word Segmentation</h3>
                  <p className="text-muted-foreground">
                    Automatic Khmer word breaking using zero-width spaces. Your text will wrap correctly in any application.
                  </p>
                </article>

                {/* Feature 3 - Formatting */}
                <article className="bg-card rounded-2xl p-6 border border-border hover:border-primary/50 transition-colors cursor-pointer">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4" aria-hidden="true">
                    <FileText className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Rich Text Formatting</h3>
                  <p className="text-muted-foreground">
                    Bold, italic, underline, headings, and lists. All the formatting tools you need for professional Khmer documents.
                  </p>
                </article>

                {/* Feature 4 - ODT Export */}
                <article className="bg-card rounded-2xl p-6 border border-border hover:border-primary/50 transition-colors cursor-pointer">
                  <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4" aria-hidden="true">
                    <Download className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">LibreOffice ODT Export</h3>
                  <p className="text-muted-foreground">
                    Export to OpenDocument format with preserved formatting. Works perfectly with LibreOffice and other office suites.
                  </p>
                </article>

                {/* Feature 5 - Dark Mode */}
                <article className="bg-card rounded-2xl p-6 border border-border hover:border-primary/50 transition-colors cursor-pointer">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4" aria-hidden="true">
                    <Moon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Dark Mode Support</h3>
                  <p className="text-muted-foreground">
                    Easy on the eyes with a beautiful dark theme. Switch between light and dark modes with one click.
                  </p>
                </article>

                {/* Feature 6 - Spell Check */}
                <article className="bg-card rounded-2xl p-6 border border-border hover:border-primary/50 transition-colors cursor-pointer">
                  <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4" aria-hidden="true">
                    <SpellCheck className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Khmer Spell Checker</h3>
                  <p className="text-muted-foreground">
                    Real-time Khmer spell checking with a comprehensive dictionary. Misspelled words are underlined with one-click corrections.
                  </p>
                </article>

                {/* Feature 7 - Grammar Check */}
                <article className="bg-card rounded-2xl p-6 border border-border hover:border-primary/50 transition-colors cursor-pointer">
                  <div className="w-12 h-12 rounded-xl bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center mb-4" aria-hidden="true">
                    <BookCheck className="h-6 w-6 text-sky-600 dark:text-sky-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Khmer Grammar Checker</h3>
                  <p className="text-muted-foreground">
                    Identifies non-standard Khmer spellings and suggests the official standardized form for consistent orthography.
                  </p>
                </article>

                {/* Feature 8 - Keyboard Shortcuts */}
                <article className="bg-card rounded-2xl p-6 border border-border hover:border-primary/50 transition-colors cursor-pointer">
                  <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-4" aria-hidden="true">
                    <Keyboard className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Keyboard Shortcuts</h3>
                  <p className="text-muted-foreground">
                    Work faster with familiar keyboard shortcuts. Ctrl+B for bold, Ctrl+I for italic, and more.
                  </p>
                </article>
              </div>
            </div>
          </section>

          {/* How it Works */}
          <section className="py-20 sm:py-28" aria-labelledby="how-it-works-heading">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
              <div className="text-center mb-16">
                <h2 id="how-it-works-heading" className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                  How to Use the Khmer Word Processor
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Get started in seconds. No installation or download required.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-primary">1</span>
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Type or Speak Khmer</h3>
                  <p className="text-muted-foreground">
                    Type your Khmer text directly or use voice input to dictate your content naturally.
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-primary">2</span>
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Auto Word Breaking</h3>
                  <p className="text-muted-foreground">
                    Aksara automatically adds invisible word breaks so your Khmer text flows and wraps properly.
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-primary">3</span>
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Export & Share</h3>
                  <p className="text-muted-foreground">
                    Download as ODT for LibreOffice or copy to clipboard with word breaks preserved.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="py-20 sm:py-28 bg-primary/5" aria-labelledby="cta-heading">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
              <h2 id="cta-heading" className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                Start Writing Khmer Documents Today
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                Join thousands of Khmer writers who use Aksara Pro for their documents.
                Free to use with no registration required.
              </p>
              <Link href="/editor">
                <Button size="lg" className="gap-2 text-base px-8 py-6 cursor-pointer">
                  Open Khmer Editor
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>

              {/* Trust indicators */}
              <div className="flex flex-wrap items-center justify-center gap-6 mt-12 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" aria-hidden="true" />
                  <span>100% Free</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" aria-hidden="true" />
                  <span>No Download Required</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" aria-hidden="true" />
                  <span>LibreOffice Compatible</span>
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t border-border py-8">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <Link href="/" className="flex items-center gap-2" aria-label="Aksara Pro">
                {/* Logo icon */}
                <div className="relative w-8 h-8 shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white text-lg font-bold leading-none translate-y-[-0.5px] translate-x-[0.5px]">អ</span>
                  </div>
                </div>

                {/* Logo text */}
                <div className="flex items-baseline">
                  <span
                    className="text-lg text-foreground leading-none"
                    style={{ fontFamily: "var(--font-moul), serif" }}
                  >
                    អក្សរា
                  </span>
                  <span
                    className="ml-[3px] text-lg text-foreground/80 leading-none"
                    style={{ fontFamily: "var(--font-geist-sans), sans" }}
                  >
                    Pro
                  </span>
                </div>
              </Link>
              <p className="text-sm text-muted-foreground">
                Free Online Khmer Word Processor with Spell Check
              </p>
            </div>
          </div>
        </footer>
      </div>
    </AuthRedirect>
  )
}
