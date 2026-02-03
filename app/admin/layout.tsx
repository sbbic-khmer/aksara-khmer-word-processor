import type React from "react"
import type { Metadata } from "next"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/components/auth-provider"
import { AuthWrapper } from "@/components/auth-wrapper"

export const metadata: Metadata = {
  title: "Admin - Aksara Pro",
  description: "Admin dashboard for Aksara Pro",
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AuthWrapper>{children}</AuthWrapper>
      </AuthProvider>
    </ThemeProvider>
  )
}
