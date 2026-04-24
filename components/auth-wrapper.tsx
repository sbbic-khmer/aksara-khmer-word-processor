"use client"

import type React from "react"
import { usePathname } from "next/navigation"
import { useAuth } from "./auth-provider"
import { LoginScreen } from "./login-screen"

const PUBLIC_PATHS = ["/", "/login", "/signup"]
const PUBLIC_PATH_PREFIXES = ["/forgot-password", "/reset-password", "/verify-email"]
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
  const isPublicPath =
    PUBLIC_PATHS.includes(basePath) ||
    PUBLIC_PATH_PREFIXES.some((p) => basePath === p || basePath.startsWith(`${p}/`))

  if (isPublicPath) {
    return <>{children}</>
  }

  if (isLoading) {
    // Render a blank background instead of a spinner — the editor has its own
    // loading overlay, so showing a spinner here too causes two sequential
    // spinners.  Auth typically resolves in <500ms, so a brief blank screen
    // is preferable to two distinct loading phases.
    return <div className="min-h-screen bg-background" />
  }

  if (!isAuthenticated) {
    return <LoginScreen />
  }

  return <>{children}</>
}
