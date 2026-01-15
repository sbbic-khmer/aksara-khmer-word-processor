"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { FileText, Trash2, Clock } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface Document {
  id: string
  title: string
  created_at: string
  updated_at: string
}

interface DocumentsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpen: (docId: string) => void
  onDelete: (id: string) => void
}

export function DocumentsDialog({ open, onOpenChange, onOpen, onDelete }: DocumentsDialogProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    if (open) {
      fetchDocuments()
    }
  }, [open])

  const fetchDocuments = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/documents")
      if (response.ok) {
        const docs = await response.json()
        setDocuments(docs)
      }
    } catch (error) {
      console.error("[v0] Error fetching documents:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm("Are you sure you want to delete this document?")) {
      try {
        const response = await fetch(`/api/documents/${id}`, { method: "DELETE" })
        if (response.ok) {
          setDocuments((docs) => docs.filter((d) => d.id !== id))
          onDelete(id)
        }
      } catch (error) {
        console.error("[v0] Error deleting document:", error)
      }
    }
  }

  const filteredDocs = documents.filter((doc) => doc.title.toLowerCase().includes(searchQuery.toLowerCase()))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>My Documents</DialogTitle>
          <DialogDescription>Open a saved document or create a new one</DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>

        <div className="flex-1 overflow-y-auto min-h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center h-full text-gray-500">Loading documents...</div>
          ) : filteredDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <FileText className="h-12 w-12 mb-2 opacity-50" />
              {searchQuery ? "No documents match your search" : "No documents yet"}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredDocs.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => {
                    onOpen(doc.id)
                    onOpenChange(false)
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left group"
                >
                  <FileText className="h-5 w-5 text-blue-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{doc.title}</div>
                    <div className="text-sm text-gray-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(doc.updated_at), { addSuffix: true })}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => handleDelete(doc.id, e)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
