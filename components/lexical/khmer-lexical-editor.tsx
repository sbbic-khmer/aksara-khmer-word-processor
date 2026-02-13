"use client"

import type React from "react"

import { useState, useCallback, useRef, forwardRef, useImperativeHandle, useEffect, useMemo } from "react"
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
import { useTranslations } from "next-intl"
import { $getRoot, $isTextNode, $isElementNode, $isParagraphNode, $getSelection, $isRangeSelection, $createRangeSelection, $setSelection, CLICK_COMMAND, COMMAND_PRIORITY_LOW, COMMAND_PRIORITY_HIGH, SELECTION_CHANGE_COMMAND, type TextNode } from "lexical"

import { KhmerBreakNode } from "./nodes/khmer-break-node"
import { KhmerWordBreakPlugin, FORCE_RESEGMENT_COMMAND, clearSegmentationCache } from "./plugins/khmer-word-break-plugin"
import { VoiceInputPlugin, INSERT_VOICE_TEXT_COMMAND } from "./plugins/voice-input-plugin"
import { ToolbarPlugin, useToolbarCommands, type ActiveFormats } from "./plugins/toolbar-plugin"
import { OnChangePlugin } from "./plugins/on-change-plugin"
import { KhmerSpellCheckPlugin } from "./plugins/khmer-spell-check-plugin"
import { SpellCheckProvider, useSpellCheck } from "./contexts/spell-check-context"
import { SpellCheckContextMenu } from "./components/spell-check-context-menu"
import { KhmerGrammarCheckPlugin } from "./plugins/khmer-grammar-check-plugin"
import { ClickSelectionPlugin } from "./plugins/click-selection-plugin"
import { GrammarCheckProvider, useGrammarCheck } from "./contexts/grammar-check-context"
import { GrammarCheckContextMenu } from "./components/grammar-check-context-menu"
import { $isKhmerBreakNode } from "./nodes/khmer-break-node"
import { $isHeadingNode } from "@lexical/rich-text"
import { $isListNode, $isListItemNode } from "@lexical/list"

import { stripBreakNodes } from "@/lib/editor-save-utils"
import { compressStringClient } from "@/lib/client-compression"
import { KhmerBreaker } from "@/lib/khmer-breaker"
import { VoiceInput, type VoiceInputHandle } from "@/components/voice-input"
import { VoiceIndicator } from "@/components/voice-indicator"
import { FormattingToolbar } from "@/components/editor/formatting-toolbar"
import { FileMenu } from "@/components/editor/file-menu"
import { EditorHeader } from "@/components/editor/editor-header"
import { DocumentsDialog } from "@/components/editor/documents-dialog"
import { SaveDialog } from "@/components/editor/save-dialog"
import { ConflictDialog } from "@/components/editor/conflict-dialog"
import { StorageErrorDialog } from "@/components/editor/storage-error-dialog"
import { SplitWordDialog } from "@/components/editor/split-word-dialog"
import { useReplacements } from "@/hooks/use-replacements"
import { usePreferences } from "@/hooks/use-preferences"
import { useUserDictionary } from "@/hooks/use-user-dictionary"
import { useIgnoredDictionaryWords } from "@/hooks/use-ignored-dictionary-words"
import { useIsMobile } from "@/hooks/use-is-mobile"
import { exportToOdtFromLexical } from "@/lib/odt-export-lexical"
import { cn } from "@/lib/utils"
import {
  setDebugEnabled,
  debugLog,
  isDebugEnabled,
  setWordBreakerDebugEnabled,
  isWordBreakerDebugEnabled,
  setCursorDebugEnabled,
  isCursorDebugEnabled,
  cursorDebugLog,
} from "@/lib/debug"
import { Loader2 } from "lucide-react"

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
  cursorDebugMode,
  setCursorDebugMode,
  onVoiceStateChange,
  onPartialTranscriptChange,
  documentState,
  onNew,
  onOpenDialog,
  onSave,
  onSaveAs,
  onContentChange,
  onSplitWord,
  isLoadingDocument,
  zoomLevel,
  onZoomChange,
  isCompactToolbar,
  onToggleCompactToolbar,
  isMobile,
  deferredPluginsReady,
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
  cursorDebugMode: boolean
  setCursorDebugMode: (debug: boolean) => void
  onVoiceStateChange: (active: boolean) => void
  onPartialTranscriptChange: (text: string) => void
  documentState: DocumentState
  onNew: () => void
  onOpenDialog: () => void
  onSave: () => void
  onSaveAs: () => void
  onContentChange: () => void
  onSplitWord: () => void
  isLoadingDocument: boolean
  zoomLevel: number
  onZoomChange: (level: number) => void
  isCompactToolbar: boolean
  onToggleCompactToolbar: () => void
  isMobile: boolean
  deferredPluginsReady: boolean
}) {
  const [editor] = useLexicalComposerContext()
  const { formatText, undo, redo, insertZWSP, joinWord } = useToolbarCommands()
  const { debugMode: spellCheckDebugMode, setDebugMode: setSpellCheckDebugMode, spellCheckEnabled, setSpellCheckEnabled } = useSpellCheck()
  const { grammarCheckEnabled, setGrammarCheckEnabled } = useGrammarCheck()
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

  // Zoom: calculate effective zoom (fit-to-width when zoomLevel === 0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [fitToWidthZoom, setFitToWidthZoom] = useState(100)

  useEffect(() => {
    if (zoomLevel !== 0) return
    const container = scrollContainerRef.current
    if (!container) return

    const calculate = () => {
      const available = container.clientWidth - 48 // 24px margin each side
      const zoom = Math.round((available / 816) * 100)
      setFitToWidthZoom(Math.max(50, Math.min(200, zoom)))
    }

    calculate()
    window.addEventListener('resize', calculate)
    return () => window.removeEventListener('resize', calculate)
  }, [zoomLevel])

  const effectiveZoom = zoomLevel === 0 ? fitToWidthZoom : zoomLevel

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

  const handleToggleCursorDebug = useCallback(() => {
    const newValue = !cursorDebugMode
    setCursorDebugMode(newValue)
    setCursorDebugEnabled(newValue)
    debugLog("Cursor Debug mode", newValue ? "enabled" : "disabled")
  }, [cursorDebugMode, setCursorDebugMode])

  const handleToggleSpellCheckDebug = useCallback(() => {
    const newValue = !spellCheckDebugMode
    setSpellCheckDebugMode(newValue)
    debugLog("Spell Check Debug mode", newValue ? "enabled" : "disabled")
  }, [spellCheckDebugMode, setSpellCheckDebugMode])

  // Fix for clicks on paragraph elements (between words/on KhmerBreakNodes)
  // This intercepts clicks BEFORE the browser sets selection, preventing the visual flash
  useEffect(() => {
    const editorElement = editor.getRootElement()
    if (!editorElement) return

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      
      // Only intervene when click lands on paragraph element (not on a span/text)
      if (target.tagName !== 'P') {
        return // Let normal handling proceed
      }

      // Use browser's caret position calculation
      if (!document.caretRangeFromPoint) {
        return
      }

      const range = document.caretRangeFromPoint(event.clientX, event.clientY)
      if (!range) {
        return
      }

      const container = range.startContainer
      const rangeOffset = range.startOffset
      
      // ALWAYS intervene for clicks on <P> elements, even when caretRangeFromPoint 
      // returns a text node. The browser's default behavior often resets cursor to
      // paragraph start when the click target is the <P> element itself.
      
      let targetTextNode: Text | null = null
      let finalOffset: number = 0

      if (container.nodeType === Node.TEXT_NODE) {
        // caretRangeFromPoint found the correct text node and offset
        targetTextNode = container as Text
        finalOffset = rangeOffset
        
        if (isCursorDebugEnabled()) {
          cursorDebugLog("CLICK_FIX - P element click, caretRange found text node", {
            containerText: container.textContent?.slice(0, 20),
            offset: rangeOffset,
          })
        }
      } else {
        // We landed on an element node (likely empty KhmerBreakNode span)
        // Find the closest text node and position cursor there
        const containerElement = container as Element
        
        if (isCursorDebugEnabled()) {
          cursorDebugLog("CLICK_FIX - P element click, landed on element", {
            containerNodeName: containerElement.nodeName,
            containerClass: containerElement.className,
            rangeOffset,
          })
        }

        // Get all child nodes of the paragraph
        const paragraphElement = target
        const childNodes = Array.from(paragraphElement.childNodes)
        
        // Find the clicked element's position among siblings
        let clickedIndex = -1
        for (let i = 0; i < childNodes.length; i++) {
          if (childNodes[i] === container || childNodes[i].contains(container as Node)) {
            clickedIndex = i
            break
          }
        }

        // Find the nearest text node (prefer the one before, then after)
        let positionAtEnd = true

        // Look backwards for a text node
        for (let i = clickedIndex - 1; i >= 0; i--) {
          const node = childNodes[i]
          if (node.nodeType === Node.TEXT_NODE && node.textContent) {
            targetTextNode = node as Text
            positionAtEnd = true
            break
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            // Look inside the element for text
            const textNode = findLastTextNode(node as Element)
            if (textNode) {
              targetTextNode = textNode
              positionAtEnd = true
              break
            }
          }
        }

        // If nothing found before, look forward
        if (!targetTextNode) {
          for (let i = clickedIndex + 1; i < childNodes.length; i++) {
            const node = childNodes[i]
            if (node.nodeType === Node.TEXT_NODE && node.textContent) {
              targetTextNode = node as Text
              positionAtEnd = false
              break
            } else if (node.nodeType === Node.ELEMENT_NODE) {
              const textNode = findFirstTextNode(node as Element)
              if (textNode) {
                targetTextNode = textNode
                positionAtEnd = false
                break
              }
            }
          }
        }

        finalOffset = targetTextNode ? (positionAtEnd ? targetTextNode.length : 0) : 0
      }

      if (targetTextNode) {
        // Prevent default to stop browser from setting incorrect selection
        event.preventDefault()

        if (isCursorDebugEnabled()) {
          cursorDebugLog("CLICK_FIX - Setting selection", {
            targetText: targetTextNode.textContent?.slice(0, 20),
            offset: finalOffset,
          })
        }

        // Find the Lexical node by matching the DOM text node's parent element
        // and its position within the paragraph
        const targetSpan = targetTextNode.parentElement
        
        // Set Lexical selection directly using editor.update()
        editor.update(() => {
          // Find the matching Lexical text node by traversing the tree
          const root = $getRoot()
          let foundNode: TextNode | null = null
          
          // Walk through all paragraphs and their children
          for (const paragraph of root.getChildren()) {
            if (!$isParagraphNode(paragraph)) continue
            
            for (const child of paragraph.getChildren()) {
              if ($isTextNode(child)) {
                // Get the DOM element for this Lexical node
                const domElement = editor.getElementByKey(child.getKey())
                if (domElement && (domElement === targetSpan || domElement.contains(targetTextNode))) {
                  foundNode = child
                  break
                }
              }
            }
            if (foundNode) break
          }
          
          if (isCursorDebugEnabled()) {
            cursorDebugLog("CLICK_FIX - Found Lexical node", {
              found: !!foundNode,
              nodeType: foundNode?.getType(),
              nodeText: foundNode?.getTextContent().slice(0, 20),
            })
          }
          
          if (foundNode) {
            // Ensure offset is within bounds
            const nodeLength = foundNode.getTextContentSize()
            const safeOffset = Math.min(finalOffset, nodeLength)
            
            // Create and set the selection directly in Lexical
            const selection = $createRangeSelection()
            selection.anchor.set(foundNode.getKey(), safeOffset, 'text')
            selection.focus.set(foundNode.getKey(), safeOffset, 'text')
            $setSelection(selection)
            
            if (isCursorDebugEnabled()) {
              cursorDebugLog("CLICK_FIX - Lexical selection set", {
                nodeKey: foundNode.getKey(),
                offset: safeOffset,
              })
            }
          }
        })

        // Focus the editor after setting selection
        editor.focus()
      }
    }

    // Use capture phase to intercept BEFORE browser processes the click
    editorElement.addEventListener("mousedown", handleMouseDown, { capture: true })

    return () => {
      editorElement.removeEventListener("mousedown", handleMouseDown, { capture: true })
    }
  }, [editor])

  // Helper functions for finding text nodes
  function findLastTextNode(element: Element): Text | null {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
    let lastText: Text | null = null
    let node: Text | null
    while ((node = walker.nextNode() as Text | null)) {
      if (node.textContent?.trim()) {
        lastText = node
      }
    }
    return lastText
  }

  function findFirstTextNode(element: Element): Text | null {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
    let node: Text | null
    while ((node = walker.nextNode() as Text | null)) {
      if (node.textContent?.trim()) {
        return node
      }
    }
    return null
  }

  // Cursor debug: track clicks and selection changes
  useEffect(() => {
    if (!cursorDebugMode) return

    const editorElement = editor.getRootElement()
    if (!editorElement) return

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      
      // Also capture what caretRangeFromPoint would give us
      let caretInfo = null
      if (document.caretRangeFromPoint) {
        const range = document.caretRangeFromPoint(e.clientX, e.clientY)
        if (range) {
          const container = range.startContainer
          caretInfo = {
            containerNodeType: container.nodeType,
            containerNodeName: container.nodeName,
            containerText: container.textContent?.slice(0, 30),
            offset: range.startOffset,
            parentElement: (container.parentElement as HTMLElement)?.tagName,
            parentClass: (container.parentElement as HTMLElement)?.className,
          }
        }
      }
      
      cursorDebugLog("MOUSEDOWN", {
        clientX: e.clientX,
        clientY: e.clientY,
        target: target.tagName,
        targetClass: target.className,
        isContentEditable: target.isContentEditable,
        targetText: target.textContent?.slice(0, 50),
        caretRangeFromPoint: caretInfo,
      })
      
      // Capture Lexical selection state BEFORE the click is processed
      editor.getEditorState().read(() => {
        const selection = $getSelection()
        if ($isRangeSelection(selection)) {
          const anchor = selection.anchor
          const anchorNode = anchor.getNode()
          cursorDebugLog("MOUSEDOWN - Lexical selection BEFORE click", {
            anchorKey: anchor.key,
            anchorOffset: anchor.offset,
            nodeType: anchorNode.getType(),
            nodeText: $isTextNode(anchorNode) ? anchorNode.getTextContent().slice(0, 30) : "N/A",
          })
        }
      })
    }

    const handleMouseUp = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      
      // Capture native selection immediately
      const nativeSelection = window.getSelection()
      let nativeInfo = null
      if (nativeSelection && nativeSelection.rangeCount > 0) {
        const range = nativeSelection.getRangeAt(0)
        const container = range.startContainer
        nativeInfo = {
          containerNodeType: container.nodeType,
          containerNodeName: container.nodeName,
          containerText: container.textContent?.slice(0, 30),
          offset: range.startOffset,
          isCollapsed: range.collapsed,
          parentElement: (container.parentElement as HTMLElement)?.tagName,
          parentClass: (container.parentElement as HTMLElement)?.className,
        }
      }
      
      cursorDebugLog("MOUSEUP - Native selection IMMEDIATELY", {
        clientX: e.clientX,
        clientY: e.clientY,
        target: target.tagName,
        nativeSelection: nativeInfo,
      })
      
      // Capture selection after a tick to see what Lexical does
      setTimeout(() => {
        editor.getEditorState().read(() => {
          const selection = $getSelection()
          if ($isRangeSelection(selection)) {
            const anchor = selection.anchor
            const focus = selection.focus
            const anchorNode = anchor.getNode()
            const focusNode = focus.getNode()
            
            // Check if this is a "first node" situation
            const parent = anchorNode.getParent()
            const isFirstInParagraph = parent && anchorNode.getPreviousSibling() === null
            
            cursorDebugLog("MOUSEUP - Lexical selection AFTER tick", {
              target: target.tagName,
              isCollapsed: selection.isCollapsed(),
              isFirstInParagraph,
              anchor: {
                key: anchor.key,
                offset: anchor.offset,
                type: anchor.type,
                nodeType: anchorNode.getType(),
                nodeText: $isTextNode(anchorNode) ? anchorNode.getTextContent().slice(0, 30) : "N/A",
              },
              focus: {
                key: focus.key,
                offset: focus.offset,
                type: focus.type,
                nodeType: focusNode.getType(),
                nodeText: $isTextNode(focusNode) ? focusNode.getTextContent().slice(0, 30) : "N/A",
              },
            })
            
            // CRITICAL: Compare native vs Lexical to see if they match
            const nativeSelNow = window.getSelection()
            if (nativeSelNow && nativeSelNow.rangeCount > 0) {
              const nativeRange = nativeSelNow.getRangeAt(0)
              cursorDebugLog("MOUSEUP - Native vs Lexical comparison", {
                nativeOffset: nativeRange.startOffset,
                lexicalOffset: anchor.offset,
                nativeContainer: nativeRange.startContainer.textContent?.slice(0, 20),
                lexicalNodeText: $isTextNode(anchorNode) ? anchorNode.getTextContent().slice(0, 20) : "N/A",
                match: nativeRange.startOffset === anchor.offset,
              })
            }
          } else {
            cursorDebugLog("MOUSEUP - No range selection after tick", {
              selectionType: selection ? selection.constructor.name : "null",
            })
          }
        })
      }, 0)
    }

    const handleSelectionChange = () => {
      editor.getEditorState().read(() => {
        const selection = $getSelection()
        if ($isRangeSelection(selection)) {
          const anchor = selection.anchor
          const anchorNode = anchor.getNode()
          
          // Only log if cursor is at position 0 AND it's the first node (potential jump to start)
          const parent = anchorNode.getParent()
          const isFirstInParagraph = parent && anchorNode.getPreviousSibling() === null
          
          if (anchor.offset === 0 && isFirstInParagraph) {
            cursorDebugLog("SELECTION_CHANGE - Cursor at START of paragraph!", {
              anchorKey: anchor.key,
              nodeType: anchorNode.getType(),
              nodeText: $isTextNode(anchorNode) ? anchorNode.getTextContent().slice(0, 30) : "N/A",
              parentType: parent?.getType(),
            })
          }
        }
      })
    }

    // Register Lexical command listeners to see internal processing
    const unregisterClick = editor.registerCommand(
      CLICK_COMMAND,
      (payload: MouseEvent) => {
        const target = payload.target as HTMLElement
        editor.getEditorState().read(() => {
          const selection = $getSelection()
          cursorDebugLog("LEXICAL CLICK_COMMAND", {
            target: target.tagName,
            targetClass: target.className,
            hasSelection: !!selection,
            selectionType: selection ? (selection as { constructor: { name: string } }).constructor.name : "null",
            isRangeSelection: $isRangeSelection(selection),
            anchorOffset: $isRangeSelection(selection) ? selection.anchor.offset : "N/A",
            anchorNodeType: $isRangeSelection(selection) ? selection.anchor.getNode().getType() : "N/A",
          })
        })
        return false // Don't prevent default handling
      },
      COMMAND_PRIORITY_LOW
    )

    const unregisterSelectionChange = editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        editor.getEditorState().read(() => {
          const selection = $getSelection()
          if ($isRangeSelection(selection)) {
            const anchor = selection.anchor
            const anchorNode = anchor.getNode()
            const parent = anchorNode.getParent()
            const isFirstInParagraph = parent && anchorNode.getPreviousSibling() === null
            
            // Only log position 0 + first node events (cursor jump candidates)
            if (anchor.offset === 0 && isFirstInParagraph) {
              cursorDebugLog("LEXICAL SELECTION_CHANGE_COMMAND - At paragraph start!", {
                anchorKey: anchor.key,
                nodeType: anchorNode.getType(),
                nodeText: $isTextNode(anchorNode) ? anchorNode.getTextContent().slice(0, 30) : "N/A",
              })
            }
          }
        })
        return false
      },
      COMMAND_PRIORITY_LOW
    )

    editorElement.addEventListener("mousedown", handleMouseDown)
    editorElement.addEventListener("mouseup", handleMouseUp)
    document.addEventListener("selectionchange", handleSelectionChange)

    cursorDebugLog("Cursor debug listeners attached (DOM + Lexical commands)")

    return () => {
      unregisterClick()
      unregisterSelectionChange()
      editorElement.removeEventListener("mousedown", handleMouseDown)
      editorElement.removeEventListener("mouseup", handleMouseUp)
      document.removeEventListener("selectionchange", handleSelectionChange)
      cursorDebugLog("Cursor debug listeners removed")
    }
  }, [editor, cursorDebugMode])

  return (
    <>
      <ToolbarPlugin onFormatsChange={handleFormatsChange} />
      <KhmerWordBreakPlugin breaker={breaker} showBreaks={showBreaks} />
      <VoiceInputPlugin />
      {deferredPluginsReady && <KhmerSpellCheckPlugin />}
{deferredPluginsReady && <KhmerGrammarCheckPlugin />}
<ClickSelectionPlugin />
<OnChangePlugin onChange={onTextChange} onContentChange={onContentChange} breaker={breaker} />
      <HistoryPlugin />
      <ListPlugin />

      <div className={cn("flex items-center gap-1 px-2 sm:px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900", isMobile ? "flex-nowrap" : "flex-wrap")}>
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
          cursorDebugMode={cursorDebugMode}
          onToggleCursorDebug={handleToggleCursorDebug}
          spellCheckDebugMode={spellCheckDebugMode}
          onToggleSpellCheckDebug={handleToggleSpellCheckDebug}
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
          onSplitWord={onSplitWord}
          showBreaks={showBreaks}
          onToggleBreaks={() => setShowBreaks(!showBreaks)}
          spellCheckEnabled={spellCheckEnabled}
          onToggleSpellCheck={() => setSpellCheckEnabled(!spellCheckEnabled)}
          grammarCheckEnabled={grammarCheckEnabled}
          onToggleGrammarCheck={() => setGrammarCheckEnabled(!grammarCheckEnabled)}
          zoomLevel={zoomLevel}
          onZoomChange={onZoomChange}
          isCompact={isCompactToolbar}
          onToggleCompact={onToggleCompactToolbar}
          isMobile={isMobile}
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

      <div ref={scrollContainerRef} className="flex-1 bg-gray-100 dark:bg-gray-800 overflow-auto">
        <SpellCheckContextMenu>
          <GrammarCheckContextMenu>
          <div
            className="max-w-[816px] mx-auto my-6 bg-white dark:bg-gray-900 shadow-lg rounded-sm min-h-[1056px] relative flex flex-col"
            style={{ zoom: effectiveZoom / 100 }}
          >
            <RichTextPlugin
              contentEditable={
                <ContentEditable
                  className={cn(
                    "min-h-[1056px] flex-1 p-12 outline-none",
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
          </GrammarCheckContextMenu>
        </SpellCheckContextMenu>
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
  cursorDebugMode,
  setCursorDebugMode,
  onVoiceStateChange,
  onPartialTranscriptChange,
  documentState,
  setDocumentState,
  initialEditorState,
  lastOpenedDocumentId,
  updateLastOpenedDocumentId,
  isLoadingPreferences,
  userDictionaryWords,
  ignoredDictionaryWords,
  zoomLevel,
  onZoomChange,
  isCompactToolbar,
  onToggleCompactToolbar,
  isMobile,
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
  cursorDebugMode: boolean
  setCursorDebugMode: (debug: boolean) => void
  onVoiceStateChange: (active: boolean) => void
  onPartialTranscriptChange: (text: string) => void
  documentState: DocumentState
  setDocumentState: React.Dispatch<React.SetStateAction<DocumentState>>
  initialEditorState: string | null
  lastOpenedDocumentId: string | null
  updateLastOpenedDocumentId: (id: string | null) => void
  isLoadingPreferences: boolean
  userDictionaryWords: string[]
  ignoredDictionaryWords: string[]
  zoomLevel: number
  onZoomChange: (level: number) => void
  isCompactToolbar: boolean
  onToggleCompactToolbar: () => void
  isMobile: boolean
}) {
  const t = useTranslations("editor")
  const [editor] = useLexicalComposerContext()
  const { getSplitInfo, confirmSplit } = useToolbarCommands()
  const [openDialogOpen, setOpenDialogOpen] = useState(false)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [isSaveAs, setIsSaveAs] = useState(false)
  const [isLoadingDocument, setIsLoadingDocument] = useState(true)
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false)
  const [conflictServerUpdatedAt, setConflictServerUpdatedAt] = useState<string | null>(null)

  // Defer spell check and grammar check on mobile to reduce memory pressure
  const [deferredPluginsReady, setDeferredPluginsReady] = useState(() => {
    if (typeof window === "undefined") return false
    return window.innerWidth >= 1024 // Desktop: ready immediately
  })
  useEffect(() => {
    if (deferredPluginsReady) return // Already ready (desktop)
    const timer = setTimeout(() => setDeferredPluginsReady(true), 10_000)
    return () => clearTimeout(timer)
  }, [deferredPluginsReady])
  const [storageErrorDialogOpen, setStorageErrorDialogOpen] = useState(false)
  const [storageErrorCode, setStorageErrorCode] = useState<"DOCUMENT_TOO_LARGE" | "STORAGE_QUOTA_EXCEEDED" | null>(null)
  const [storageErrorMessage, setStorageErrorMessage] = useState("")
  const [splitDialogOpen, setSplitDialogOpen] = useState(false)
  const [splitDialogData, setSplitDialogData] = useState<{ word: string; cursorPosition: number } | null>(null)
  const initialLoadRef = useRef(false)
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const maxIntervalTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const savedStatusTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Auto-save timing constants
  const AUTO_SAVE_DEBOUNCE_MS = 60 * 1000 // 60 seconds after last change
  const AUTO_SAVE_MAX_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes max between saves
  const lastDocLoadedRef = useRef(false)
  const documentStateRef = useRef(documentState)
  const skipNextContentChangeRef = useRef(false)

  useEffect(() => {
    documentStateRef.current = documentState
  }, [documentState])

  // Track if initial load has completed (to avoid resegmenting on page load)
  const initialDictLoadRef = useRef(true)
  const prevUserDictWordCountRef = useRef(0)
  
  // Load user dictionary words into the breaker and trigger resegmentation when new words are added
  useEffect(() => {
    if (userDictionaryWords && userDictionaryWords.length > 0) {
      try {
        breaker.addUserWords(userDictionaryWords)
        
        // Trigger resegmentation if word count increased AFTER initial load
        if (!initialDictLoadRef.current && userDictionaryWords.length > prevUserDictWordCountRef.current) {
          clearSegmentationCache()
          editor.dispatchCommand(FORCE_RESEGMENT_COMMAND, undefined)
        }
      } catch (error) {
        // Silently handle errors loading user dictionary words
      }
    }
    
    // After first effect run, mark initial load as complete
    if (initialDictLoadRef.current) {
      initialDictLoadRef.current = false
    }
    
    prevUserDictWordCountRef.current = userDictionaryWords?.length ?? 0
  }, [breaker, editor, userDictionaryWords])

  // Load ignored dictionary words into the breaker
  // These words will be skipped during segmentation (frequency set to 0)
  useEffect(() => {
    if (ignoredDictionaryWords && ignoredDictionaryWords.length > 0) {
      try {
        breaker.addIgnoredWords(ignoredDictionaryWords)

        // Always trigger resegmentation when ignored words change
        // This ensures words are properly unsplit even if the count doesn't change
        if (!initialDictLoadRef.current) {
          // Clear segmentation cache to ensure stale results aren't used
          clearSegmentationCache()
          editor.dispatchCommand(FORCE_RESEGMENT_COMMAND, undefined)
        }
      } catch (error) {
        // Silently handle errors loading ignored dictionary words
      }
    }
  }, [breaker, editor, ignoredDictionaryWords])

  useEffect(() => {
    if (isDebugEnabled()) {
      console.log("[v0] EditorWrapper mounted - starting 10s global timeout")
    }
    // Set a 10 second timeout to stop loading spinner if something goes wrong
    loadingTimeoutRef.current = setTimeout(() => {
      if (isDebugEnabled()) {
        console.log("[v0] Global timeout triggered - isLoadingDocument:", isLoadingDocument)
      }
      if (isLoadingDocument) {
        if (isDebugEnabled()) {
          console.log("[v0] Document loading timeout - falling back to new document")
        }
        setIsLoadingDocument(false)
      }
    }, 10000)

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current)
      }
    }
  }, []) // Only run once on mount

  useEffect(() => {
    // Check sessionStorage first for instant restore (survives language switches)
    const sessionDocId = typeof window !== 'undefined' ? sessionStorage.getItem('aksara-current-doc-id') : null
    const sessionEditorState = typeof window !== 'undefined' ? sessionStorage.getItem('aksara-editor-state') : null
    const sessionDocState = typeof window !== 'undefined' ? sessionStorage.getItem('aksara-doc-state') : null
    const targetDocId = extractValidDocumentId(sessionDocId) || extractValidDocumentId(lastOpenedDocumentId)

    // If we already loaded and the target doc matches current doc, skip
    if (lastDocLoadedRef.current && documentState.id === targetDocId) {
      return
    }

    // If there's a cached editor state in sessionStorage, restore it immediately (language switch)
    if (sessionEditorState && sessionDocState && sessionDocId) {
      try {
        const docState = JSON.parse(sessionDocState)
        if (docState.id === sessionDocId) {
          // Use queueMicrotask to avoid flushSync error during useEffect
          // editor.setEditorState internally calls flushSync which can't run during React render
          queueMicrotask(() => {
            skipNextContentChangeRef.current = true
            try {
              const state = editor.parseEditorState(sessionEditorState)
              editor.setEditorState(state)
              // Re-save to sessionStorage to ensure it's current
              sessionStorage.setItem('aksara-editor-state', sessionEditorState)
              setTimeout(() => {
                editor.dispatchCommand(FORCE_RESEGMENT_COMMAND, undefined)
              }, 50)
            } catch {
              // Error setting editor state, will fall back to API on next load
            }
          })
          setDocumentState({
            id: docState.id,
            title: docState.title,
            hasUnsavedChanges: false,
            saveStatus: "idle",
            lastSavedAt: docState.lastSavedAt,
          })
          lastDocLoadedRef.current = true
          setIsLoadingDocument(false)
          return
        }
      } catch {
        // Invalid cached state, fall through to normal loading
      }
    }

    // If we already loaded but there's a different doc in sessionStorage (language switch), load it
    if (lastDocLoadedRef.current && sessionDocId && documentState.id !== targetDocId) {
      // Reset to allow loading the new document
      lastDocLoadedRef.current = false
    }

    if (lastDocLoadedRef.current) {
      return
    }

    // Only wait for preferences if we don't already have a document ID from sessionStorage.
    // When sessionStorage editor-state is cleared (e.g., too large), we fall through to
    // the API fetch path — but we still have the doc ID from sessionStorage, so we can
    // proceed immediately without waiting for preferences to provide lastOpenedDocumentId.
    if (isLoadingPreferences && !extractValidDocumentId(sessionDocId)) {
      // Give preferences 5 seconds to load, then proceed anyway
      const prefsTimeout = setTimeout(() => {
        if (isLoadingPreferences && !lastDocLoadedRef.current) {
          lastDocLoadedRef.current = true
          setIsLoadingDocument(false)
        }
      }, 5000)
      return () => clearTimeout(prefsTimeout)
    }

    lastDocLoadedRef.current = true

    const validDocId = targetDocId

    if (validDocId) {
      const controller = new AbortController()
      const fetchTimeout = setTimeout(() => {
        controller.abort()
      }, 8000)

      // Load the last document from API
      let gotNotFound = false
      fetch(`/api/documents/${validDocId}`, { signal: controller.signal })
        .then((res) => {
          clearTimeout(fetchTimeout)
          if (res.ok) return res.json()
          if (res.status === 404) gotNotFound = true
          throw new Error(`Document fetch failed: ${res.status}`)
        })
        .then((doc) => {
          try {
            // CRITICAL: Update sessionStorage BEFORE setting document state
            // This prevents the document loading effect from seeing stale sessionStorage
            // and trying to re-load a different document, which could cause infinite loops
            sessionStorage.setItem('aksara-current-doc-id', doc.id)

            if (doc.editor_state) {
              // Skip the content change from loading to avoid triggering auto-save
              skipNextContentChangeRef.current = true
              const state = editor.parseEditorState(doc.editor_state)
              editor.setEditorState(state)
              // Save editor state to sessionStorage for future reloads
              try {
                sessionStorage.setItem('aksara-editor-state', JSON.stringify(state.toJSON()))
              } catch {
                // Too large for sessionStorage — remove stale data so API fetch runs on reload
                try { sessionStorage.removeItem('aksara-editor-state') } catch { /* ignore */ }
              }
              // Force resegmentation after content is loaded
              // Use a small delay to ensure editor state is fully set
              setTimeout(() => {
                editor.dispatchCommand(FORCE_RESEGMENT_COMMAND, undefined)
              }, 50)
            }
            setDocumentState({
              id: doc.id,
              title: doc.title,
              hasUnsavedChanges: false,
              saveStatus: "idle",
              lastSavedAt: doc.updated_at,
            })
          } catch {
            // Clear the corrupted document reference
            updateLastOpenedDocumentId(null)
          }
        })
        .catch((error) => {
          clearTimeout(fetchTimeout)
          // Only wipe the preference if the document was definitively not found (404).
          // Network timeouts, auth errors, etc. are transient — the document likely
          // still exists and will load on the next attempt.
          if (gotNotFound) {
            updateLastOpenedDocumentId(null)
          }
        })
        .finally(() => {
          if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current)
          }
          setIsLoadingDocument(false)
        })
    } else {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current)
      }
      setIsLoadingDocument(false)
    }
  }, [editor, setDocumentState, lastOpenedDocumentId, updateLastOpenedDocumentId, isLoadingPreferences, documentState.id])

  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current)
      if (maxIntervalTimeoutRef.current) clearTimeout(maxIntervalTimeoutRef.current)
      if (savedStatusTimeoutRef.current) clearTimeout(savedStatusTimeoutRef.current)
    }
  }, [])

  // Track if we've completed initial document load to avoid clearing sessionStorage prematurely
  const hasCompletedInitialLoadRef = useRef(false)

  // Track document state changes for preferences sync (but don't save editor state here)
  // Editor state is saved only on beforeunload/visibilitychange/unmount to avoid race conditions
  useEffect(() => {
    if (documentState.id) {
      hasCompletedInitialLoadRef.current = true
      updateLastOpenedDocumentId(documentState.id)
      // Only save the document ID, not the editor state
      // Editor state saving is handled by beforeunload/visibilitychange handlers
      sessionStorage.setItem('aksara-current-doc-id', documentState.id)
      sessionStorage.setItem('aksara-doc-state', JSON.stringify({
        id: documentState.id,
        title: documentState.title,
        lastSavedAt: documentState.lastSavedAt,
      }))
    } else if (hasCompletedInitialLoadRef.current) {
      // Only clear sessionStorage after initial load is complete
      // This prevents clearing during component mount before restore can happen
      sessionStorage.removeItem('aksara-current-doc-id')
      sessionStorage.removeItem('aksara-editor-state')
      sessionStorage.removeItem('aksara-doc-state')
    }
  }, [documentState.id, documentState.title, documentState.lastSavedAt, updateLastOpenedDocumentId])

  // Save current editor state before unmounting (navigation away from editor)
  useEffect(() => {
    return () => {
      const currentDocId = documentStateRef.current.id
      if (currentDocId) {
        try {
          const editorState = editor.getEditorState()
          const editorStateJson = JSON.stringify(stripBreakNodes(editorState.toJSON()))
          sessionStorage.setItem('aksara-current-doc-id', currentDocId)
          sessionStorage.setItem('aksara-editor-state', editorStateJson)
          sessionStorage.setItem('aksara-doc-state', JSON.stringify({
            id: currentDocId,
            title: documentStateRef.current.title,
            lastSavedAt: documentStateRef.current.lastSavedAt,
          }))
        } catch {
          // Editor state too large for sessionStorage — clear stale cache
          // so the API fetch runs on reload instead of restoring old data
          try { sessionStorage.removeItem('aksara-editor-state') } catch { /* ignore */ }
        }
      }
    }
  }, [editor])

  // Save editor state on page unload (handles browser refresh/close)
  // React cleanup effects may not run fast enough on page unload
  useEffect(() => {
    const saveStateToSession = () => {
      const currentDocId = documentStateRef.current.id
      if (currentDocId) {
        try {
          const editorState = editor.getEditorState()
          const editorStateJson = JSON.stringify(stripBreakNodes(editorState.toJSON()))
          sessionStorage.setItem('aksara-current-doc-id', currentDocId)
          sessionStorage.setItem('aksara-editor-state', editorStateJson)
          sessionStorage.setItem('aksara-doc-state', JSON.stringify({
            id: currentDocId,
            title: documentStateRef.current.title,
            lastSavedAt: documentStateRef.current.lastSavedAt,
          }))
        } catch {
          // Editor state too large for sessionStorage — clear stale cache
          // so the API fetch runs on reload instead of restoring old data
          try { sessionStorage.removeItem('aksara-editor-state') } catch { /* ignore */ }
        }
      }
    }

    window.addEventListener('beforeunload', saveStateToSession)
    // Also save on visibilitychange to hidden (covers mobile tab switches, etc.)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveStateToSession()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('beforeunload', saveStateToSession)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [editor])

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
    // Clear sessionStorage so the document loading effect doesn't re-load the old doc
    sessionStorage.removeItem('aksara-current-doc-id')
    sessionStorage.removeItem('aksara-editor-state')
    sessionStorage.removeItem('aksara-doc-state')
    setDocumentState({ id: null, title: t("header.untitled"), hasUnsavedChanges: false, saveStatus: "idle", lastSavedAt: null })
    updateLastOpenedDocumentId(null)
  }, [editor, documentState.hasUnsavedChanges, setDocumentState, updateLastOpenedDocumentId])

  const performSave = useCallback(
    async (
      docId: string,
      title: string,
      forceOverwrite = false,
      isAutoSave = false,
    ): Promise<{
      success: boolean
      conflict?: boolean
      serverUpdatedAt?: string
      newUpdatedAt?: string
      storageError?: { code: "DOCUMENT_TOO_LARGE" | "STORAGE_QUOTA_EXCEEDED"; message: string }
    }> => {
      const currentState = documentStateRef.current
      const editorState = await compressStringClient(
        JSON.stringify(stripBreakNodes(editor.getEditorState().toJSON()))
      )
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
            isAutoSave,
          }),
        })

        if (response.status === 409) {
          // Conflict detected
          const data = await response.json()
          return { success: false, conflict: true, serverUpdatedAt: data.serverUpdatedAt }
        }

        if (response.status === 413) {
          // Storage limit exceeded
          const data = await response.json()
          return {
            success: false,
            storageError: {
              code: data.code || "DOCUMENT_TOO_LARGE",
              message: data.error || "Document is too large to save.",
            },
          }
        }

        if (response.ok) {
          const data = await response.json()
          // Return the server's updated_at timestamp to ensure sync
          return { success: true, newUpdatedAt: data.updated_at }
        }

        return { success: false }
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
      if (isDebugEnabled()) {
        console.log("[v0] triggerAutoSave: creating new document")
      }
      setDocumentState((prev) => ({ ...prev, saveStatus: "saving" }))

      const editorState = await compressStringClient(
        JSON.stringify(stripBreakNodes(editor.getEditorState().toJSON()))
      )
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
          if (isDebugEnabled()) {
            console.log("[v0] triggerAutoSave: new document created:", doc.id)
          }
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
          if (isDebugEnabled()) {
            console.log("[v0] triggerAutoSave: failed to create document")
          }
          setDocumentState((prev) => ({ ...prev, saveStatus: "error" }))
        }
      } catch (error) {
        // Always log errors
        console.error("[v0] Error creating document:", error)
        setDocumentState((prev) => ({ ...prev, saveStatus: "error" }))
      }
      return
    }

    if (!currentState.id || !currentState.hasUnsavedChanges) {
      if (isDebugEnabled()) {
        console.log("[v0] triggerAutoSave skipped:", {
          id: currentState.id,
          hasUnsavedChanges: currentState.hasUnsavedChanges,
        })
      }
      return
    }

    if (isDebugEnabled()) {
      console.log("[v0] triggerAutoSave starting for:", currentState.id)
    }
    setDocumentState((prev) => ({ ...prev, saveStatus: "saving" }))

    // Pass isAutoSave=true to skip expensive quota check for routine saves
    const result = await performSave(currentState.id, currentState.title, false, true)

    if (result.conflict && result.serverUpdatedAt) {
      // Show conflict dialog
      setConflictServerUpdatedAt(result.serverUpdatedAt)
      setConflictDialogOpen(true)
      setDocumentState((prev) => ({ ...prev, saveStatus: "idle" }))
    } else if (result.storageError) {
      // Show storage error dialog
      setStorageErrorCode(result.storageError.code)
      setStorageErrorMessage(result.storageError.message)
      setStorageErrorDialogOpen(true)
      setDocumentState((prev) => ({ ...prev, saveStatus: "error" }))
    } else if (result.success && result.newUpdatedAt) {
      setDocumentState((prev) => ({
        ...prev,
        hasUnsavedChanges: false,
        saveStatus: "saved",
        lastSavedAt: result.newUpdatedAt,
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
    } else if (result.storageError) {
      // Show storage error dialog
      setStorageErrorCode(result.storageError.code)
      setStorageErrorMessage(result.storageError.message)
      setStorageErrorDialogOpen(true)
      setDocumentState((prev) => ({ ...prev, saveStatus: "error" }))
    } else if (result.success && result.newUpdatedAt) {
      setDocumentState((prev) => ({
        ...prev,
        hasUnsavedChanges: false,
        saveStatus: "saved",
        lastSavedAt: result.newUpdatedAt,
      }))
      // Update sessionStorage cache so reload doesn't show stale data
      try {
        sessionStorage.setItem('aksara-editor-state', JSON.stringify(stripBreakNodes(editor.getEditorState().toJSON())))
      } catch {
        try { sessionStorage.removeItem('aksara-editor-state') } catch { /* ignore */ }
      }
      if (savedStatusTimeoutRef.current) clearTimeout(savedStatusTimeoutRef.current)
      savedStatusTimeoutRef.current = setTimeout(() => {
        setDocumentState((prev) => ({ ...prev, saveStatus: "idle" }))
      }, 2000)
    } else {
      setDocumentState((prev) => ({ ...prev, saveStatus: "error" }))
    }
  }, [documentState.id, documentState.title, editor, performSave, setDocumentState])

  // Save on visibility change (user switches tabs) and beforeunload (user closes page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && documentStateRef.current.hasUnsavedChanges) {
        // Clear pending timers and save immediately
        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current)
          autoSaveTimeoutRef.current = null
        }
        if (maxIntervalTimeoutRef.current) {
          clearTimeout(maxIntervalTimeoutRef.current)
          maxIntervalTimeoutRef.current = null
        }
        triggerAutoSave()
      }
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (documentStateRef.current.hasUnsavedChanges) {
        // Try to save (may not complete before page closes)
        triggerAutoSave()
        // Show browser's "unsaved changes" warning
        e.preventDefault()
        e.returnValue = ""
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [triggerAutoSave])

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
        const editorState = await compressStringClient(
          JSON.stringify(stripBreakNodes(editor.getEditorState().toJSON()))
        )
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
          } else if (result.storageError) {
            setStorageErrorCode(result.storageError.code)
            setStorageErrorMessage(result.storageError.message)
            setStorageErrorDialogOpen(true)
            setDocumentState((prev) => ({ ...prev, saveStatus: "error" }))
          } else if (result.success && result.newUpdatedAt) {
            setDocumentState((prev) => ({
              ...prev,
              title,
              hasUnsavedChanges: false,
              saveStatus: "saved",
              lastSavedAt: result.newUpdatedAt,
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

          // CRITICAL: Update sessionStorage BEFORE setting document state
          // This prevents the document loading effect from seeing stale sessionStorage
          // and trying to re-load a different document, which could cause infinite loops
          sessionStorage.setItem('aksara-current-doc-id', doc.id)

          if (doc.editor_state) {
            try {
              // Only skip content change if we're actually going to set editor state
              skipNextContentChangeRef.current = true
              const state = editor.parseEditorState(doc.editor_state)
              editor.setEditorState(state)
              // Force resegmentation after content is loaded
              setTimeout(() => {
                editor.dispatchCommand(FORCE_RESEGMENT_COMMAND, undefined)
              }, 50)
            } catch (error) {
              // Reset skip flag if parsing fails
              skipNextContentChangeRef.current = false
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
    if (isDebugEnabled()) {
      console.log("[handleContentChange] Called, skipFlag:", skipNextContentChangeRef.current)
    }
    if (skipNextContentChangeRef.current) {
      if (isDebugEnabled()) {
        console.log("[handleContentChange] Skipping due to skip flag")
      }
      skipNextContentChangeRef.current = false
      return
    }

    // Only update state if not already marked as having unsaved changes
    // This avoids unnecessary React re-renders on every keystroke
    setDocumentState((prev) => {
      if (prev.hasUnsavedChanges && prev.saveStatus === "idle") {
        // Already in the right state, no update needed
        return prev
      }
      if (isDebugEnabled()) {
        console.log("[handleContentChange] Setting hasUnsavedChanges: true")
      }
      return { ...prev, hasUnsavedChanges: true, saveStatus: "idle" }
    })

    // Debounce timer: resets on each change, fires 60s after last change
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }
    autoSaveTimeoutRef.current = setTimeout(() => {
      triggerAutoSave()
      // Clear max interval timer since we just saved
      if (maxIntervalTimeoutRef.current) {
        clearTimeout(maxIntervalTimeoutRef.current)
        maxIntervalTimeoutRef.current = null
      }
    }, AUTO_SAVE_DEBOUNCE_MS)

    // Max interval timer: ensures save at least every 5 minutes during continuous editing
    // Only set if not already running
    if (!maxIntervalTimeoutRef.current) {
      maxIntervalTimeoutRef.current = setTimeout(() => {
        maxIntervalTimeoutRef.current = null
        triggerAutoSave()
        // Clear debounce timer since we just saved
        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current)
          autoSaveTimeoutRef.current = null
        }
      }, AUTO_SAVE_MAX_INTERVAL_MS)
    }
  }, [setDocumentState, triggerAutoSave])

  const handleDeleteDocument = useCallback(
    (id: string) => {
      if (documentState.id === id) {
        setDocumentState({
          id: null,
          title: t("header.untitled"),
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

    if (result.storageError) {
      setStorageErrorCode(result.storageError.code)
      setStorageErrorMessage(result.storageError.message)
      setStorageErrorDialogOpen(true)
      setDocumentState((prev) => ({ ...prev, saveStatus: "error" }))
    } else if (result.success && result.newUpdatedAt) {
      setDocumentState((prev) => ({
        ...prev,
        hasUnsavedChanges: false,
        saveStatus: "saved",
        lastSavedAt: result.newUpdatedAt,
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
          // Force resegmentation after content is loaded
          setTimeout(() => {
            editor.dispatchCommand(FORCE_RESEGMENT_COMMAND, undefined)
          }, 50)
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

  const handleStorageErrorClose = useCallback(() => {
    setStorageErrorDialogOpen(false)
  }, [])

  const handleSplitWord = useCallback(() => {
    const splitInfo = getSplitInfo()
    if (splitInfo) {
      setSplitDialogData(splitInfo)
      setSplitDialogOpen(true)
    }
  }, [getSplitInfo])

  const handleConfirmSplit = useCallback(async (originalWord: string, word1: string, word2: string) => {
    // Use the cleaned originalWord from the dialog (without punctuation)
    await confirmSplit(originalWord, word1, word2)
  }, [confirmSplit])

  return (
    <>
      {isLoadingDocument && (
        <div className="flex justify-center items-center flex-1 absolute inset-0 z-50 bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}
      <div className={isLoadingDocument ? "invisible" : "contents"}>
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
          cursorDebugMode={cursorDebugMode}
          setCursorDebugMode={setCursorDebugMode}
          onVoiceStateChange={onVoiceStateChange}
          onPartialTranscriptChange={onPartialTranscriptChange}
          documentState={documentState}
          onNew={handleNew}
          onOpenDialog={() => setOpenDialogOpen(true)}
          onSave={handleSave}
          onSaveAs={handleSaveAs}
          onContentChange={handleContentChange}
          onSplitWord={handleSplitWord}
          isLoadingDocument={isLoadingDocument}
          zoomLevel={zoomLevel}
          onZoomChange={onZoomChange}
          isCompactToolbar={isCompactToolbar}
          onToggleCompactToolbar={onToggleCompactToolbar}
          isMobile={isMobile}
          deferredPluginsReady={deferredPluginsReady}
        />
      </div>

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

      <StorageErrorDialog
        open={storageErrorDialogOpen}
        onOpenChange={setStorageErrorDialogOpen}
        errorCode={storageErrorCode}
        errorMessage={storageErrorMessage}
        onClose={handleStorageErrorClose}
      />

      <SplitWordDialog
        isOpen={splitDialogOpen}
        onClose={() => setSplitDialogOpen(false)}
        initialWord={splitDialogData?.word || ""}
        initialCursorPosition={splitDialogData?.cursorPosition || 0}
        onConfirm={handleConfirmSplit}
      />
    </>
  )
}

export const KhmerLexicalEditor = forwardRef<KhmerLexicalEditorHandle, KhmerLexicalEditorProps>(
  function KhmerLexicalEditor({ className, initialEditorState }, ref) {
    const t = useTranslations("editor")
    const [breaker, setBreaker] = useState<KhmerBreaker | null>(null)
    const [showBreaks, setShowBreaks] = useState(true)
    const [wordCount, setWordCount] = useState(0)
    const [charCount, setCharCount] = useState(0)
    const [currentText, setCurrentText] = useState("")
    const [debugMode, setDebugMode] = useState(isDebugEnabled())
    const [wordBreakerDebugMode, setWordBreakerDebugMode] = useState(isWordBreakerDebugEnabled())
    const [cursorDebugMode, setCursorDebugMode] = useState(isCursorDebugEnabled())
    const [isCompactToolbar, setIsCompactToolbar] = useState(() => {
      if (typeof window === "undefined") return false
      return localStorage.getItem("aksara-compact-toolbar") === "true"
    })
    const [mounted, setMounted] = useState(false)
    const [isVoiceActive, setIsVoiceActive] = useState(false)
    const [partialTranscript, setPartialTranscript] = useState("")
    const voiceInputRef = useRef<VoiceInputHandle>(null)
    const editorRef = useRef<HTMLDivElement>(null)
    const { theme: colorTheme, setTheme } = useTheme()
    const isMobile = useIsMobile()

    const [documentState, setDocumentState] = useState<DocumentState>({
      id: null,
      title: t("header.untitled"),
      hasUnsavedChanges: false,
      saveStatus: "idle",
      lastSavedAt: null,
    })

    // Keep a ref to documentState for use in callbacks (avoids stale closures)
    const documentStateRef = useRef(documentState)
    useEffect(() => {
      documentStateRef.current = documentState
    }, [documentState])

    const { applyReplacements } = useReplacements()
    const { preferences, isLoading: isLoadingPreferences, updatePreference } = usePreferences()
    const { wordStrings: userDictionaryWords } = useUserDictionary()
    const { ignoredWords } = useIgnoredDictionaryWords()
    // Memoize to prevent creating new arrays on every render (would cause infinite loop)
    const ignoredWordStrings = useMemo(() => ignoredWords.map((w) => w.word), [ignoredWords])

    const updateLastOpenedDocumentId = useCallback(
      (id: string | null) => {
        updatePreference("last_opened_document_id", id)
      },
      [updatePreference],
    )

    const handleZoomChange = useCallback(
      (level: number) => {
        updatePreference("zoom_level", level)
      },
      [updatePreference],
    )

    const handleToggleCompactToolbar = useCallback(() => {
      setIsCompactToolbar((prev) => {
        const next = !prev
        localStorage.setItem("aksara-compact-toolbar", String(next))
        return next
      })
    }, [])

    useEffect(() => {
      setMounted(true)
    }, [])

    // Lazy-load the embedded dictionary and create the breaker
    useEffect(() => {
      let cancelled = false
      import("@/lib/khmer-dictionary-data").then(({ KHMER_DICTIONARY }) => {
        if (!cancelled) {
          setBreaker(new KhmerBreaker(KHMER_DICTIONARY))
        }
      })
      return () => { cancelled = true }
    }, [])

    // Load full dictionary asynchronously after mount
    // This supplements the embedded 5k dictionary with the full 32k dictionary
    // Skip on mobile to save ~5-10 MB of trie memory
    const isMobileScreen = typeof window !== "undefined" && window.innerWidth < 1024
    useEffect(() => {
      if (!breaker || isMobileScreen) return
      breaker.loadFullDictionaryAsync().catch((err) => {
        console.error("Failed to load full dictionary:", err)
      })
    }, [breaker])

    // User dictionary words are passed to EditorWrapper which handles loading and resegmentation

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

        // Use ref to get current state (avoids stale closure issues)
        const currentId = documentStateRef.current.id

        try {
          if (currentId) {
            // Update existing document title
            const response = await fetch(`/api/documents/${currentId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ title: newTitle, titleOnly: true }),
            })
            if (response.ok) {
              setDocumentState((prev) => ({ ...prev, saveStatus: "saved" }))
              // Transition to idle after brief "saved" indication
              setTimeout(() => {
                setDocumentState((prev) => ({ ...prev, saveStatus: "idle" }))
              }, 2000)
            } else {
              setDocumentState((prev) => ({ ...prev, saveStatus: "error" }))
            }
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
              // Transition to idle after brief "saved" indication
              setTimeout(() => {
                setDocumentState((prev) => ({ ...prev, saveStatus: "idle" }))
              }, 2000)
            } else {
              setDocumentState((prev) => ({ ...prev, saveStatus: "error" }))
            }
          }
        } catch (error) {
          console.error("[v0] Error saving document:", error)
          setDocumentState((prev) => ({ ...prev, saveStatus: "error" }))
        }
      },
      [updateLastOpenedDocumentId],
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

    if (!mounted || !breaker) {
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
          <SpellCheckProvider>
          <GrammarCheckProvider>
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
              cursorDebugMode={cursorDebugMode}
              setCursorDebugMode={setCursorDebugMode}
              onVoiceStateChange={handleVoiceStateChange}
              onPartialTranscriptChange={setPartialTranscript}
              documentState={documentState}
              setDocumentState={setDocumentState}
              initialEditorState={initialEditorState || null}
              lastOpenedDocumentId={preferences.last_opened_document_id}
              updateLastOpenedDocumentId={updateLastOpenedDocumentId}
              isLoadingPreferences={isLoadingPreferences}
              userDictionaryWords={userDictionaryWords}
              ignoredDictionaryWords={ignoredWordStrings}
              zoomLevel={preferences.zoom_level}
              onZoomChange={handleZoomChange}
              isCompactToolbar={isCompactToolbar}
              onToggleCompactToolbar={handleToggleCompactToolbar}
              isMobile={isMobile}
            />
          </GrammarCheckProvider>
          </SpellCheckProvider>
        </LexicalComposer>

        <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-4">
            <span>{t("stats.words", { count: wordCount })}</span>
            <span>{t("stats.characters", { count: charCount })}</span>
          </div>
        </div>
      </div>
    )
  },
)

function extractValidDocumentId(value: unknown): string | null {
  // If it's an object, try to extract string value
  let str: unknown = value
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>
    if ("value" in obj) str = obj.value
    else if ("id" in obj)
      str = obj.id
    else if ("toString" in obj && typeof obj.toString === "function") {
      const stringified = obj.toString()
      if (stringified !== "[object Object]") str = stringified
    }
  }

  if (typeof str !== "string" || str.length === 0) return null
  // Accept both UUIDs (hex + dashes) and CUIDs (alphanumeric)
  return /^[a-z0-9-]+$/i.test(str) ? str : null
}
