"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Mail, Loader2 } from "lucide-react"

export function EmailPreferencesSection() {
  const [marketingOptIn, setMarketingOptIn] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Fetch current preference
  useEffect(() => {
    fetch("/api/user/email-preferences")
      .then((res) => res.json())
      .then((data) => {
        setMarketingOptIn(data.marketingOptIn ?? true)
      })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [])

  const handleToggle = async (checked: boolean) => {
    setIsSaving(true)
    setMarketingOptIn(checked)

    try {
      const response = await fetch("/api/user/email-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketingOptIn: checked }),
      })

      if (!response.ok) {
        // Revert on error
        setMarketingOptIn(!checked)
      }
    } catch {
      // Revert on error
      setMarketingOptIn(!checked)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200/80 dark:border-slate-700/50 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50">
            <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          Email Preferences
        </CardTitle>
        <CardDescription>
          Manage what emails you receive from Aksara
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="marketing-emails" className="text-base font-medium">
                Product updates & announcements
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive emails about new features, tips, and Aksara news
              </p>
            </div>
            <Switch
              id="marketing-emails"
              checked={marketingOptIn}
              onCheckedChange={handleToggle}
              disabled={isSaving}
            />
          </div>
        )}

        <p className="text-xs text-muted-foreground border-t pt-4">
          You will always receive essential emails like password resets and security alerts regardless of this setting.
        </p>
      </CardContent>
    </Card>
  )
}
