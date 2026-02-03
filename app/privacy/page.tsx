import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Shield, Lock, Download, Trash2, Cookie, Clock, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollAnimate, ParallaxLayer, GlowOrb } from '@/components/ui/scroll-animate'

export const metadata: Metadata = {
  title: 'Privacy Policy | Aksara Pro',
  description: 'Learn how Aksara Pro protects your data and respects your privacy',
  openGraph: {
    title: 'Privacy Policy | Aksara Pro',
    description: 'Learn how Aksara Pro protects your data and respects your privacy',
    type: 'website',
  },
}

const LAST_UPDATED = 'February 3, 2026'

interface SectionProps {
  id: string
  icon: React.ReactNode
  title: string
  children: React.ReactNode
  delay?: number
}

function Section({ id, icon, title, children, delay = 0 }: SectionProps) {
  return (
    <ScrollAnimate variant="fade-up" delay={delay} duration={500}>
      <section id={id} className="scroll-mt-32">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
            {icon}
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h2>
        </div>
        <div className="prose prose-slate dark:prose-invert max-w-none prose-p:text-slate-600 dark:prose-p:text-slate-400 prose-p:leading-relaxed prose-li:text-slate-600 dark:prose-li:text-slate-400 prose-strong:text-slate-900 dark:prose-strong:text-white">
          {children}
        </div>
      </section>
    </ScrollAnimate>
  )
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header */}
      <header className="fixed top-4 left-4 right-4 z-50">
        <nav className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg shadow-slate-900/5 dark:shadow-slate-900/30">
          <Link href="/" className="flex items-center gap-2 group">
            {/* Logo icon */}
            <div className="relative w-8 h-8 sm:w-10 sm:h-10 shrink-0 transition-transform duration-200 group-hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg sm:rounded-xl shadow-lg shadow-blue-500/25" />
              <div className="absolute inset-0 rounded-lg sm:rounded-xl bg-gradient-to-br from-white/20 via-transparent to-black/5" />
              <div className="absolute inset-[1px] rounded-[7px] sm:rounded-[10px] border border-white/20" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white text-xl sm:text-2xl font-bold leading-none translate-y-[-2px] translate-x-[1px]">អ</span>
              </div>
            </div>

            {/* Logo text */}
            <div className="hidden xs:flex items-baseline whitespace-nowrap">
              <span
                className="text-lg sm:text-2xl text-slate-900 dark:text-white leading-none"
                style={{ fontFamily: 'var(--font-moul), serif' }}
              >
                អក្សរា
              </span>
              <span
                className="ml-[3px] sm:ml-[4px] text-lg sm:text-2xl text-slate-900 dark:text-white leading-none font-medium"
                style={{ fontFamily: 'var(--font-geist-sans), sans' }}
              >
                Pro
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-1 sm:gap-3">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer gap-1.5">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Home</span>
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="gap-1 sm:gap-2 px-3 sm:px-4 bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/25 cursor-pointer text-xs sm:text-sm">
                Get Started
                <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-32 sm:pt-40 pb-16">
        {/* Background decoration */}
        <ParallaxLayer depth={0.2} maxOffset={40} className="absolute inset-0 pointer-events-none">
          <GlowOrb
            color="blue"
            size="lg"
            intensity="medium"
            floatAmplitude={20}
            floatDuration={12}
            className="top-[-100px] left-[10%]"
          />
        </ParallaxLayer>
        <ParallaxLayer depth={0.15} maxOffset={30} className="absolute inset-0 pointer-events-none">
          <GlowOrb
            color="indigo"
            size="md"
            intensity="subtle"
            floatAmplitude={15}
            floatDuration={10}
            className="top-20 right-[15%]"
          />
        </ParallaxLayer>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center relative">
          <ScrollAnimate variant="hero-badge" delay={0} duration={700}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50/90 dark:bg-blue-900/50 backdrop-blur-md text-blue-700 dark:text-blue-300 text-sm font-medium mb-6 border border-blue-200/60 dark:border-blue-700/50 shadow-lg shadow-blue-500/15">
              <Shield className="w-4 h-4" />
              Your Privacy Matters
            </div>
          </ScrollAnimate>

          <ScrollAnimate variant="hero-title" delay={100} duration={900}>
            <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white mb-6">
              Privacy Policy
            </h1>
          </ScrollAnimate>

          <ScrollAnimate variant="zoom-blur" delay={300} duration={700}>
            <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-4">
              We believe in transparency. This policy explains what data we collect, how we use it, and your rights over your information.
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-500">
              Last updated: {LAST_UPDATED}
            </p>
          </ScrollAnimate>
        </div>
      </section>

      {/* Table of Contents */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 mb-12">
        <ScrollAnimate variant="fade-up" delay={400} duration={500}>
          <nav className="bg-white/80 dark:bg-slate-800/60 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700/50 shadow-lg">
            <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">Quick Navigation</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { href: '#introduction', label: 'Introduction' },
                { href: '#data-collection', label: 'Data Collection' },
                { href: '#data-usage', label: 'How We Use Data' },
                { href: '#data-protection', label: 'Protection' },
                { href: '#your-rights', label: 'Your Rights' },
                { href: '#cookies', label: 'Cookies' },
                { href: '#retention', label: 'Data Retention' },
                { href: '#contact', label: 'Contact Us' },
              ].map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors py-2 px-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </nav>
        </ScrollAnimate>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pb-24 space-y-16">
        <Section id="introduction" icon={<Shield className="w-5 h-5" />} title="Introduction" delay={0}>
          <p>
            Welcome to Aksara Pro. We are committed to protecting your privacy and ensuring you have control over your personal information. This Privacy Policy explains how we collect, use, and safeguard your data when you use our Khmer word processor application.
          </p>
          <p>
            Aksara Pro is a web-based writing tool designed specifically for the Khmer language, featuring intelligent word segmentation, spell checking, grammar assistance, and voice input. We built this tool to help you write with confidence, and that includes confidence in how your data is handled.
          </p>
        </Section>

        <Section id="data-collection" icon={<Lock className="w-5 h-5" />} title="Data We Collect" delay={50}>
          <p>We collect only the data necessary to provide and improve our service:</p>

          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-6 mb-3">Account Information</h3>
          <ul>
            <li><strong>Email address</strong> - Used for account authentication and communication</li>
            <li><strong>Name</strong> (optional) - Used for personalization</li>
            <li><strong>Password</strong> - Securely hashed, never stored in plain text</li>
          </ul>

          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-6 mb-3">Your Documents</h3>
          <ul>
            <li><strong>Document titles and content</strong> - The documents you create and edit</li>
            <li><strong>Editor state</strong> - Formatting and structure of your documents</li>
            <li className="text-blue-600 dark:text-blue-400 font-medium">All document data is encrypted at rest using AES-256-GCM encryption</li>
          </ul>

          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-6 mb-3">Dictionary Contributions</h3>
          <ul>
            <li><strong>Custom words</strong> - Words you add to your personal dictionary</li>
            <li><strong>Ignored words</strong> - Words you mark as correctly spelled</li>
            <li><strong>Word join/split preferences</strong> - How you prefer certain word combinations to be segmented</li>
          </ul>
          <p className="mt-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl text-amber-800 dark:text-amber-200 text-sm">
            <strong>Note:</strong> We aggregate anonymized dictionary contributions from all users to improve Aksara&apos;s word segmentation and spell checking for everyone. This helps us build a better Khmer language tool. Individual contributions are not personally identifiable.
          </p>

          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-6 mb-3">Usage Data</h3>
          <ul>
            <li><strong>Preferences</strong> - Your app settings (theme, font size, etc.)</li>
            <li><strong>Last login</strong> - For account security purposes</li>
          </ul>
        </Section>

        <Section id="data-usage" icon={<Shield className="w-5 h-5" />} title="How We Use Your Data" delay={100}>
          <p>We use your data for the following purposes:</p>
          <ul>
            <li><strong>Provide the service</strong> - Store and sync your documents across devices</li>
            <li><strong>Authenticate you</strong> - Securely log you into your account</li>
            <li><strong>Improve Aksara</strong> - Use aggregated, anonymized dictionary data to enhance spell checking and word segmentation for all users</li>
            <li><strong>Communicate with you</strong> - Send important service updates (we don&apos;t send marketing emails)</li>
          </ul>
          <p className="mt-4">
            <strong>We do not:</strong>
          </p>
          <ul>
            <li>Sell your personal data to third parties</li>
            <li>Use your data for advertising purposes</li>
            <li>Share your documents with anyone</li>
            <li>Train AI models on your personal content</li>
          </ul>
        </Section>

        <Section id="data-protection" icon={<Lock className="w-5 h-5" />} title="How We Protect Your Data" delay={150}>
          <p>We take data security seriously and implement multiple layers of protection:</p>
          <ul>
            <li><strong>Encryption at rest</strong> - All document content (title, content, editor state) is encrypted using AES-256-GCM before being stored in our database</li>
            <li><strong>Encryption in transit</strong> - All data transmitted between your browser and our servers uses HTTPS/TLS</li>
            <li><strong>Secure hosting</strong> - Our application runs on Railway with their enterprise-grade security infrastructure</li>
            <li><strong>Database security</strong> - We use Neon PostgreSQL with encryption at rest and secure network isolation</li>
            <li><strong>Password hashing</strong> - Passwords are hashed using bcrypt, a secure one-way hashing algorithm</li>
            <li><strong>No third-party access</strong> - We don&apos;t share your data with third-party analytics or tracking services</li>
          </ul>
        </Section>

        <Section id="your-rights" icon={<Download className="w-5 h-5" />} title="Your Rights" delay={200}>
          <p>You have full control over your data:</p>
          <ul>
            <li><strong>Access</strong> - View all data we store about you in your account settings</li>
            <li><strong>Export</strong> - Download all your documents and account data at any time</li>
            <li><strong>Delete</strong> - Permanently delete your account and all associated data</li>
            <li><strong>Correct</strong> - Update your account information at any time</li>
          </ul>
          <p className="mt-4">
            To exercise these rights, visit your <Link href="/settings" className="text-blue-600 dark:text-blue-400 hover:underline">account settings</Link> or contact us directly.
          </p>
        </Section>

        <Section id="cookies" icon={<Cookie className="w-5 h-5" />} title="Cookies" delay={250}>
          <p>We use minimal cookies necessary for the service to function:</p>
          <ul>
            <li><strong>Session cookie</strong> - Keeps you logged in during your browsing session</li>
            <li><strong>Preference cookies</strong> - Remember your settings (theme, language)</li>
          </ul>
          <p className="mt-4">
            <strong>We do not use:</strong>
          </p>
          <ul>
            <li>Third-party tracking cookies</li>
            <li>Advertising cookies</li>
            <li>Analytics cookies that track individual users</li>
          </ul>
        </Section>

        <Section id="retention" icon={<Clock className="w-5 h-5" />} title="Data Retention" delay={300}>
          <p>We retain your data as follows:</p>
          <ul>
            <li><strong>Documents</strong> - Kept until you delete them or delete your account</li>
            <li><strong>Account data</strong> - Kept until you request account deletion</li>
            <li><strong>Dictionary contributions</strong> - Anonymized contributions may be retained to improve the service even after account deletion</li>
          </ul>
          <p className="mt-4">
            When you delete your account, we permanently remove all personally identifiable information within 30 days. Some anonymized, aggregated data may be retained for service improvement purposes.
          </p>
        </Section>

        <Section id="contact" icon={<Mail className="w-5 h-5" />} title="Contact Us" delay={350}>
          <p>
            If you have any questions about this Privacy Policy or our data practices, please contact us:
          </p>
          <ul>
            <li><strong>Email:</strong> <a href="mailto:privacy@aksara.app" className="text-blue-600 dark:text-blue-400 hover:underline">privacy@aksara.app</a></li>
          </ul>
          <p className="mt-4">
            We will respond to privacy-related inquiries within 30 days.
          </p>
        </Section>

        {/* Changes Notice */}
        <ScrollAnimate variant="fade-up" delay={400} duration={500}>
          <div className="bg-slate-100 dark:bg-slate-800/60 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700/50">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Changes to This Policy</h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              We may update this Privacy Policy from time to time. When we make significant changes, we will notify you by email or through a notice on our website. We encourage you to review this policy periodically.
            </p>
          </div>
        </ScrollAnimate>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/50 dark:border-slate-800/50 py-12 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {/* Logo & Description */}
            <div className="md:col-span-2">
              <Link href="/" className="flex items-center gap-3 group transition-transform duration-200 hover:scale-105 w-fit">
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
                    style={{ fontFamily: 'var(--font-moul), serif' }}
                  >
                    អក្សរា
                  </span>
                  <span
                    className="ml-[4px] text-xl text-slate-500 dark:text-slate-400 leading-none font-medium"
                    style={{ fontFamily: 'var(--font-geist-sans), sans' }}
                  >
                    Pro
                  </span>
                </div>
              </Link>
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400 max-w-md">
                The smart Khmer word processor with intelligent word segmentation, spell checking, and voice input.
              </p>
            </div>

            {/* Links */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
                Links
              </h3>
              <nav className="flex flex-col gap-3">
                <Link
                  href="/blog"
                  className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  Blog
                </Link>
                <Link
                  href="/privacy"
                  className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  Privacy Policy
                </Link>
              </nav>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="mt-10 pt-6 border-t border-slate-200/50 dark:border-slate-700/50">
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
              © {new Date().getFullYear()} Aksara Pro. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
