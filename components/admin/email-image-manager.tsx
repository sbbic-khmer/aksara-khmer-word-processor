"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Loader2, Upload, Trash2, Image as ImageIcon, Copy, Check } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface EmailImage {
  id: string
  filename: string
  url: string
  size: number
  mimeType: string
  uploadedAt: string
}

export function EmailImageManager() {
  const [images, setImages] = useState<EmailImage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchImages = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/email/images')
      if (!response.ok) throw new Error('Failed to fetch images')
      const data = await response.json()
      setImages(data)
    } catch (err) {
      console.error(err)
      setError('Failed to load images')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchImages()
  }, [fetchImages])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    setError(null)

    for (const file of Array.from(files)) {
      try {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/admin/email/images', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Upload failed')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed')
        break
      }
    }

    await fetchImages()
    setIsUploading(false)
    e.target.value = ''
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)

    try {
      const response = await fetch(`/api/admin/email/images/${deleteId}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Delete failed')
      setImages(images.filter(img => img.id !== deleteId))
    } catch (err) {
      console.error(err)
      setError('Failed to delete image')
    } finally {
      setIsDeleting(false)
      setDeleteId(null)
    }
  }

  const handleCopyUrl = async (image: EmailImage) => {
    try {
      await navigator.clipboard.writeText(image.url)
      setCopiedId(image.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const totalSize = images.reduce((acc, img) => acc + img.size, 0)

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Email Images
          </CardTitle>
          <CardDescription>
            Manage images for your email campaigns. {images.length} images, {formatSize(totalSize)} total.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Upload Section */}
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <div>
              <Label
                htmlFor="image-upload"
                className="text-primary cursor-pointer hover:underline font-medium"
              >
                {isUploading ? 'Uploading...' : 'Click to upload images'}
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                JPG, PNG, GIF, or WebP. Max 2MB per image.
              </p>
            </div>
            <Input
              id="image-upload"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              multiple
              className="hidden"
              onChange={handleUpload}
              disabled={isUploading}
            />
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Image Gallery */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : images.length === 0 ? (
            <div className="text-center py-12">
              <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No images yet</h3>
              <p className="text-muted-foreground">
                Upload images to use in your email campaigns.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {images.map((image) => (
                <div
                  key={image.id}
                  className="border rounded-lg overflow-hidden bg-card"
                >
                  <div className="aspect-video relative bg-muted">
                    <img
                      src={image.url}
                      alt={image.filename}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-3 space-y-2">
                    <div>
                      <p className="font-medium truncate text-sm" title={image.filename}>
                        {image.filename}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatSize(image.size)} · Uploaded {formatDistanceToNow(new Date(image.uploadedAt), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleCopyUrl(image)}
                      >
                        {copiedId === image.id ? (
                          <>
                            <Check className="h-3 w-3 mr-1" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3 mr-1" />
                            Copy URL
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(image.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Image</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this image? This action cannot be undone.
              If this image is used in any sent campaigns, it will no longer display.
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
