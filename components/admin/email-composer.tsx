"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  Save,
  Send,
  Loader2,
  Eye,
  Edit as EditIcon,
  Image as ImageIcon,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link as LinkIcon,
  Heading1,
  Heading2,
} from "lucide-react"
import Link from "next/link"
import { EmailPreview } from "./email-preview"
import { EmailImagePicker } from "./email-image-picker"

interface EmailComposerProps {
  campaignId?: string
}

interface Campaign {
  id: string
  subject: string
  senderName: string | null
  htmlContent: string
  editorState: string | null
  status: string
}

export function EmailComposer({ campaignId }: EmailComposerProps) {
  const router = useRouter()
  const isEditing = !!campaignId

  const [subject, setSubject] = useState("")
  const [senderName, setSenderName] = useState("")
  const [htmlContent, setHtmlContent] = useState("")
  const [activeTab, setActiveTab] = useState<string>("edit")
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showImagePicker, setShowImagePicker] = useState(false)
  const [showSendConfirm, setShowSendConfirm] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Load existing campaign
  useEffect(() => {
    if (campaignId) {
      setIsLoading(true)
      fetch(`/api/admin/email/campaigns/${campaignId}`)
        .then((res) => res.json())
        .then((data: Campaign) => {
          setSubject(data.subject)
          setSenderName(data.senderName || "")
          setHtmlContent(data.htmlContent || "")
        })
        .catch(console.error)
        .finally(() => setIsLoading(false))
    }
  }, [campaignId])

  // Track unsaved changes
  useEffect(() => {
    setHasUnsavedChanges(true)
  }, [subject, senderName, htmlContent])

  const handleSave = async () => {
    if (!subject.trim()) {
      alert("Please enter a subject line")
      return
    }

    setIsSaving(true)
    try {
      const url = campaignId
        ? `/api/admin/email/campaigns/${campaignId}`
        : "/api/admin/email/campaigns"
      const method = campaignId ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          senderName: senderName || null,
          htmlContent,
          status: "draft",
        }),
      })

      if (!response.ok) throw new Error("Failed to save")

      const data = await response.json()
      setHasUnsavedChanges(false)

      if (!campaignId) {
        // Redirect to edit page for new campaigns
        router.push(`/admin/email/compose/${data.id}`)
      }
    } catch (err) {
      console.error("Save error:", err)
      alert("Failed to save campaign")
    } finally {
      setIsSaving(false)
    }
  }

  const insertText = (before: string, after: string = "") => {
    const textarea = document.getElementById("html-content") as HTMLTextAreaElement
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = htmlContent.substring(start, end)
    const newText =
      htmlContent.substring(0, start) +
      before +
      selectedText +
      after +
      htmlContent.substring(end)

    setHtmlContent(newText)

    // Restore cursor position
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(
        start + before.length,
        start + before.length + selectedText.length
      )
    }, 0)
  }

  const insertImage = (url: string) => {
    insertText(`<img src="${url}" alt="" style="max-width: 100%; height: auto;" />\n`)
    setShowImagePicker(false)
  }

  const toolbarButtons = [
    { icon: Bold, action: () => insertText("<strong>", "</strong>"), title: "Bold" },
    { icon: Italic, action: () => insertText("<em>", "</em>"), title: "Italic" },
    { icon: Underline, action: () => insertText("<u>", "</u>"), title: "Underline" },
    { icon: Heading1, action: () => insertText("<h1>", "</h1>"), title: "Heading 1" },
    { icon: Heading2, action: () => insertText("<h2>", "</h2>"), title: "Heading 2" },
    { icon: List, action: () => insertText("<ul>\n  <li>", "</li>\n</ul>"), title: "Bullet List" },
    { icon: ListOrdered, action: () => insertText("<ol>\n  <li>", "</li>\n</ol>"), title: "Numbered List" },
    { icon: LinkIcon, action: () => insertText('<a href="">', "</a>"), title: "Link" },
    { icon: ImageIcon, action: () => setShowImagePicker(true), title: "Insert Image" },
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

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
            <h1 className="text-xl font-semibold">
              {isEditing ? "Edit Campaign" : "New Campaign"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Draft
                </>
              )}
            </Button>
            {campaignId && (
              <Link href={`/admin/email/send/${campaignId}`}>
                <Button className="gap-2">
                  <Send className="h-4 w-4" />
                  Schedule / Send
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Campaign Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Campaign Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject Line *</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Enter email subject"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sender-name">Sender Name (optional)</Label>
                <Input
                  id="sender-name"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="e.g., Aksara Pro Team"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Email Content */}
        <Card>
          <CardContent className="pt-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="edit" className="gap-2">
                  <EditIcon className="h-4 w-4" />
                  Edit
                </TabsTrigger>
                <TabsTrigger value="preview" className="gap-2">
                  <Eye className="h-4 w-4" />
                  Preview
                </TabsTrigger>
              </TabsList>

              <TabsContent value="edit" className="space-y-4 mt-4">
                {/* Toolbar */}
                <div className="flex flex-wrap gap-1 p-2 bg-muted rounded-md">
                  {toolbarButtons.map((btn, i) => (
                    <Button
                      key={i}
                      variant="ghost"
                      size="sm"
                      onClick={btn.action}
                      title={btn.title}
                      className="h-8 w-8 p-0"
                    >
                      <btn.icon className="h-4 w-4" />
                    </Button>
                  ))}
                </div>

                {/* HTML Editor */}
                <div className="space-y-2">
                  <Label htmlFor="html-content">Email Content (HTML)</Label>
                  <Textarea
                    id="html-content"
                    value={htmlContent}
                    onChange={(e) => setHtmlContent(e.target.value)}
                    placeholder="Enter your email content here. You can use HTML tags for formatting."
                    className="min-h-[400px] font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use the toolbar buttons to insert HTML formatting, or write HTML directly.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="preview" className="mt-4">
                <EmailPreview htmlContent={htmlContent} subject={subject} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Image Picker Dialog */}
      <EmailImagePicker
        open={showImagePicker}
        onClose={() => setShowImagePicker(false)}
        onSelect={insertImage}
      />
    </>
  )
}
