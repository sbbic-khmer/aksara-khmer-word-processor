"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { Plus, MoreHorizontal, Edit, Copy, Trash2, Send, Loader2, Mail, Eye } from "lucide-react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"

interface Campaign {
  id: string
  subject: string
  senderName: string | null
  status: 'draft' | 'scheduled' | 'sending' | 'sent'
  scheduledAt: string | null
  sentAt: string | null
  createdAt: string
  updatedAt: string
  recipientCount: number
  _count: {
    sends: number
  }
  // Analytics (fetched separately for sent campaigns)
  opened?: number
  clicked?: number
  openRate?: number
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  sending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  sent: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
}

export function EmailCampaignList() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    fetchCampaigns()
  }, [])

  const fetchCampaigns = async () => {
    try {
      const response = await fetch('/api/admin/email/campaigns')
      if (!response.ok) throw new Error('Failed to fetch campaigns')
      const data: Campaign[] = await response.json()

      // Fetch analytics for sent campaigns
      const campaignsWithAnalytics = await Promise.all(
        data.map(async (campaign) => {
          if (campaign.status === 'sent' && campaign.recipientCount > 0) {
            try {
              const analyticsRes = await fetch(`/api/admin/email/campaigns/${campaign.id}/analytics`)
              if (analyticsRes.ok) {
                const analytics = await analyticsRes.json()
                return {
                  ...campaign,
                  opened: analytics.stats.opened,
                  clicked: analytics.stats.clicked,
                  openRate: analytics.stats.openRate,
                }
              }
            } catch {
              // Ignore analytics fetch errors
            }
          }
          return campaign
        })
      )

      setCampaigns(campaignsWithAnalytics)
    } catch (err) {
      setError('Failed to load campaigns')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClone = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/email/campaigns/${id}/clone`, {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Failed to clone campaign')
      await fetchCampaigns()
    } catch (err) {
      console.error('Failed to clone:', err)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/admin/email/campaigns/${deleteId}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete campaign')
      await fetchCampaigns()
    } catch (err) {
      console.error('Failed to delete:', err)
    } finally {
      setIsDeleting(false)
      setDeleteId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12">
          <p className="text-center text-destructive">{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Campaigns
            </CardTitle>
            <CardDescription>
              Create and manage email campaigns to send to your users
            </CardDescription>
          </div>
          <Link href="/admin/email/compose">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Campaign
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No campaigns yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first email campaign to engage with your users.
              </p>
              <Link href="/admin/email/compose">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Campaign
                </Button>
              </Link>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-[70px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium">
                        <div>
                          <p className="truncate max-w-[300px]">{campaign.subject}</p>
                          {campaign.senderName && (
                            <p className="text-sm text-muted-foreground">
                              From: {campaign.senderName}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusColors[campaign.status]}>
                          {campaign.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {campaign.status === 'sent' && campaign.recipientCount > 0 ? (
                          <div className="text-sm">
                            <span>{campaign.recipientCount.toLocaleString()}</span>
                            {campaign.openRate !== undefined && (
                              <span className="text-muted-foreground ml-2">
                                ({campaign.openRate}% opened)
                              </span>
                            )}
                          </div>
                        ) : campaign._count.sends > 0 ? (
                          <span>{campaign._count.sends.toLocaleString()}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {campaign.sentAt ? (
                          <span title={new Date(campaign.sentAt).toLocaleString()}>
                            Sent {formatDistanceToNow(new Date(campaign.sentAt), { addSuffix: true })}
                          </span>
                        ) : campaign.scheduledAt ? (
                          <span title={new Date(campaign.scheduledAt).toLocaleString()}>
                            Scheduled {formatDistanceToNow(new Date(campaign.scheduledAt), { addSuffix: true })}
                          </span>
                        ) : (
                          <span title={new Date(campaign.updatedAt).toLocaleString()}>
                            Updated {formatDistanceToNow(new Date(campaign.updatedAt), { addSuffix: true })}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/email/compose/${campaign.id}`}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </Link>
                              </DropdownMenuItem>
                            )}
                            {campaign.status === 'scheduled' && (
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/email/send/${campaign.id}`}>
                                  <Send className="h-4 w-4 mr-2" />
                                  Modify Schedule
                                </Link>
                              </DropdownMenuItem>
                            )}
                            {(campaign.status === 'sent' || campaign.status === 'sending') && (
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/email/campaign/${campaign.id}`}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleClone(campaign.id)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Clone
                            </DropdownMenuItem>
                            {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDeleteId(campaign.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this campaign? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
