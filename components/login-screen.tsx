"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { useAuth } from "./auth-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Loader2 } from "lucide-react"
import { TurnstileWidget, isTurnstileConfigured } from "./turnstile-widget"

interface LoginScreenProps {
  initialMode?: "login" | "register"
}

export function LoginScreen({ initialMode = "login" }: LoginScreenProps) {
  const { login, register } = useAuth()
  const [isRegister, setIsRegister] = useState(initialMode === "register")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string>("")
  const [turnstileKey, setTurnstileKey] = useState(0)
  const [turnstileRequired, setTurnstileRequired] = useState(isTurnstileConfigured())

  const resetTurnstile = useCallback(() => {
    setTurnstileToken("")
    setTurnstileKey((prev) => prev + 1)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Check for turnstile token only if Turnstile is configured and required
    if (turnstileRequired && !turnstileToken) {
      setError("Please complete the security verification")
      return
    }

    setIsLoading(true)

    let result
    if (isRegister) {
      result = await register(email, password, name || undefined, turnstileToken || undefined)
    } else {
      result = await login(email, password, turnstileToken || undefined)
    }

    if (!result.success) {
      setError(result.error || (isRegister ? "Registration failed" : "Login failed"))
      // Reset turnstile on error (token is single-use)
      if (turnstileRequired) {
        resetTurnstile()
      }
    }

    setIsLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-4">
            {/* Logo icon */}
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg shadow-blue-500/25" />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 via-transparent to-black/5" />
              <div className="absolute inset-[1px] rounded-[14px] border border-white/20" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white text-2xl font-bold leading-none translate-y-[-2px] translate-x-[1px]">
                  អ
                </span>
              </div>
            </div>

            {/* Brand text */}
            <div className="flex flex-col items-start gap-0">
              <h1
                className="flex items-baseline gap-1 text-2xl leading-none tracking-tight text-foreground"
                style={{ fontFamily: "var(--font-moul), serif" }}
              >
                អក្សរា
                <span
                  className="text-2xl text-foreground"
                  style={{ fontFamily: "var(--font-geist-sans), sans" }}
                >
                  Pro
                </span>
              </h1>
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.15em] mt-0.5">
                Smart Khmer Writing
              </span>
            </div>
          </div>
          <CardTitle className="text-xl">{isRegister ? "Create Account" : "Welcome Back"}</CardTitle>
          <CardDescription>
            {isRegister ? "Sign up to start using Aksara" : "Sign in to access the Khmer word processor"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            {isRegister && (
              <div className="space-y-2">
                <Label htmlFor="name">Name (optional)</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  disabled={isLoading}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email"
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                disabled={isLoading}
                minLength={6}
              />
            </div>

            {/* Turnstile Security Widget - only renders if configured */}
            <TurnstileWidget
              key={turnstileKey}
              onSuccess={setTurnstileToken}
              onError={() => setTurnstileToken("")}
              onExpire={() => setTurnstileToken("")}
              onUnconfigured={() => setTurnstileRequired(false)}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || (turnstileRequired && !turnstileToken)}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isRegister ? "Creating account..." : "Signing in..."}
                </>
              ) : isRegister ? (
                "Create Account"
              ) : (
                "Sign In"
              )}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              {isRegister ? (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegister(false)
                      setError("")
                      resetTurnstile()
                    }}
                    className="text-primary hover:underline"
                  >
                    Sign in
                  </button>
                </>
              ) : (
                <>
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegister(true)
                      setError("")
                      resetTurnstile()
                    }}
                    className="text-primary hover:underline"
                  >
                    Create one
                  </button>
                </>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
