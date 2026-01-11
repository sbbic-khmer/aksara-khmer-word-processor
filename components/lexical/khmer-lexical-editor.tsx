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
import { $getRoot } from "lexical"

import { KhmerBreakNode } from "./nodes/khmer-break-node"
import { KhmerWordBreakPlugin } from "./plugins/khmer-word-break-plugin"
import { VoiceInputPlugin, INSERT_VOICE_TEXT_COMMAND } from "./plugins/voice-input-plugin"
import { ToolbarPlugin, useToolbarCommands, type ActiveFormats } from "./plugins/toolbar-plugin"
import { OnChangePlugin } from "./plugins/on-change-plugin"

import { KhmerBreaker } from "@/lib/khmer-breaker"
import { KHMER_DICTIONARY } from "@/lib/khmer-dictionary-data"
import { VoiceInput, type VoiceInputHandle } from "@/components/voice-input"
import { VoiceIndicator } from "@/components/voice-indicator"
import { FormattingToolbar } from "@/components/editor/formatting-toolbar"
import { FileMenu } from "@/components/editor/file-menu"
import { EditorHeader } from "@/components/editor/editor-header"
import { DocumentsDialog } from "@/components/editor/documents-dialog"
import { SaveDialog } from "@/components/editor/save-dialog"
import { useReplacements } from "@/hooks/use-replacements"
import { exportToOdtFromLexical } from "@/lib/odt-export-lexical"
import { cn } from "@/lib/utils"

const LAST_DOCUMENT_KEY = "aksara-last-document-id"

interface DocumentState {
  id: string | null
  title: string
  hasUnsavedChanges: boolean
  saveStatus: "idle" | "saving" | "saved" | "error"
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
    editor.getEditorState().read(() => {
      const text = editor.getRootElement()?.textContent || ""
      navigator.clipboard.writeText(text)
    })
  }, [editor])

  return (
    <>
      <ToolbarPlugin onFormatsChange={handleFormatsChange} />
      <KhmerWordBreakPlugin breaker={breaker} showBreaks={showBreaks} />
      <VoiceInputPlugin />
      <OnChangePlugin onChange={onTextChange} onContentChange={onContentChange} />
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
          onToggleDebug={() => setDebugMode(!debugMode)}
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
  onVoiceStateChange,
  onPartialTranscriptChange,
  documentState,
  setDocumentState,
  initialEditorState,
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
  onVoiceStateChange: (active: boolean) => void
  onPartialTranscriptChange: (text: string) => void
  documentState: DocumentState
  setDocumentState: React.Dispatch<React.SetStateAction<DocumentState>>
  initialEditorState: string | null
}) {
  const [editor] = useLexicalComposerContext()
  const [openDialogOpen, setOpenDialogOpen] = useState(false)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [isSaveAs, setIsSaveAs] = useState(false)
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
    if (lastDocLoadedRef.current) return
    lastDocLoadedRef.current = true

    const lastDocId = localStorage.getItem(LAST_DOCUMENT_KEY)
    if (lastDocId) {
      // Load the last document
      fetch(`/api/documents/${lastDocId}`)
        .then((res) => {
          if (res.ok) return res.json()
          throw new Error("Document not found")
        })
        .then((doc) => {
          if (doc.editor_state) {
            const state = editor.parseEditorState(doc.editor_state)
            editor.setEditorState(state)
          }
          setDocumentState({
            id: doc.id,
            title: doc.title,
            hasUnsavedChanges: false,
            saveStatus: "idle",
          })
        })
        .catch(() => {
          // Document was deleted or doesn't exist, clear localStorage
          localStorage.removeItem(LAST_DOCUMENT_KEY)
        })
    }
  }, [editor, setDocumentState])

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
      localStorage.setItem(LAST_DOCUMENT_KEY, documentState.id)
    }
  }, [documentState.id])

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
    setDocumentState({ id: null, title: "Untitled", hasUnsavedChanges: false, saveStatus: "idle" })
    localStorage.removeItem(LAST_DOCUMENT_KEY)
  }, [editor, documentState.hasUnsavedChanges, setDocumentState])

  const performSave = useCallback(
    async (docId: string, title: string): Promise<boolean> => {
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
          }),
        })
        return response.ok
      } catch (error) {
        console.error("[v0] Error saving document:", error)
        return false
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
          setDocumentState({ id: doc.id, title: doc.title, hasUnsavedChanges: false, saveStatus: "saved" })
          localStorage.setItem(LAST_DOCUMENT_KEY, doc.id)
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

    const success = await performSave(currentState.id, currentState.title)

    if (success) {
      console.log("[v0] triggerAutoSave success")
      setDocumentState((prev) => ({ ...prev, hasUnsavedChanges: false, saveStatus: "saved" }))
      if (savedStatusTimeoutRef.current) clearTimeout(savedStatusTimeoutRef.current)
      savedStatusTimeoutRef.current = setTimeout(() => {
        setDocumentState((prev) => ({ ...prev, saveStatus: "idle" }))
      }, 2000)
    } else {
      console.log("[v0] triggerAutoSave failed")
      setDocumentState((prev) => ({ ...prev, saveStatus: "error" }))
    }
  }, [editor, performSave, setDocumentState])

  const handleSave = useCallback(async () => {
    if (!documentState.id) {
      setIsSaveAs(false)
      setSaveDialogOpen(true)
      return
    }

    setDocumentState((prev) => ({ ...prev, saveStatus: "saving" }))
    const success = await performSave(documentState.id, documentState.title)

    if (success) {
      setDocumentState((prev) => ({ ...prev, hasUnsavedChanges: false, saveStatus: "saved" }))
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
      const editorState = JSON.stringify(editor.getEditorState().toJSON())
      const content = editor.getEditorState().read(() => {
        return $getRoot().getTextContent()
      })

      setDocumentState((prev) => ({ ...prev, saveStatus: "saving" }))

      try {
        const response = await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, content, editorState }),
        })

        if (response.ok) {
          const doc = await response.json()
          setDocumentState({ id: doc.id, title: doc.title, hasUnsavedChanges: false, saveStatus: "saved" })
          localStorage.setItem(LAST_DOCUMENT_KEY, doc.id)
          if (savedStatusTimeoutRef.current) clearTimeout(savedStatusTimeoutRef.current)
          savedStatusTimeoutRef.current = setTimeout(() => {
            setDocumentState((prev) => ({ ...prev, saveStatus: "idle" }))
          }, 2000)
        } else {
          setDocumentState((prev) => ({ ...prev, saveStatus: "error" }))
        }
      } catch (error) {
        console.error("[v0] Error creating document:", error)
        setDocumentState((prev) => ({ ...prev, saveStatus: "error" }))
      }
    },
    [editor, setDocumentState],
  )

  const handleOpenDocument = useCallback(
    async (doc: { id: string; title: string }) => {
      if (documentState.hasUnsavedChanges) {
        if (!confirm("You have unsaved changes. Open another document anyway?")) {
          return
        }
      }

      try {
        const response = await fetch(`/api/documents/${doc.id}`)
        if (response.ok) {
          const fullDoc = await response.json()
          if (fullDoc.editor_state) {
            const state = editor.parseEditorState(fullDoc.editor_state)
            editor.setEditorState(state)
          }
          setDocumentState({ id: fullDoc.id, title: fullDoc.title, hasUnsavedChanges: false, saveStatus: "idle" })
          localStorage.setItem(LAST_DOCUMENT_KEY, fullDoc.id)
        }
      } catch (error) {
        console.error("[v0] Error opening document:", error)
      }
    },
    [editor, documentState.hasUnsavedChanges, setDocumentState],
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
        setDocumentState({ id: null, title: "Untitled", hasUnsavedChanges: false, saveStatus: "idle" })
        localStorage.removeItem(LAST_DOCUMENT_KEY)
        editor.update(() => {
          const root = $getRoot()
          root.clear()
        })
      }
    },
    [editor, documentState.id, setDocumentState],
  )

  return (
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
    const [debugMode, setDebugMode] = useState(false)
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
    })

    const { applyReplacements } = useReplacements()

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
              }))
              localStorage.setItem(LAST_DOCUMENT_KEY, doc.id)
            }
          }
        } catch (error) {
          console.error("[v0] Error saving document:", error)
          setDocumentState((prev) => ({ ...prev, saveStatus: "error" }))
        }
      },
      [documentState.id],
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
            onVoiceStateChange={handleVoiceStateChange}
            onPartialTranscriptChange={setPartialTranscript}
            documentState={documentState}
            setDocumentState={setDocumentState}
            initialEditorState={initialEditorState || null}
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
