"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  ArrowLeft,
  Loader2,
  Mail,
  MousePointerClick,
  Eye,
  Send,
  AlertCircle,
  Copy,
} from "lucide-react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"

interface CampaignAnalytics {
  campaign: {
    id: string
    subject: string
    status: string
    recipientCount: number
    sentAt: string | null
    createdAt: string
  }
  stats: {
    total: number
    sent: number
    failed: number
    opened: number
    clicked: number
    openRate: number
    clickRate: number
    clickToOpenRate: number
  }
}

interface EmailCampaignDetailProps {
  campaignId: string
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  sending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  sent: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
}

export function EmailCampaignDetail({ campaignId }: EmailCampaignDetailProps) {
  const router = useRouter()
  const [analytics, setAnalytics] = useState<CampaignAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCloning, setIsCloning] = useState(false)

  const handleClone = async () => {
    setIsCloning(true)
    try {
      const response = await fetch(`/api/admin/email/campaigns/${campaignId}/clone`, {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Failed to clone campaign')
      const cloned = await response.json()
      router.push(`/admin/email/compose/${cloned.id}`)
    } catch (err) {
      console.error('Failed to clone:', err)
      setIsCloning(false)
    }
  }

  useEffect(() => {
    fetch(`/api/admin/email/campaigns/${campaignId}/analytics`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error)
        setAnalytics(data)
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false))
  }, [campaignId])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !analytics) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
          <p className="text-destructive">{error || 'Campaign not found'}</p>
        </CardContent>
      </Card>
    )
  }

  const { campaign, stats } = analytics

  return (
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
            <h1 className="text-xl font-semibold">{campaign.subject}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className={statusColors[campaign.status]}>
                {campaign.status}
              </Badge>
              {campaign.sentAt && (
                <span className="text-sm text-muted-foreground">
                  Sent {formatDistanceToNow(new Date(campaign.sentAt), { addSuffix: true })}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleClone}
            disabled={isCloning}
          >
            {isCloning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {isCloning ? 'Cloning...' : 'Clone'}
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
                <Send className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.sent.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Delivered</p>
              </div>
            </div>
            {stats.failed > 0 && (
              <p className="mt-2 text-xs text-destructive">
                {stats.failed} failed
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
                <Eye className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.opened.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Opened</p>
              </div>
            </div>
            <div className="mt-2">
              <div className="flex justify-between text-xs mb-1">
                <span>Open rate</span>
                <span className="font-medium">{stats.openRate}%</span>
              </div>
              <Progress value={stats.openRate} className="h-1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900">
                <MousePointerClick className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.clicked.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Clicked</p>
              </div>
            </div>
            <div className="mt-2">
              <div className="flex justify-between text-xs mb-1">
                <span>Click rate</span>
                <span className="font-medium">{stats.clickRate}%</span>
              </div>
              <Progress value={stats.clickRate} className="h-1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-orange-100 dark:bg-orange-900">
                <Mail className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.clickToOpenRate}%</p>
                <p className="text-sm text-muted-foreground">Click-to-Open</p>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Of those who opened
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Summary</CardTitle>
          <CardDescription>
            Campaign metrics at a glance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h4 className="font-medium mb-2">Delivery</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total recipients</span>
                  <span>{stats.total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Successfully delivered</span>
                  <span className="text-green-600">{stats.sent.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Failed</span>
                  <span className="text-destructive">{stats.failed.toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Engagement</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Unique opens</span>
                  <span>{stats.opened.toLocaleString()} ({stats.openRate}%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Unique clicks</span>
                  <span>{stats.clicked.toLocaleString()} ({stats.clickRate}%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Click-to-open rate</span>
                  <span>{stats.clickToOpenRate}%</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
