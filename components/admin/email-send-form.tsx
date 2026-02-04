"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  ArrowLeft,
  Send,
  Calendar,
  Loader2,
  Users,
  Clock,
  AlertCircle,
} from "lucide-react"
import Link from "next/link"

interface Campaign {
  id: string
  subject: string
  senderName: string | null
  status: string
  scheduledAt: string | null
}

interface EmailSendFormProps {
  campaignId: string
}

export function EmailSendForm({ campaignId }: EmailSendFormProps) {
  const router = useRouter()

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Segment filters
  const [verifiedOnly, setVerifiedOnly] = useState(true)
  const [inactiveDays, setInactiveDays] = useState("")
  const [registeredAfter, setRegisteredAfter] = useState("")
  const [registeredBefore, setRegisteredBefore] = useState("")

  // Recipient preview
  const [recipientCount, setRecipientCount] = useState<number | null>(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)

  // Scheduling
  const [sendOption, setSendOption] = useState<"now" | "schedule">("now")
  const [scheduledDate, setScheduledDate] = useState("")
  const [scheduledTime, setScheduledTime] = useState("")

  // Load campaign
  useEffect(() => {
    fetch(`/api/admin/email/campaigns/${campaignId}`)
      .then((res) => res.json())
      .then((data) => {
        setCampaign(data)
        if (data.status === 'scheduled' && data.scheduledAt) {
          setSendOption('schedule')
          const d = new Date(data.scheduledAt)
          setScheduledDate(d.toISOString().split('T')[0])
          setScheduledTime(d.toTimeString().slice(0, 5))
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [campaignId])

  // Preview recipients when filters change
  useEffect(() => {
    const params = new URLSearchParams()
    params.set('verifiedOnly', String(verifiedOnly))
    if (inactiveDays) params.set('inactiveDays', inactiveDays)
    if (registeredAfter) params.set('registeredAfter', registeredAfter)
    if (registeredBefore) params.set('registeredBefore', registeredBefore)

    setIsPreviewLoading(true)
    fetch(`/api/admin/email/segments/preview?${params}`)
      .then((res) => res.json())
      .then((data) => setRecipientCount(data.count))
      .catch(console.error)
      .finally(() => setIsPreviewLoading(false))
  }, [verifiedOnly, inactiveDays, registeredAfter, registeredBefore])

  const handleSend = async () => {
    setIsSending(true)
    setError(null)

    try {
      let scheduledAt: string | null = null
      if (sendOption === 'schedule' && scheduledDate && scheduledTime) {
        scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
      }

      const response = await fetch(`/api/admin/email/campaigns/${campaignId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduledAt,
          verifiedOnly,
          inactiveDays: inactiveDays ? parseInt(inactiveDays) : null,
          registeredAfter: registeredAfter || null,
          registeredBefore: registeredBefore || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to send')
      }

      router.push('/admin/email')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send campaign')
    } finally {
      setIsSending(false)
      setShowConfirm(false)
    }
  }

  const handleCancel = async () => {
    try {
      const response = await fetch(`/api/admin/email/campaigns/${campaignId}/cancel`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to cancel')
      }

      router.push('/admin/email')
    } catch (err) {
      setError('Failed to cancel campaign')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!campaign) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Campaign not found</p>
        </CardContent>
      </Card>
    )
  }

  const isScheduled = campaign.status === 'scheduled'

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/email">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-semibold">Send Campaign</h1>
              <p className="text-sm text-muted-foreground">{campaign.subject}</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-4 bg-destructive/10 text-destructive rounded-lg">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {isScheduled && (
          <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <span>
                    Scheduled for{' '}
                    {campaign.scheduledAt && new Date(campaign.scheduledAt).toLocaleString()}
                  </span>
                </div>
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  Cancel Schedule
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recipient Targeting */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Target Audience
            </CardTitle>
            <CardDescription>
              Choose which users will receive this email
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="verified-only">Verified users only</Label>
                <p className="text-sm text-muted-foreground">
                  Only send to users who have verified their email
                </p>
              </div>
              <Switch
                id="verified-only"
                checked={verifiedOnly}
                onCheckedChange={setVerifiedOnly}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="inactive-days">Inactive for (days)</Label>
                <Input
                  id="inactive-days"
                  type="number"
                  min="0"
                  value={inactiveDays}
                  onChange={(e) => setInactiveDays(e.target.value)}
                  placeholder="No filter"
                />
                <p className="text-xs text-muted-foreground">
                  Target users inactive for X days
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="registered-after">Registered after</Label>
                <Input
                  id="registered-after"
                  type="date"
                  value={registeredAfter}
                  onChange={(e) => setRegisteredAfter(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="registered-before">Registered before</Label>
                <Input
                  id="registered-before"
                  type="date"
                  value={registeredBefore}
                  onChange={(e) => setRegisteredBefore(e.target.value)}
                />
              </div>
            </div>

            {/* Recipient Preview */}
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Recipients:</span>
                {isPreviewLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span className="text-xl font-bold">
                    {recipientCount?.toLocaleString() ?? 0}
                  </span>
                )}
                <span className="text-muted-foreground">users</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Scheduling */}
        {!isScheduled && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                When to Send
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup
                value={sendOption}
                onValueChange={(v) => setSendOption(v as "now" | "schedule")}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="now" id="send-now" />
                  <Label htmlFor="send-now">Send immediately</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="schedule" id="send-later" />
                  <Label htmlFor="send-later">Schedule for later</Label>
                </div>
              </RadioGroup>

              {sendOption === "schedule" && (
                <div className="grid gap-4 md:grid-cols-2 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="schedule-date">Date</Label>
                    <Input
                      id="schedule-date"
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="schedule-time">Time</Label>
                    <Input
                      id="schedule-time"
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Send Button */}
        {!isScheduled && (
          <div className="flex justify-end gap-4">
            <Link href={`/admin/email/compose/${campaignId}`}>
              <Button variant="outline">Edit Campaign</Button>
            </Link>
            <Button
              onClick={() => setShowConfirm(true)}
              disabled={recipientCount === 0 || (sendOption === "schedule" && (!scheduledDate || !scheduledTime))}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              {sendOption === "schedule" ? "Schedule Campaign" : "Send Now"}
            </Button>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {sendOption === "schedule" ? "Schedule Campaign?" : "Send Campaign Now?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {sendOption === "schedule" ? (
                <>
                  This campaign will be sent to <strong>{recipientCount?.toLocaleString()}</strong> users
                  on <strong>{scheduledDate}</strong> at <strong>{scheduledTime}</strong>.
                </>
              ) : (
                <>
                  This will immediately start sending to <strong>{recipientCount?.toLocaleString()}</strong> users.
                  This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSend} disabled={isSending}>
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {sendOption === "schedule" ? "Scheduling..." : "Sending..."}
                </>
              ) : sendOption === "schedule" ? (
                "Schedule"
              ) : (
                "Send Now"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
