"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState, useCallback } from "react"

interface User {
  id: string
  email: string
  name: string | null
  role: "user" | "admin"
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  isDev: boolean
  isAdmin: boolean
  login: (email: string, password: string, turnstileToken?: string) => Promise<{ success: boolean; error?: string }>
  register: (email: string, password: string, name?: string, turnstileToken?: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  refreshAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isDev, setIsDev] = useState(false)

  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/check")
      const data = await response.json()
      setIsAuthenticated(data.authenticated)
      setIsDev(data.isDev)
      setUser(data.user || null)
    } catch (error) {
      console.error("Auth check failed:", error)
      setIsAuthenticated(false)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const login = async (email: string, password: string, turnstileToken?: string) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, turnstileToken }),
      })

      const data = await response.json()

      if (response.ok) {
        setIsAuthenticated(true)
        setUser(data.user)
        return { success: true }
      }

      return { success: false, error: data.error || "Login failed" }
    } catch (error) {
      return { success: false, error: "Network error" }
    }
  }

  const register = async (email: string, password: string, name?: string, turnstileToken?: string) => {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, turnstileToken }),
      })

      const data = await response.json()

      if (response.ok) {
        setIsAuthenticated(true)
        setUser(data.user)
        return { success: true }
      }

      return { success: false, error: data.error || "Registration failed" }
    } catch (error) {
      return { success: false, error: "Network error" }
    }
  }

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } finally {
      setIsAuthenticated(false)
      setUser(null)
    }
  }

  const refreshAuth = async () => {
    await checkAuth()
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        isDev,
        isAdmin: user?.role === "admin",
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
