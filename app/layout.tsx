import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono, Moul, Battambang } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/components/auth-provider"
import { AuthWrapper } from "@/components/auth-wrapper"
import "./globals.css"

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
})
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
})

const moul = Moul({
  weight: "400",
  subsets: ["khmer"],
  variable: "--font-moul",
})

const battambang = Battambang({
  weight: ["400", "700"],
  subsets: ["khmer"],
  variable: "--font-battambang",
})

export const metadata: Metadata = {
  title: "អក្សរា Aksara Pro - The Modern Khmer Word Processor",
  description: "Write beautiful Khmer documents with automatic word segmentation, voice-to-text input, spelling and grammar checkers. Export to ODT with proper line-breaking for LibreOffice.",
  generator: "v0.app",
  keywords: ["Khmer", "word processor", "Cambodian", "typing", "voice to text", "spelling checker", "grammar checker", "LibreOffice", "ODT"],
  authors: [{ name: "Aksara Pro" }],
  creator: "Aksara Pro",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://aksara.app",
    siteName: "Aksara Pro",
    title: "អក្សរា Aksara Pro - The Modern Khmer Word Processor",
    description: "Write beautiful Khmer documents with automatic word segmentation, voice-to-text input, spelling and grammar checkers. Export to ODT with proper line-breaking for LibreOffice.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Aksara Pro - The Modern Khmer Word Processor",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "អក្សរា Aksara Pro - The Modern Khmer Word Processor",
    description: "Write beautiful Khmer documents with automatic word segmentation, voice-to-text input, spelling and grammar checkers.",
    images: ["/og-image.jpg"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
    other: [
      {
        rel: "android-chrome",
        url: "/android-chrome-192x192.png",
        sizes: "192x192",
      },
    ],
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${moul.variable} ${battambang.variable} font-sans antialiased`}
      >
        <ThemeProvider>
          <AuthProvider>
            <AuthWrapper>{children}</AuthWrapper>
          </AuthProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
