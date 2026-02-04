"use client"

import type React from "react"
import { createContext, useContext, useCallback } from "react"
import { useSession, signIn, signUp, signOut } from "@/lib/auth-client"

interface User {
  id: string
  email: string
  name: string | null
  image: string | null
  role: "user" | "admin" // Keep for backwards compatibility
  isAdmin: boolean
  storageLimitBytes: number
  showAds: boolean
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  isDev: boolean // Keep for backwards compatibility
  isAdmin: boolean
  login: (
    email: string,
    password: string,
    turnstileToken?: string
  ) => Promise<{ success: boolean; error?: string }>
  register: (
    email: string,
    password: string,
    name?: string,
    turnstileToken?: string
  ) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  refreshAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, isPending, refetch } = useSession()

  // Map Better Auth session to our User interface
  const user: User | null = session?.user
    ? {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name || null,
        image: session.user.image || null,
        // Map isAdmin to role for backwards compatibility
        role: (session.user as { isAdmin?: boolean }).isAdmin ? "admin" : "user",
        isAdmin: (session.user as { isAdmin?: boolean }).isAdmin ?? false,
        storageLimitBytes:
          (session.user as { storageLimitBytes?: number }).storageLimitBytes ?? 5242880,
        showAds: (session.user as { showAds?: boolean }).showAds ?? true,
      }
    : null

  const login = async (
    email: string,
    password: string,
    turnstileToken?: string
  ): Promise<{ success: boolean; error?: string; needsVerification?: boolean }> => {
    try {
      // For now, we pass turnstileToken but Better Auth doesn't have built-in support
      // We'll need to add custom validation endpoint or use hooks
      // TODO: Implement Turnstile validation in a custom endpoint
      const result = await signIn.email({
        email,
        password,
        callbackURL: "/editor",
      })

      if (result.error) {
        const errorMessage = result.error.message || "Login failed"
        const errorCode = result.error.code || ""

        // Check if error is related to email verification
        if (errorMessage.toLowerCase().includes("verify") ||
            errorMessage.toLowerCase().includes("verification") ||
            errorCode === "EMAIL_NOT_VERIFIED") {
          return {
            success: false,
            error: "Please verify your email before signing in.",
            needsVerification: true
          }
        }

        // Check if error is related to credentials
        if (errorMessage.toLowerCase().includes("invalid") ||
            errorMessage.toLowerCase().includes("credentials") ||
            errorMessage.toLowerCase().includes("password") ||
            errorMessage.toLowerCase().includes("user not found")) {
          return { success: false, error: "Invalid email or password" }
        }

        // Server errors
        if (result.error.status === 500 || errorMessage.includes("500")) {
          return {
            success: false,
            error: "We're experiencing technical difficulties. Please try again in a few minutes."
          }
        }

        return { success: false, error: errorMessage }
      }

      await refetch()
      return { success: true }
    } catch (error) {
      console.error("Login error:", error)
      // Check if it's a server error (500)
      const errorMsg = error instanceof Error ? error.message : String(error)
      if (errorMsg.includes("500") || errorMsg.includes("Internal Server Error")) {
        return {
          success: false,
          error: "We're experiencing technical difficulties. Please try again in a few minutes."
        }
      }
      return { success: false, error: "Network error. Please check your connection." }
    }
  }

  const register = async (
    email: string,
    password: string,
    name?: string,
    turnstileToken?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // TODO: Implement Turnstile validation in a custom endpoint
      const result = await signUp.email({
        email,
        password,
        name: name || "",
        callbackURL: "/editor",
      })

      if (result.error) {
        return {
          success: false,
          error: result.error.message || "Registration failed",
        }
      }

      await refetch()
      return { success: true }
    } catch (error) {
      console.error("Registration error:", error)
      return { success: false, error: "Network error" }
    }
  }

  const logout = async () => {
    try {
      await signOut()
      await refetch()
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  const refreshAuth = useCallback(async () => {
    await refetch()
  }, [refetch])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!session?.user,
        isLoading: isPending,
        isDev: user?.isAdmin ?? false, // Map isDev to isAdmin for backwards compatibility
        isAdmin: user?.isAdmin ?? false,
        login,
        register,
        logout,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
