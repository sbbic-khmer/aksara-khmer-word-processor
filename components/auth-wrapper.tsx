"use client"

import type React from "react"
import { usePathname } from "next/navigation"
import { useAuth } from "./auth-provider"
import { LoginScreen } from "./login-screen"
import { Loader2 } from "lucide-react"

const PUBLIC_PATHS = ["/", "/login", "/signup"]

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  const pathname = usePathname()

  const isPublicPath = PUBLIC_PATHS.includes(pathname)

  if (isPublicPath) {
    return <>{children}</>
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginScreen />
  }

  return <>{children}</>
}
