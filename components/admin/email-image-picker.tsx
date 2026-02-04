"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Upload, Trash2, Image as ImageIcon, Check } from "lucide-react"

interface EmailImage {
  id: string
  filename: string
  url: string
  size: number
  mimeType: string
  uploadedAt: string
}

interface EmailImagePickerProps {
  open: boolean
  onClose: () => void
  onSelect: (url: string) => void
}

export function EmailImagePicker({ open, onClose, onSelect }: EmailImagePickerProps) {
  const [images, setImages] = useState<EmailImage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
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
    if (open) {
      fetchImages()
    }
  }, [open, fetchImages])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setError(null)

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

      await fetchImages()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploading(false)
      // Reset file input
      e.target.value = ''
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/email/images/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Delete failed')
      setImages(images.filter(img => img.id !== id))
      if (selectedId === id) setSelectedId(null)
    } catch (err) {
      console.error(err)
    }
  }

  const handleInsert = () => {
    const selected = images.find(img => img.id === selectedId)
    if (selected) {
      onSelect(selected.url)
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Insert Image</DialogTitle>
          <DialogDescription>
            Upload a new image or select from your library
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
          {/* Upload Section */}
          <div className="border-2 border-dashed rounded-lg p-6">
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div className="text-center">
                <Label
                  htmlFor="image-upload"
                  className="text-primary cursor-pointer hover:underline"
                >
                  {isUploading ? 'Uploading...' : 'Click to upload'}
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  JPG, PNG, GIF, or WebP. Max 2MB.
                </p>
              </div>
              <Input
                id="image-upload"
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={handleUpload}
                disabled={isUploading}
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {/* Image Gallery */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : images.length === 0 ? (
            <div className="text-center py-8">
              <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No images uploaded yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {images.map((image) => (
                <div
                  key={image.id}
                  className={`relative group border rounded-lg overflow-hidden cursor-pointer transition-all ${
                    selectedId === image.id
                      ? 'ring-2 ring-primary'
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedId(image.id)}
                >
                  <div className="aspect-video relative bg-muted">
                    <img
                      src={image.url}
                      alt={image.filename}
                      className="w-full h-full object-cover"
                    />
                    {selectedId === image.id && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <Check className="h-8 w-8 text-primary" />
                      </div>
                    )}
                  </div>
                  <div className="p-2 bg-background">
                    <p className="text-xs font-medium truncate">{image.filename}</p>
                    <p className="text-xs text-muted-foreground">{formatSize(image.size)}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(image.id)
                    }}
                    className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete image"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleInsert} disabled={!selectedId}>
            Insert Image
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
