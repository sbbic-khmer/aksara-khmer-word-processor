"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, CheckCircle, XCircle, Mail } from "lucide-react"
import Link from "next/link"

export default function UnsubscribePage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [status, setStatus] = useState<"loading" | "confirm" | "success" | "error">("confirm")
  const [isProcessing, setIsProcessing] = useState(false)

  const handleUnsubscribe = async () => {
    setIsProcessing(true)
    try {
      const response = await fetch(`/api/unsubscribe/${token}`, {
        method: "POST",
      })

      if (response.ok) {
        setStatus("success")
      } else {
        setStatus("error")
      }
    } catch {
      setStatus("error")
    } finally {
      setIsProcessing(false)
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        {status === "confirm" && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 rounded-full bg-blue-100 dark:bg-blue-900 w-fit">
                <Mail className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle>Unsubscribe from emails</CardTitle>
              <CardDescription>
                Are you sure you want to unsubscribe from Aksara marketing emails?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                You will still receive important emails like password resets and account notifications.
              </p>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleUnsubscribe}
                  disabled={isProcessing}
                  variant="destructive"
                  className="w-full"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Unsubscribing...
                    </>
                  ) : (
                    "Yes, unsubscribe me"
                  )}
                </Button>
                <Link href="/">
                  <Button variant="outline" className="w-full">
                    No, keep me subscribed
                  </Button>
                </Link>
              </div>
            </CardContent>
          </>
        )}

        {status === "success" && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 rounded-full bg-green-100 dark:bg-green-900 w-fit">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle>Unsubscribed successfully</CardTitle>
              <CardDescription>
                You have been unsubscribed from Aksara marketing emails.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                You can re-subscribe anytime from your account settings.
              </p>
              <Link href="/">
                <Button className="w-full">Go to Aksara</Button>
              </Link>
            </CardContent>
          </>
        )}

        {status === "error" && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 rounded-full bg-red-100 dark:bg-red-900 w-fit">
                <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle>Something went wrong</CardTitle>
              <CardDescription>
                We couldn&apos;t process your unsubscribe request.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                The link may be invalid or expired. Please try again or contact support.
              </p>
              <Button onClick={() => setStatus("confirm")} variant="outline" className="w-full">
                Try again
              </Button>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  )
}
