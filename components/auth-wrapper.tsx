"use client"

import type React from "react"
import { usePathname } from "next/navigation"
import { useAuth } from "./auth-provider"
import { LoginScreen } from "./login-screen"
import { Loader2 } from "lucide-react"

const PUBLIC_PATHS = ["/", "/login", "/signup"]
const LOCALES = ["en", "km"]

// Strip locale prefix from pathname to get the base path
function getBasePath(pathname: string): string {
  for (const locale of LOCALES) {
    if (pathname === `/${locale}`) {
      return "/"
    }
    if (pathname.startsWith(`/${locale}/`)) {
      return pathname.slice(locale.length + 1)
    }
  }
  return pathname
}

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  const pathname = usePathname()

  // Get the path without locale prefix
  const basePath = getBasePath(pathname)
  const isPublicPath = PUBLIC_PATHS.includes(basePath)

  if (isPublicPath) {
    return <>{children}</>
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginScreen />
  }

  return <>{children}</>
}
