"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Mic, FileText, Type, Download, Moon, Keyboard, ArrowRight, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function LandingPage() {
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/check")
        const data = await res.json()
        if (data.authenticated) {
          router.push("/editor")
          return
        }
      } catch (error) {
        // Not authenticated, show landing page
      }
      setIsChecking(false)
    }
    checkAuth()
  }, [router])

  // Show loading state while checking auth
  if (isChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Logo icon */}
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg shadow-blue-500/25" />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 via-transparent to-black/5" />
              <div className="absolute inset-[1px] rounded-[14px] border border-white/20" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white text-2xl font-bold leading-none translate-y-[-1.5px]">អ</span>
              </div>
            </div>
            {/* Logo text */}
            <span className="text-xl sm:text-2xl text-foreground" style={{ fontFamily: "var(--font-moul), serif" }}>
              អក្សរា
            </span>
          </div>
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
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 to-transparent dark:from-blue-950/20" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-32 relative">
          <div className="text-center max-w-3xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium mb-8">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              Smart Khmer Writing
            </div>

            {/* Main headline */}
            <h1 className="mb-6">
              <span
                className="block text-5xl sm:text-7xl text-primary mb-4 leading-tight"
                style={{ fontFamily: "var(--font-moul), serif" }}
              >
                អក្សរា
              </span>
              <span className="block text-3xl sm:text-5xl font-bold text-foreground tracking-tight">
                The Modern Khmer Word Processor
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              Write beautiful Khmer documents with automatic word segmentation, voice-to-text input, and professional
              formatting. Export to ODT with perfect word breaks for LibreOffice.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/signup">
                <Button size="lg" className="gap-2 text-base px-8 py-6">
                  Get Started Free
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="gap-2 text-base px-8 py-6 bg-transparent">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 sm:py-28 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Everything you need to write in Khmer
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Aksara combines powerful features to make Khmer writing effortless and professional.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 - Voice Input */}
            <div className="bg-card rounded-2xl p-6 border border-border hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
                <Mic className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Voice to Text</h3>
              <p className="text-muted-foreground">
                Speak naturally and watch your words appear on screen. Powered by ElevenLabs for accurate Khmer
                transcription.
              </p>
            </div>

            {/* Feature 2 - Auto Segmentation */}
            <div className="bg-card rounded-2xl p-6 border border-border hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                <Type className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Smart Word Breaks</h3>
              <p className="text-muted-foreground">
                Automatic word segmentation using zero-width spaces. Your text will wrap correctly in any application.
              </p>
            </div>

            {/* Feature 3 - Formatting */}
            <div className="bg-card rounded-2xl p-6 border border-border hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Rich Formatting</h3>
              <p className="text-muted-foreground">
                Bold, italic, underline, headings, and lists. All the formatting tools you need for professional
                documents.
              </p>
            </div>

            {/* Feature 4 - ODT Export */}
            <div className="bg-card rounded-2xl p-6 border border-border hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                <Download className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">ODT Export</h3>
              <p className="text-muted-foreground">
                Export to OpenDocument format with preserved formatting. Works perfectly with LibreOffice and other
                office suites.
              </p>
            </div>

            {/* Feature 5 - Dark Mode */}
            <div className="bg-card rounded-2xl p-6 border border-border hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                <Moon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Dark Mode</h3>
              <p className="text-muted-foreground">
                Easy on the eyes with a beautiful dark theme. Switch between light and dark modes with one click.
              </p>
            </div>

            {/* Feature 6 - Keyboard Shortcuts */}
            <div className="bg-card rounded-2xl p-6 border border-border hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-4">
                <Keyboard className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Keyboard Shortcuts</h3>
              <p className="text-muted-foreground">
                Work faster with familiar keyboard shortcuts for formatting. Ctrl+B for bold, Ctrl+I for italic, and
                more.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">How it works</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get started in seconds. No installation required.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary">1</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Write or Speak</h3>
              <p className="text-muted-foreground">
                Type your Khmer text or use voice input to dictate your content naturally.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary">2</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Auto-Format</h3>
              <p className="text-muted-foreground">
                Aksara automatically adds invisible word breaks so your text flows properly.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary">3</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Export & Share</h3>
              <p className="text-muted-foreground">Download as ODT or copy to clipboard with word breaks preserved.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 sm:py-28 bg-primary/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Ready to start writing?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of Khmer writers who use Aksara for their documents. Sign up free to get started.
          </p>
          <Link href="/editor">
            <Button size="lg" className="gap-2 text-base px-8 py-6">
              Open Editor
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-12 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span>Free to use</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span>No installation needed</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span>Export to LibreOffice</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative w-8 h-8">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white text-lg font-bold leading-none">អ</span>
                </div>
              </div>
              <span className="text-lg text-foreground" style={{ fontFamily: "var(--font-moul), serif" }}>
                អក្សរា
              </span>
            </div>
            <p className="text-sm text-muted-foreground">Smart Khmer Writing</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
