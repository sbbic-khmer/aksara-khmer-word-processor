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

import { KhmerBreakNode } from "./nodes/khmer-break-node"
import { KhmerWordBreakPlugin } from "./plugins/khmer-word-break-plugin"
import { VoiceInputPlugin, INSERT_VOICE_TEXT_COMMAND } from "./plugins/voice-input-plugin"
import { ToolbarPlugin, useToolbarCommands, type ActiveFormats } from "./plugins/toolbar-plugin"
import { OnChangePlugin } from "./plugins/on-change-plugin"

import { KhmerBreaker } from "@/lib/khmer-breaker"
import { KHMER_DICTIONARY } from "@/lib/khmer-dictionary-data"
import { VoiceInput, type VoiceInputHandle } from "@/components/voice-input"
import { FormattingToolbar } from "@/components/editor/formatting-toolbar"
import { FileMenu } from "@/components/editor/file-menu"
import { EditorHeader } from "@/components/editor/editor-header"
import { useReplacements } from "@/hooks/use-replacements"
import { exportToOdtFromLexical } from "@/lib/odt-export-lexical"
import { cn } from "@/lib/utils"

interface KhmerLexicalEditorProps {
  className?: string
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

// Inner component that has access to the composer context
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
    },
    [editor],
  )

  const handlePartialTranscript = useCallback((text: string) => {
    // Could show partial transcript indicator
  }, [])

  const handleCopyWithBreaks = useCallback(() => {
    // Copy text with ZWSP breaks
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
      <OnChangePlugin onChange={onTextChange} />
      <HistoryPlugin />
      <ListPlugin />

      {/* Toolbar Row */}
      <div className="flex flex-wrap items-center gap-1 px-2 sm:px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        {/* File Menu */}
        <FileMenu
          onCopyWithBreaks={handleCopyWithBreaks}
          onExportOdt={onExportOdt}
          debugMode={debugMode}
          onToggleDebug={() => setDebugMode(!debugMode)}
        />

        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

        {/* Formatting Toolbar */}
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

        {/* Voice Input - pushed to the right */}
        <div className="ml-auto flex items-center">
          <VoiceInput
            ref={voiceInputRef}
            onTranscript={handleVoiceTranscript}
            onPartialTranscript={handlePartialTranscript}
            applyReplacements={applyReplacements}
          />
        </div>
      </div>

      {/* Document Area - Google Docs style */}
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

export const KhmerLexicalEditor = forwardRef<KhmerLexicalEditorHandle, KhmerLexicalEditorProps>(
  function KhmerLexicalEditor({ className }, ref) {
    const [breaker] = useState(() => new KhmerBreaker(KHMER_DICTIONARY))
    const [showBreaks, setShowBreaks] = useState(true)
    const [wordCount, setWordCount] = useState(0)
    const [charCount, setCharCount] = useState(0)
    const [currentText, setCurrentText] = useState("")
    const [debugMode, setDebugMode] = useState(false)
    const [mounted, setMounted] = useState(false)
    const voiceInputRef = useRef<VoiceInputHandle>(null)
    const editorRef = useRef<HTMLDivElement>(null)
    const { theme: colorTheme, setTheme } = useTheme()

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
          exportToOdtFromLexical(contentEditable as HTMLElement, "document.odt")
        }
      }
    }, [])

    const initialConfig = {
      namespace: "KhmerEditor",
      theme: lexicalTheme,
      onError,
      nodes: [HeadingNode, ListNode, ListItemNode, KhmerBreakNode],
    }

    useImperativeHandle(ref, () => ({
      insertText: (text: string) => {
        console.log("[v0] Insert text requested:", text)
      },
      focus: () => {
        const contentEditable = editorRef.current?.querySelector('[contenteditable="true"]')
        if (contentEditable) {
          ;(contentEditable as HTMLElement).focus()
        }
      },
    }))

    return (
      <div className={cn("flex flex-col h-screen bg-white dark:bg-gray-900", className)} ref={editorRef}>
        {/* Header with logo */}
        <EditorHeader theme={colorTheme} setTheme={setTheme} mounted={mounted} />

        <LexicalComposer initialConfig={initialConfig}>
          <EditorContent
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
          />
        </LexicalComposer>

        {/* Footer with stats */}
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
