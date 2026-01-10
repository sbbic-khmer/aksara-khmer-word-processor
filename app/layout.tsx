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
  title: "អក្សរា Aksara - Khmer Word Processor",
  description: "A modern Khmer word processor with automatic word segmentation, voice input, and proper line breaking",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
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
