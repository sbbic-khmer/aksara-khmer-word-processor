import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono, Moul, Battambang, Kantumruy_Pro, Noto_Sans_Khmer } from "next/font/google"
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

const kantumruyPro = Kantumruy_Pro({
  weight: ["400", "500", "600", "700"],
  subsets: ["khmer", "latin"],
  variable: "--font-kantumruy",
})

const notoSansKhmer = Noto_Sans_Khmer({
  weight: ["400", "500", "600", "700"],
  subsets: ["khmer", "latin"],
  variable: "--font-noto-khmer",
})

export const metadata: Metadata = {
  title: "អក្សរា Aksara Pro - The Modern Khmer Word Processor",
  description: "Write beautiful Khmer documents with automatic word segmentation, voice-to-text input, spelling and grammar checkers. Export to ODT with proper line-breaking for LibreOffice.",
  generator: "v0.app",
  keywords: ["Khmer", "word processor", "Cambodian", "typing", "voice to text", "spelling checker", "grammar checker", "LibreOffice", "ODT"],
  authors: [{ name: "Aksara Pro" }],
  creator: "Aksara Pro",
  metadataBase: new URL("https://aksara.app"),
  alternates: {
    canonical: "https://aksara.app",
    languages: {
      "en": "https://aksara.app",
      "km": "https://aksara.app/km",
      "x-default": "https://aksara.app",
    },
  },
  other: {
    ...(process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID && {
      "google-adsense-account": process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID,
    }),
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    alternateLocale: ["km_KH"],
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
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta httpEquiv="Delegate-CH" content="Sec-CH-UA https://s.magsrv.com; Sec-CH-UA-Mobile https://s.magsrv.com; Sec-CH-UA-Arch https://s.magsrv.com; Sec-CH-UA-Model https://s.magsrv.com; Sec-CH-UA-Platform https://s.magsrv.com; Sec-CH-UA-Platform-Version https://s.magsrv.com; Sec-CH-UA-Bitness https://s.magsrv.com; Sec-CH-UA-Full-Version-List https://s.magsrv.com; Sec-CH-UA-Full-Version https://s.magsrv.com;" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${moul.variable} ${battambang.variable} ${kantumruyPro.variable} ${notoSansKhmer.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  )
}
