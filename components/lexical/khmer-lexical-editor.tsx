"use client"

import type React from "react"

import { useState, useCallback, useRef, forwardRef, useImperativeHandle, useEffect } from "react"
import { LexicalComposer } from "@lexical/react/LexicalComposer"
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin"
import { ContentEditable } from "@lexical/react/LexicalContentEditable"
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin"
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary"
import { HeadingNode } from "@lexical/rich-text"
import { ListItemNode, ListNode } from "@lexical/list"
import { ListPlugin } from "@lexical/react/LexicalListPlugin"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { useTheme } from "next-themes"
import { $getRoot, $isTextNode, $isElementNode, $isParagraphNode, $getSelection, $isRangeSelection } from "lexical"

import { KhmerBreakNode } from "./nodes/khmer-break-node"
import { KhmerWordBreakPlugin } from "./plugins/khmer-word-break-plugin"
import { VoiceInputPlugin, INSERT_VOICE_TEXT_COMMAND } from "./plugins/voice-input-plugin"
import { ToolbarPlugin, useToolbarCommands, type ActiveFormats } from "./plugins/toolbar-plugin"
import { OnChangePlugin } from "./plugins/on-change-plugin"
import { $isKhmerBreakNode } from "./nodes/khmer-break-node"
import { $isHeadingNode } from "@lexical/rich-text"
import { $isListNode, $isListItemNode } from "@lexical/list"

import { KhmerBreaker } from "@/lib/khmer-breaker"
import { KHMER_DICTIONARY } from "@/lib/khmer-dictionary-data"
import { VoiceInput, type VoiceInputHandle } from "@/components/voice-input"
import { VoiceIndicator } from "@/components/voice-indicator"
import { FormattingToolbar } from "@/components/editor/formatting-toolbar"
import { FileMenu } from "@/components/editor/file-menu"
import { EditorHeader } from "@/components/editor/editor-header"
import { DocumentsDialog } from "@/components/editor/documents-dialog"
import { SaveDialog } from "@/components/editor/save-dialog"
import { ConflictDialog } from "@/components/editor/conflict-dialog"
import { useReplacements } from "@/hooks/use-replacements"
import { usePreferences } from "@/hooks/use-preferences"
import { exportToOdtFromLexical } from "@/lib/odt-export-lexical"
import { cn } from "@/lib/utils"
import {
  setDebugEnabled,
  debugLog,
  isDebugEnabled,
  setWordBreakerDebugEnabled,
  isWordBreakerDebugEnabled,
} from "@/lib/debug"
import { Loader2 } from "lucide-react"

// const LAST_DOCUMENT_KEY = "aksara-last-document-id"

interface DocumentState {
  id: string | null
  title: string
  hasUnsavedChanges: boolean
  saveStatus: "idle" | "saving" | "saved" | "error"
  lastSavedAt: string | null // ISO timestamp of when we last loaded/saved this document
}

interface KhmerLexicalEditorProps {
  className?: string
  initialEditorState?: string
}

export interface KhmerLexicalEditorHandle {
  insertText: (text: string) => void
  focus: () => void
}

const lexicalTheme = {
  paragraph: "mb-1",
  heading: {
    h1: "text-3xl font-bold mb-2",
    h2: "text-2xl font-bold mb-2",
    h3: "text-xl font-bold mb-2",
  },
  list: {
    ul: "list-disc ml-6",
    ol: "list-decimal ml-6",
    listitem: "mb-1",
  },
  text: {
    bold: "font-bold",
    italic: "italic",
    underline: "underline",
    strikethrough: "line-through",
    highlight: "bg-yellow-200 dark:bg-yellow-500/50",
  },
}

function onError(error: Error) {
  console.error("[v0] Lexical error:", error)
}

const ZWSP = "\u200B"

function extractTextFromSelection(
  editor: ReturnType<typeof useLexicalComposerContext>[0],
): { text: string; html: string } | null {
  let result: { text: string; html: string } | null = null

  editor.getEditorState().read(() => {
    const selection = $getSelection()
    if (!selection || !$isRangeSelection(selection)) {
      return
    }

    // Get the selected nodes
    const nodes = selection.getNodes()
    if (nodes.length === 0) {
      return
    }

    let plainText = ""
    let html = ""

    // Get the anchor and focus points
    const anchor = selection.anchor
    const focus = selection.focus
    const isBackward = selection.isBackward()

    const startPoint = isBackward ? focus : anchor
    const endPoint = isBackward ? anchor : focus

    nodes.forEach((node, nodeIndex) => {
      if ($isKhmerBreakNode(node)) {
        plainText += ZWSP
        html += ZWSP
      } else if ($isTextNode(node)) {
        let text = node.getTextContent()

        // If this is the first node, slice from start offset
        if (nodeIndex === 0 && node.getKey() === startPoint.key) {
          text = text.slice(startPoint.offset)
        }
        // If this is the last node, slice to end offset
        if (nodeIndex === nodes.length - 1 && node.getKey() === endPoint.key) {
          const startOffset = nodeIndex === 0 && node.getKey() === startPoint.key ? startPoint.offset : 0
          text = node.getTextContent().slice(startOffset, endPoint.offset)
        }

        plainText += text

        // Build HTML with formatting
        let formattedText = text
        const format = node.getFormat()
        if (format & 1) formattedText = `<strong>${formattedText}</strong>` // bold
        if (format & 2) formattedText = `<em>${formattedText}</em>` // italic
        if (format & 4) formattedText = `<s>${formattedText}</s>` // strikethrough
        if (format & 8) formattedText = `<u>${formattedText}</u>` // underline
        html += formattedText
      } else if ($isParagraphNode(node) || $isHeadingNode(node)) {
        // For paragraph/heading nodes, we need newlines
        if (nodeIndex > 0) {
          plainText += "\n"
          html += "<br>"
        }
      }
    })

    // Wrap in styled container for Khmer font
    html = `<div style="font-family: 'Khmer Mondulkiri', 'Battambang', sans-serif;">${html}</div>`

    result = { text: plainText, html }
  })

  return result
}

function extractTextWithZWSP(editor: ReturnType<typeof useLexicalComposerContext>[0]): { text: string; html: string } {
  let plainText = ""
  let html = ""

  editor.getEditorState().read(() => {
    const root = $getRoot()
    const children = root.getChildren()

    children.forEach((child, index) => {
      if ($isParagraphNode(child) || $isHeadingNode(child)) {
        const tag = $isHeadingNode(child) ? child.getTag() : "p"
        let paragraphText = ""
        let paragraphHtml = ""

        const processNode = (node: typeof child) => {
          node.getChildren().forEach((n) => {
            if ($isKhmerBreakNode(n)) {
              paragraphText += ZWSP
              paragraphHtml += ZWSP
            } else if ($isTextNode(n)) {
              const text = n.getTextContent()
              paragraphText += text

              // Build HTML with formatting
              let formattedText = text
              const format = n.getFormat()
              if (format & 1) formattedText = `<strong>${formattedText}</strong>` // bold
              if (format & 2) formattedText = `<em>${formattedText}</em>` // italic
              if (format & 4) formattedText = `<s>${formattedText}</s>` // strikethrough
              if (format & 8) formattedText = `<u>${formattedText}</u>` // underline
              paragraphHtml += formattedText
            } else if ($isElementNode(n)) {
              // Recursively process nested elements
              n.getChildren().forEach((nested) => {
                if ($isKhmerBreakNode(nested)) {
                  paragraphText += ZWSP
                  paragraphHtml += ZWSP
                } else if ($isTextNode(nested)) {
                  paragraphText += nested.getTextContent()
                  paragraphHtml += nested.getTextContent()
                }
              })
            }
          })
        }

        processNode(child)

        plainText += paragraphText
        html += `<${tag} style="font-family: 'Khmer Mondulkiri', 'Battambang', sans-serif;">${paragraphHtml}</${tag}>`

        if (index < children.length - 1) {
          plainText += "\n"
        }
      } else if ($isListNode(child)) {
        const listTag = child.getListType() === "number" ? "ol" : "ul"
        html += `<${listTag}>`

        child.getChildren().forEach((listItem) => {
          if ($isListItemNode(listItem)) {
            let itemText = ""
            let itemHtml = ""

            listItem.getChildren().forEach((n) => {
              if ($isKhmerBreakNode(n)) {
                itemText += ZWSP
                itemHtml += ZWSP
              } else if ($isTextNode(n)) {
                itemText += n.getTextContent()
                itemHtml += n.getTextContent()
              }
            })

            plainText += itemText + "\n"
            html += `<li>${itemHtml}</li>`
          }
        })

        html += `</${listTag}>`
      }
    })
  })

  return { text: plainText, html }
}

function EditorContent({
  breaker,
  showBreaks,
  setShowBreaks,
  onActiveFormatsChange,
  onTextChange,
  voiceInputRef,
  applyReplacements,
  onExportOdt,
  debugMode,
  setDebugMode,
  wordBreakerDebugMode,
  setWordBreakerDebugMode,
  onVoiceStateChange,
  onPartialTranscriptChange,
  documentState,
  onNew,
  onOpenDialog,
  onSave,
  onSaveAs,
  onContentChange,
}: {
  breaker: KhmerBreaker
  showBreaks: boolean
  setShowBreaks: (show: boolean) => void
  onActiveFormatsChange: (formats: ActiveFormats) => void
  onTextChange: (text: string, wordCount: number, charCount: number) => void
  voiceInputRef: React.RefObject<VoiceInputHandle | null>
  applyReplacements: (text: string) => string
  onExportOdt: () => void
  debugMode: boolean
  setDebugMode: (debug: boolean) => void
  wordBreakerDebugMode: boolean
  setWordBreakerDebugMode: (debug: boolean) => void
  onVoiceStateChange: (active: boolean) => void
  onPartialTranscriptChange: (text: string) => void
  documentState: DocumentState
  onNew: () => void
  onOpenDialog: () => void
  onSave: () => void
  onSaveAs: () => void
  onContentChange: () => void
}) {
  const [editor] = useLexicalComposerContext()
  const { formatText, undo, redo, insertZWSP, joinWord } = useToolbarCommands()
  const [activeFormats, setActiveFormats] = useState<ActiveFormats>({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    highlight: false,
    heading: null,
    fontSize: "4",
    alignment: "left",
    list: null,
  })

  const handleFormatsChange = useCallback(
    (formats: ActiveFormats) => {
      setActiveFormats(formats)
      onActiveFormatsChange(formats)
    },
    [onActiveFormatsChange],
  )

  const handleVoiceTranscript = useCallback(
    (text: string) => {
      editor.dispatchCommand(INSERT_VOICE_TEXT_COMMAND, text)
      onPartialTranscriptChange("")
    },
    [editor, onPartialTranscriptChange],
  )

  const handlePartialTranscript = useCallback(
    (text: string) => {
      onPartialTranscriptChange(text)
    },
    [onPartialTranscriptChange],
  )

  const handleCopyWithBreaks = useCallback(() => {
    const { text, html } = extractTextWithZWSP(editor)

    // Use ClipboardItem API for rich text support
    if (typeof ClipboardItem !== "undefined") {
      const clipboardItem = new ClipboardItem({
        "text/plain": new Blob([text], { type: "text/plain" }),
        "text/html": new Blob([html], { type: "text/html" }),
      })
      navigator.clipboard.write([clipboardItem])
    } else {
      // Fallback for browsers without ClipboardItem support
      navigator.clipboard.writeText(text)
    }
  }, [editor])

  useEffect(() => {
    const handleCopy = (e: ClipboardEvent) => {
      const selection = window.getSelection()
      if (!selection || selection.isCollapsed) return

      // Check if copy is from inside the editor
      const editorElement = editor.getRootElement()
      if (!editorElement) return

      const anchorNode = selection.anchorNode
      if (!anchorNode || !editorElement.contains(anchorNode)) return

      e.preventDefault()

      const selectionResult = extractTextFromSelection(editor)
      if (selectionResult && e.clipboardData) {
        e.clipboardData.setData("text/plain", selectionResult.text)
        e.clipboardData.setData("text/html", selectionResult.html)
      }
    }

    document.addEventListener("copy", handleCopy)
    return () => document.removeEventListener("copy", handleCopy)
  }, [editor])

  const handleToggleDebug = useCallback(() => {
    const newValue = !debugMode
    setDebugMode(newValue)
    setDebugEnabled(newValue)
    debugLog("Debug mode", newValue ? "enabled" : "disabled")
  }, [debugMode, setDebugMode])

  const handleToggleWordBreakerDebug = useCallback(() => {
    const newValue = !wordBreakerDebugMode
    setWordBreakerDebugMode(newValue)
    setWordBreakerDebugEnabled(newValue)
    debugLog("Word Breaker Debug mode", newValue ? "enabled" : "disabled")
  }, [wordBreakerDebugMode, setWordBreakerDebugMode])

  return (
    <>
      <ToolbarPlugin onFormatsChange={handleFormatsChange} />
      <KhmerWordBreakPlugin breaker={breaker} showBreaks={showBreaks} />
      <VoiceInputPlugin />
      <OnChangePlugin onChange={onTextChange} onContentChange={onContentChange} breaker={breaker} />
      <HistoryPlugin />
      <ListPlugin />

      <div className="flex flex-wrap items-center gap-1 px-2 sm:px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <FileMenu
          onNew={onNew}
          onOpen={onOpenDialog}
          onSave={onSave}
          onSaveAs={onSaveAs}
          onCopyWithBreaks={handleCopyWithBreaks}
          onExportOdt={onExportOdt}
          debugMode={debugMode}
          onToggleDebug={handleToggleDebug}
          wordBreakerDebugMode={wordBreakerDebugMode}
          onToggleWordBreakerDebug={handleToggleWordBreakerDebug}
          hasUnsavedChanges={documentState.hasUnsavedChanges}
          currentDocTitle={documentState.title}
        />

        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

        <FormattingToolbar
          activeFormats={activeFormats}
          onFormat={formatText}
          onUndo={undo}
          onRedo={redo}
          onInsertZWSP={insertZWSP}
          onJoinWord={joinWord}
          showBreaks={showBreaks}
          onToggleBreaks={() => setShowBreaks(!showBreaks)}
        />

        <div className="ml-auto flex items-center">
          <VoiceInput
            ref={voiceInputRef}
            onTranscript={handleVoiceTranscript}
            onPartialTranscript={handlePartialTranscript}
            onVoiceStateChange={onVoiceStateChange}
            applyReplacements={applyReplacements}
          />
        </div>
      </div>

      <div className="flex-1 bg-gray-100 dark:bg-gray-800 overflow-auto">
        <div className="max-w-[816px] mx-auto my-6 bg-white dark:bg-gray-900 shadow-lg rounded-sm min-h-[1056px] relative">
          {documentState.id ? (
            <RichTextPlugin
              contentEditable={
                <ContentEditable
                  className={cn(
                    "min-h-[1056px] p-12 outline-none",
                    "font-khmer text-lg leading-relaxed",
                    "focus:outline-none",
                  )}
                  style={{
                    fontFamily: 'var(--font-battambang), "Noto Sans Khmer", sans-serif',
                  }}
                />
              }
              placeholder={
                <div
                  className="absolute top-12 left-12 text-gray-400 dark:text-gray-500 pointer-events-none font-khmer"
                  style={{
                    fontFamily: 'var(--font-battambang), "Noto Sans Khmer", sans-serif',
                  }}
                >
                  វាយបញ្ចូលជាភាសាខ្មែរនៅទីនេះ...
                </div>
              }
              ErrorBoundary={LexicalErrorBoundary}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Loading document...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function EditorWrapper({
  breaker,
  showBreaks,
  setShowBreaks,
  onActiveFormatsChange,
  onTextChange,
  voiceInputRef,
  applyReplacements,
  onExportOdt,
  debugMode,
  setDebugMode,
  wordBreakerDebugMode,
  setWordBreakerDebugMode,
  onVoiceStateChange,
  onPartialTranscriptChange,
  documentState,
  setDocumentState,
  initialEditorState,
  lastOpenedDocumentId,
  updateLastOpenedDocumentId,
  isLoadingPreferences,
}: {
  breaker: KhmerBreaker
  showBreaks: boolean
  setShowBreaks: (show: boolean) => void
  onActiveFormatsChange: (formats: ActiveFormats) => void
  onTextChange: (text: string, wordCount: number, charCount: number) => void
  voiceInputRef: React.RefObject<VoiceInputHandle | null>
  applyReplacements: (text: string) => string
  onExportOdt: () => void
  debugMode: boolean
  setDebugMode: (debug: boolean) => void
  wordBreakerDebugMode: boolean
  setWordBreakerDebugMode: (debug: boolean) => void
  onVoiceStateChange: (active: boolean) => void
  onPartialTranscriptChange: (text: string) => void
  documentState: DocumentState
  setDocumentState: React.Dispatch<React.SetStateAction<DocumentState>>
  initialEditorState: string | null
  lastOpenedDocumentId: string | null
  updateLastOpenedDocumentId: (id: string | null) => void
  isLoadingPreferences: boolean
}) {
  const [editor] = useLexicalComposerContext()
  const [openDialogOpen, setOpenDialogOpen] = useState(false)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [isSaveAs, setIsSaveAs] = useState(false)
  const [isLoadingDocument, setIsLoadingDocument] = useState(true)
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false)
  const [conflictServerUpdatedAt, setConflictServerUpdatedAt] = useState<string | null>(null)
  const initialLoadRef = useRef(false)
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const savedStatusTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastDocLoadedRef = useRef(false)
  const documentStateRef = useRef(documentState)
  const skipNextContentChangeRef = useRef(false)

  useEffect(() => {
    documentStateRef.current = documentState
  }, [documentState])

  useEffect(() => {
    if (lastDocLoadedRef.current || isLoadingPreferences) return
    lastDocLoadedRef.current = true

    if (lastOpenedDocumentId) {
      // Load the last document from preferences
      fetch(`/api/documents/${lastOpenedDocumentId}`)
        .then((res) => {
          if (res.ok) return res.json()
          throw new Error("Document not found")
        })
        .then((doc) => {
          try {
            if (doc.editor_state) {
              const state = editor.parseEditorState(doc.editor_state)
              editor.setEditorState(state)
            }
            setDocumentState({
              id: doc.id,
              title: doc.title,
              hasUnsavedChanges: false,
              saveStatus: "idle",
              lastSavedAt: doc.updated_at,
            })
          } catch (error) {
            console.error("[v0] Error parsing editor state, starting fresh:", error)
            // Clear the corrupted document reference
            updateLastOpenedDocumentId(null)
          }
        })
        .catch(() => {
          // Document was deleted or doesn't exist, clear preference
          updateLastOpenedDocumentId(null)
        })
        .finally(() => {
          setIsLoadingDocument(false)
        })
    } else {
      setIsLoadingDocument(false)
    }
  }, [editor, setDocumentState, lastOpenedDocumentId, updateLastOpenedDocumentId, isLoadingPreferences])

  useEffect(() => {
    if (initialEditorState && !initialLoadRef.current) {
      initialLoadRef.current = true
      try {
        const state = editor.parseEditorState(initialEditorState)
        editor.setEditorState(state)
      } catch (error) {
        console.error("[v0] Error loading editor state:", error)
      }
    }
  }, [editor, initialEditorState])

  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current)
      if (savedStatusTimeoutRef.current) clearTimeout(savedStatusTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    if (documentState.id) {
      updateLastOpenedDocumentId(documentState.id)
    }
  }, [documentState.id, updateLastOpenedDocumentId])

  const handleNew = useCallback(() => {
    if (documentState.hasUnsavedChanges) {
      if (!confirm("You have unsaved changes. Create a new document anyway?")) {
        return
      }
    }
    skipNextContentChangeRef.current = true
    editor.update(() => {
      const root = $getRoot()
      root.clear()
    })
    setDocumentState({ id: null, title: "Untitled", hasUnsavedChanges: false, saveStatus: "idle", lastSavedAt: null })
    updateLastOpenedDocumentId(null)
  }, [editor, documentState.hasUnsavedChanges, setDocumentState, updateLastOpenedDocumentId])

  const performSave = useCallback(
    async (
      docId: string,
      title: string,
      forceOverwrite = false,
    ): Promise<{ success: boolean; conflict?: boolean; serverUpdatedAt?: string }> => {
      const currentState = documentStateRef.current
      const editorState = JSON.stringify(editor.getEditorState().toJSON())
      const content = editor.getEditorState().read(() => {
        return $getRoot().getTextContent()
      })

      try {
        const response = await fetch(`/api/documents/${docId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            content,
            editorState,
            lastSavedAt: currentState.lastSavedAt,
            forceOverwrite,
          }),
        })

        if (response.status === 409) {
          // Conflict detected
          const data = await response.json()
          return { success: false, conflict: true, serverUpdatedAt: data.serverUpdatedAt }
        }

        return { success: response.ok }
      } catch (error) {
        console.error("[v0] Error saving document:", error)
        return { success: false }
      }
    },
    [editor],
  )

  const triggerAutoSave = useCallback(async () => {
    const currentState = documentStateRef.current

    if (!currentState.id && currentState.hasUnsavedChanges) {
      console.log("[v0] triggerAutoSave: creating new document")
      setDocumentState((prev) => ({ ...prev, saveStatus: "saving" }))

      const editorState = JSON.stringify(editor.getEditorState().toJSON())
      const content = editor.getEditorState().read(() => {
        return $getRoot().getTextContent()
      })

      try {
        const response = await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: currentState.title, content, editorState }),
        })

        if (response.ok) {
          const doc = await response.json()
          console.log("[v0] triggerAutoSave: new document created:", doc.id)
          setDocumentState({
            id: doc.id,
            title: doc.title,
            hasUnsavedChanges: false,
            saveStatus: "saved",
            lastSavedAt: doc.updated_at,
          })
          updateLastOpenedDocumentId(doc.id)
          if (savedStatusTimeoutRef.current) clearTimeout(savedStatusTimeoutRef.current)
          savedStatusTimeoutRef.current = setTimeout(() => {
            setDocumentState((prev) => ({ ...prev, saveStatus: "idle" }))
          }, 2000)
        } else {
          console.log("[v0] triggerAutoSave: failed to create document")
          setDocumentState((prev) => ({ ...prev, saveStatus: "error" }))
        }
      } catch (error) {
        console.error("[v0] Error creating document:", error)
        setDocumentState((prev) => ({ ...prev, saveStatus: "error" }))
      }
      return
    }

    if (!currentState.id || !currentState.hasUnsavedChanges) {
      console.log("[v0] triggerAutoSave skipped:", {
        id: currentState.id,
        hasUnsavedChanges: currentState.hasUnsavedChanges,
      })
      return
    }

    console.log("[v0] triggerAutoSave starting for:", currentState.id)
    setDocumentState((prev) => ({ ...prev, saveStatus: "saving" }))

    const result = await performSave(currentState.id, currentState.title)

    if (result.conflict && result.serverUpdatedAt) {
      // Show conflict dialog
      setConflictServerUpdatedAt(result.serverUpdatedAt)
      setConflictDialogOpen(true)
      setDocumentState((prev) => ({ ...prev, saveStatus: "idle" }))
    } else if (result.success) {
      setDocumentState((prev) => ({
        ...prev,
        hasUnsavedChanges: false,
        saveStatus: "saved",
        lastSavedAt: new Date().toISOString(),
      }))
      if (savedStatusTimeoutRef.current) clearTimeout(savedStatusTimeoutRef.current)
      savedStatusTimeoutRef.current = setTimeout(() => {
        setDocumentState((prev) => ({ ...prev, saveStatus: "idle" }))
      }, 2000)
    } else {
      setDocumentState((prev) => ({ ...prev, saveStatus: "error" }))
    }
  }, [editor, performSave, setDocumentState, updateLastOpenedDocumentId])

  const handleSave = useCallback(async () => {
    if (!documentState.id) {
      setIsSaveAs(false)
      setSaveDialogOpen(true)
      return
    }

    setDocumentState((prev) => ({ ...prev, saveStatus: "saving" }))
    const result = await performSave(documentState.id, documentState.title)

    if (result.conflict && result.serverUpdatedAt) {
      // Show conflict dialog
      setConflictServerUpdatedAt(result.serverUpdatedAt)
      setConflictDialogOpen(true)
      setDocumentState((prev) => ({ ...prev, saveStatus: "idle" }))
    } else if (result.success) {
      setDocumentState((prev) => ({
        ...prev,
        hasUnsavedChanges: false,
        saveStatus: "saved",
        lastSavedAt: new Date().toISOString(),
      }))
      if (savedStatusTimeoutRef.current) clearTimeout(savedStatusTimeoutRef.current)
      savedStatusTimeoutRef.current = setTimeout(() => {
        setDocumentState((prev) => ({ ...prev, saveStatus: "idle" }))
      }, 2000)
    } else {
      setDocumentState((prev) => ({ ...prev, saveStatus: "error" }))
    }
  }, [documentState.id, documentState.title, performSave, setDocumentState])

  const handleSaveAs = useCallback(() => {
    setIsSaveAs(true)
    setSaveDialogOpen(true)
  }, [])

  const handleSaveWithTitle = useCallback(
    async (title: string) => {
      setSaveDialogOpen(false)

      if (isSaveAs || !documentState.id) {
        // Create new document
        setDocumentState((prev) => ({ ...prev, saveStatus: "saving" }))
        const editorState = JSON.stringify(editor.getEditorState().toJSON())
        const content = editor.getEditorState().read(() => {
          return $getRoot().getTextContent()
        })

        try {
          const response = await fetch("/api/documents", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, content, editorState }),
          })

          if (response.ok) {
            const doc = await response.json()
            setDocumentState({
              id: doc.id,
              title: doc.title,
              hasUnsavedChanges: false,
              saveStatus: "saved",
              lastSavedAt: doc.updated_at,
            })
            updateLastOpenedDocumentId(doc.id)
            if (savedStatusTimeoutRef.current) clearTimeout(savedStatusTimeoutRef.current)
            savedStatusTimeoutRef.current = setTimeout(() => {
              setDocumentState((prev) => ({ ...prev, saveStatus: "idle" }))
            }, 2000)
          } else {
            setDocumentState((prev) => ({ ...prev, saveStatus: "error" }))
          }
        } catch (error) {
          console.error("[v0] Error saving document:", error)
          setDocumentState((prev) => ({ ...prev, saveStatus: "error" }))
        }
      } else {
        // Update existing document title
        setDocumentState((prev) => ({ ...prev, saveStatus: "saving" }))
        try {
          const result = await performSave(documentState.id, title)
          if (result.conflict && result.serverUpdatedAt) {
            setConflictServerUpdatedAt(result.serverUpdatedAt)
            setConflictDialogOpen(true)
            setDocumentState((prev) => ({ ...prev, saveStatus: "idle" }))
          } else if (result.success) {
            setDocumentState((prev) => ({
              ...prev,
              hasUnsavedChanges: false,
              saveStatus: "saved",
              lastSavedAt: new Date().toISOString(),
            }))
            if (savedStatusTimeoutRef.current) clearTimeout(savedStatusTimeoutRef.current)
            savedStatusTimeoutRef.current = setTimeout(() => {
              setDocumentState((prev) => ({ ...prev, saveStatus: "idle" }))
            }, 2000)
          } else {
            setDocumentState((prev) => ({ ...prev, saveStatus: "error" }))
          }
        } catch (error) {
          console.error("[v0] Error saving document:", error)
          setDocumentState((prev) => ({ ...prev, saveStatus: "error" }))
        }
      }
    },
    [
      editor,
      documentState.id,
      isSaveAs,
      setDocumentState,
      updateLastOpenedDocumentId,
      performSave,
      documentState.title,
    ],
  )

  const handleOpenDocument = useCallback(
    async (docId: string) => {
      if (documentState.hasUnsavedChanges) {
        if (!confirm("You have unsaved changes. Open a different document anyway?")) {
          return
        }
      }

      try {
        const response = await fetch(`/api/documents/${docId}`)
        if (response.ok) {
          const doc = await response.json()

          skipNextContentChangeRef.current = true

          if (doc.editor_state) {
            try {
              const state = editor.parseEditorState(doc.editor_state)
              editor.setEditorState(state)
            } catch (error) {
              console.error("[v0] Error loading editor state:", error)
            }
          }

          setDocumentState({
            id: doc.id,
            title: doc.title,
            hasUnsavedChanges: false,
            saveStatus: "idle",
            lastSavedAt: doc.updated_at,
          })
          updateLastOpenedDocumentId(doc.id)
          setOpenDialogOpen(false)
        }
      } catch (error) {
        console.error("[v0] Error loading document:", error)
      }
    },
    [editor, documentState.hasUnsavedChanges, setDocumentState, updateLastOpenedDocumentId],
  )

  const handleContentChange = useCallback(() => {
    if (skipNextContentChangeRef.current) {
      skipNextContentChangeRef.current = false
      return
    }

    setDocumentState((prev) => ({ ...prev, hasUnsavedChanges: true, saveStatus: "idle" }))

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      triggerAutoSave()
    }, 5000)
  }, [setDocumentState, triggerAutoSave])

  const handleDeleteDocument = useCallback(
    (id: string) => {
      if (documentState.id === id) {
        setDocumentState({
          id: null,
          title: "Untitled",
          hasUnsavedChanges: false,
          saveStatus: "idle",
          lastSavedAt: null,
        })
        // Clear last opened document in preferences
        updateLastOpenedDocumentId(null)
        editor.update(() => {
          const root = $getRoot()
          root.clear()
        })
      }
    },
    [editor, documentState.id, setDocumentState, updateLastOpenedDocumentId],
  )

  const handleConflictOverwrite = useCallback(async () => {
    if (!documentState.id) return
    setConflictDialogOpen(false)
    setDocumentState((prev) => ({ ...prev, saveStatus: "saving" }))

    const result = await performSave(documentState.id, documentState.title, true) // forceOverwrite = true

    if (result.success) {
      setDocumentState((prev) => ({
        ...prev,
        hasUnsavedChanges: false,
        saveStatus: "saved",
        lastSavedAt: new Date().toISOString(),
      }))
      if (savedStatusTimeoutRef.current) clearTimeout(savedStatusTimeoutRef.current)
      savedStatusTimeoutRef.current = setTimeout(() => {
        setDocumentState((prev) => ({ ...prev, saveStatus: "idle" }))
      }, 2000)
    } else {
      setDocumentState((prev) => ({ ...prev, saveStatus: "error" }))
    }
  }, [documentState.id, documentState.title, performSave, setDocumentState])

  const handleConflictReload = useCallback(async () => {
    if (!documentState.id) return
    setConflictDialogOpen(false)

    try {
      const response = await fetch(`/api/documents/${documentState.id}`)
      if (response.ok) {
        const doc = await response.json()
        if (doc.editor_state) {
          const state = editor.parseEditorState(doc.editor_state)
          editor.setEditorState(state)
        }
        setDocumentState({
          id: doc.id,
          title: doc.title,
          hasUnsavedChanges: false,
          saveStatus: "idle",
          lastSavedAt: doc.updated_at,
        })
      }
    } catch (error) {
      console.error("[v0] Error reloading document:", error)
    }
  }, [editor, documentState.id, setDocumentState])

  const handleConflictCancel = useCallback(() => {
    setConflictDialogOpen(false)
  }, [])

  return (
    <>
      {isLoadingDocument ? (
        <div className="flex justify-center items-center flex-1">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <>
          <EditorContent
            breaker={breaker}
            showBreaks={showBreaks}
            setShowBreaks={setShowBreaks}
            onActiveFormatsChange={onActiveFormatsChange}
            onTextChange={onTextChange}
            voiceInputRef={voiceInputRef}
            applyReplacements={applyReplacements}
            onExportOdt={onExportOdt}
            debugMode={debugMode}
            setDebugMode={setDebugMode}
            wordBreakerDebugMode={wordBreakerDebugMode}
            setWordBreakerDebugMode={setWordBreakerDebugMode}
            onVoiceStateChange={onVoiceStateChange}
            onPartialTranscriptChange={onPartialTranscriptChange}
            documentState={documentState}
            onNew={handleNew}
            onOpenDialog={() => setOpenDialogOpen(true)}
            onSave={handleSave}
            onSaveAs={handleSaveAs}
            onContentChange={handleContentChange}
          />

          <DocumentsDialog
            open={openDialogOpen}
            onOpenChange={setOpenDialogOpen}
            onOpen={handleOpenDocument}
            onDelete={handleDeleteDocument}
          />

          <SaveDialog
            open={saveDialogOpen}
            onOpenChange={setSaveDialogOpen}
            onSave={handleSaveWithTitle}
            defaultTitle={isSaveAs ? documentState.title : ""}
          />

          <ConflictDialog
            open={conflictDialogOpen}
            onOpenChange={setConflictDialogOpen}
            serverUpdatedAt={conflictServerUpdatedAt || new Date().toISOString()}
            onOverwrite={handleConflictOverwrite}
            onReload={handleConflictReload}
            onCancel={handleConflictCancel}
          />
        </>
      )}
    </>
  )
}

export const KhmerLexicalEditor = forwardRef<KhmerLexicalEditorHandle, KhmerLexicalEditorProps>(
  function KhmerLexicalEditor({ className, initialEditorState }, ref) {
    const [breaker] = useState(() => new KhmerBreaker(KHMER_DICTIONARY))
    const [showBreaks, setShowBreaks] = useState(true)
    const [wordCount, setWordCount] = useState(0)
    const [charCount, setCharCount] = useState(0)
    const [currentText, setCurrentText] = useState("")
    const [debugMode, setDebugMode] = useState(isDebugEnabled())
    const [wordBreakerDebugMode, setWordBreakerDebugMode] = useState(isWordBreakerDebugEnabled())
    const [mounted, setMounted] = useState(false)
    const [isVoiceActive, setIsVoiceActive] = useState(false)
    const [partialTranscript, setPartialTranscript] = useState("")
    const voiceInputRef = useRef<VoiceInputHandle>(null)
    const editorRef = useRef<HTMLDivElement>(null)
    const { theme: colorTheme, setTheme } = useTheme()

    const [documentState, setDocumentState] = useState<DocumentState>({
      id: null,
      title: "Untitled",
      hasUnsavedChanges: false,
      saveStatus: "idle",
      lastSavedAt: null,
    })

    const { applyReplacements } = useReplacements()
    const { preferences, isLoading: isLoadingPreferences, updatePreference } = usePreferences()

    const updateLastOpenedDocumentId = useCallback(
      (id: string | null) => {
        updatePreference("last_opened_document_id", id)
      },
      [updatePreference],
    )

    useEffect(() => {
      setMounted(true)
    }, [])

    const [activeFormats, setActiveFormats] = useState<ActiveFormats>({
      bold: false,
      italic: false,
      underline: false,
      strikethrough: false,
      highlight: false,
      heading: null,
      fontSize: "4",
      alignment: "left",
      list: null,
    })

    const handleTextChange = useCallback((text: string, words: number, chars: number) => {
      setCurrentText(text)
      setWordCount(words)
      setCharCount(chars)
    }, [])

    const handleExportOdt = useCallback(() => {
      if (editorRef.current) {
        const contentEditable = editorRef.current.querySelector('[contenteditable="true"]')
        if (contentEditable) {
          const filename = `${documentState.title || "document"}.odt`
          exportToOdtFromLexical(contentEditable as HTMLElement, filename)
        }
      }
    }, [documentState.title])

    const handleVoiceStateChange = useCallback((active: boolean) => {
      setIsVoiceActive(active)
      if (!active) {
        setPartialTranscript("")
      }
    }, [])

    const handleTitleChange = useCallback(
      async (newTitle: string) => {
        setDocumentState((prev) => ({ ...prev, title: newTitle, saveStatus: "saving" }))

        try {
          if (documentState.id) {
            // Update existing document title
            await fetch(`/api/documents/${documentState.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ title: newTitle }),
            })
            setDocumentState((prev) => ({ ...prev, saveStatus: "saved", hasUnsavedChanges: false }))
          } else {
            // Create new document when user names it
            const response = await fetch("/api/documents", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: newTitle,
                content: "",
              }),
            })
            if (response.ok) {
              const doc = await response.json()
              setDocumentState((prev) => ({
                ...prev,
                id: doc.id,
                saveStatus: "saved",
                hasUnsavedChanges: false,
                lastSavedAt: doc.updated_at,
              }))
              updateLastOpenedDocumentId(doc.id)
            }
          }
        } catch (error) {
          console.error("[v0] Error saving document:", error)
          setDocumentState((prev) => ({ ...prev, saveStatus: "error" }))
        }
      },
      [documentState.id, updateLastOpenedDocumentId],
    )

    useImperativeHandle(ref, () => ({
      insertText: (text: string) => {
        // Will be implemented if needed
      },
      focus: () => {
        editorRef.current?.querySelector<HTMLElement>('[contenteditable="true"]')?.focus()
      },
    }))

    const initialConfig = {
      namespace: "KhmerEditor",
      theme: lexicalTheme,
      onError,
      nodes: [HeadingNode, ListNode, ListItemNode, KhmerBreakNode],
    }

    if (!mounted) {
      return (
        <div className={cn("flex flex-col h-screen bg-gray-50 dark:bg-gray-900", className)}>
          <div className="animate-pulse flex-1" />
        </div>
      )
    }

    return (
      <div ref={editorRef} className={cn("flex flex-col h-screen bg-gray-50 dark:bg-gray-900", className)}>
        <VoiceIndicator isActive={isVoiceActive} partialTranscript={partialTranscript} />

        <EditorHeader
          theme={colorTheme}
          setTheme={setTheme}
          mounted={mounted}
          documentTitle={documentState.title}
          documentId={documentState.id}
          hasUnsavedChanges={documentState.hasUnsavedChanges}
          saveStatus={documentState.saveStatus}
          onTitleChange={handleTitleChange}
        />

        <LexicalComposer initialConfig={initialConfig}>
          <EditorWrapper
            breaker={breaker}
            showBreaks={showBreaks}
            setShowBreaks={setShowBreaks}
            onActiveFormatsChange={setActiveFormats}
            onTextChange={handleTextChange}
            voiceInputRef={voiceInputRef}
            applyReplacements={applyReplacements}
            onExportOdt={handleExportOdt}
            debugMode={debugMode}
            setDebugMode={setDebugMode}
            wordBreakerDebugMode={wordBreakerDebugMode}
            setWordBreakerDebugMode={setWordBreakerDebugMode}
            onVoiceStateChange={handleVoiceStateChange}
            onPartialTranscriptChange={setPartialTranscript}
            documentState={documentState}
            setDocumentState={setDocumentState}
            initialEditorState={initialEditorState || null}
            lastOpenedDocumentId={preferences.last_opened_document_id}
            updateLastOpenedDocumentId={updateLastOpenedDocumentId}
            isLoadingPreferences={isLoadingPreferences}
          />
        </LexicalComposer>

        <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-4">
            <span>{wordCount} words</span>
            <span>{charCount} characters</span>
          </div>
        </div>
      </div>
    )
  },
)
