"use client"

import { useEffect, useState } from "react"
import { useRouter } from "@/i18n/navigation"
import { Loader2 } from "lucide-react"

interface AuthRedirectProps {
  children: React.ReactNode
}

/**
 * Client component that checks auth and redirects authenticated users.
 * Redirects to verify-email if not verified, editor if verified.
 * Renders children (the landing page) for unauthenticated users.
 */
export function AuthRedirect({ children }: AuthRedirectProps) {
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/check")
        const data = await res.json()
        if (data.authenticated) {
          // Check if email is verified
          if (data.emailVerified === false) {
            router.push("/verify-email")
          } else {
            router.push("/editor")
          }
          return
        }
      } catch (error) {
        // Not authenticated, show landing page
      }
      setIsChecking(false)
    }
    checkAuth()
  }, [router])

  if (isChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return <>{children}</>
}
