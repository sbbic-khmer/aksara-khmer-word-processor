"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { KhmerBreaker } from "@/lib/khmer-breaker"
import { KHMER_DICTIONARY } from "@/lib/khmer-dictionary-data"
import { VoiceInput } from "@/components/voice-input"
import { exportToOdt } from "@/lib/odt-export"
import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"
import { TooltipProvider } from "@/components/ui/tooltip"
import { isDebugEnabled, setDebugEnabled, debugLog } from "@/lib/debug"
import { useReplacements } from "@/hooks/use-replacements"

import {
  EditorHeader,
  FileMenu,
  FormattingToolbar,
  MobileToolbar,
  ZWSP,
  WJ,
  CLOSING_PUNCTUATION,
  OPENING_PUNCTUATION,
  extractFormattingFromDOM,
  applyFormattingToChar,
  type FormattingRange,
} from "@/components/editor"

export default function KhmerEditor() {
  const [text, setText] = useState("")
  const [wordCount, setWordCount] = useState(0)
  const [hasUserBreaks, setHasUserBreaks] = useState(false)
  const [showBreaks, setShowBreaks] = useState(true)
  const isUpdatingRef = useRef(false)
  const needsHtmlUpdateRef = useRef(false)
  const skipNextHtmlUpdateRef = useRef(false)
  const [copied, setCopied] = useState(false)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isComposingRef = useRef(false)
  const [partialVoiceText, setPartialVoiceText] = useState("")
  const [isVoiceActive, setIsVoiceActive] = useState(false)
  const savedCursorPositionRef = useRef<number | null>(null)
  const preventCursorSaveRef = useRef(false)
  const lastKnownCursorOffsetRef = useRef<number>(0)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const editorRef = useRef<HTMLDivElement>(null)

  const [debugMode, setDebugMode] = useState(false)

  const isTypingRef = useRef(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const { applyReplacements, isLoading: replacementsLoading } = useReplacements()
  const [breaker] = useState(() => new KhmerBreaker(KHMER_DICTIONARY))

  useEffect(() => {
    setDebugMode(isDebugEnabled())
  }, [])

  const handleToggleDebug = useCallback(() => {
    const newValue = !debugMode
    setDebugMode(newValue)
    setDebugEnabled(newValue)
    debugLog("Debug mode", newValue ? "enabled" : "disabled")
  }, [debugMode])

  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    heading: null as string | null,
    fontSize: "3",
    alignment: "left" as string,
    list: null as "ordered" | "unordered" | null,
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  const segments = useMemo(() => {
    if (!text.trim()) return []
    return breaker.getSegments(text)
  }, [breaker, text])

  useEffect(() => {
    const words = segments.filter((s) => s.trim() && !/^\s+$/.test(s))
    setWordCount(words.length)
    setHasUserBreaks(text.includes(ZWSP) || text.includes(WJ))
  }, [segments, text])

  // Update generateHTML to accept optional formatting parameter
  const generateHTML = useCallback(
    (formattingRanges?: FormattingRange[]) => {
      if (!text) return ""

      const paragraphs = text.split(/\n/)
      let globalCharIndex = 0

      if (paragraphs.length <= 1) {
        let html = ""
        segments.forEach((segment, segIndex) => {
          const isWhitespace = /^\s+$/.test(segment)
          const trimmedSegment = segment.trim()
          const firstChar = trimmedSegment[0] || ""
          const prevSegment = segments[segIndex - 1]
          const prevTrimmed = prevSegment?.trim() || ""
          const prevLastChar = prevTrimmed[prevTrimmed.length - 1] || ""

          const isClosingPunct = CLOSING_PUNCTUATION.has(firstChar)
          const isPrevOpeningPunct = OPENING_PUNCTUATION.has(prevLastChar)

          if (segIndex > 0 && !isWhitespace && !/^\s+$/.test(prevSegment) && !isClosingPunct && !isPrevOpeningPunct) {
            if (showBreaks) {
              html += `${ZWSP}<span class="break-marker" contenteditable="false"></span>${ZWSP}`
            } else {
              html += ZWSP
            }
          }

          for (let i = 0; i < segment.length; i++) {
            const char = segment[i]
            if (char === WJ) {
              html += WJ
            } else if (char === "\n") {
              html += "<br>"
              globalCharIndex++
            } else if (char === ZWSP) {
              html += ZWSP
            } else {
              const escaped = char.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
              if (formattingRanges && formattingRanges.length > 0) {
                html += applyFormattingToChar(escaped, globalCharIndex, formattingRanges)
              } else {
                html += escaped
              }
              globalCharIndex++
            }
          }
        })
        return html
      }

      let result = ""
      let currentIndex = 0

      paragraphs.forEach((para, paraIndex) => {
        if (para === "" && paraIndex < paragraphs.length - 1) {
          result += "<p><br></p>"
          currentIndex += 1
          globalCharIndex += 1
          return
        }

        if (para === "") {
          return
        }

        const paraStart = currentIndex
        const paraEnd = currentIndex + para.length

        let paraHtml = ""
        let charIndex = 0

        segments.forEach((segment, segIndex) => {
          const segStart = text.indexOf(segment, charIndex)
          if (segStart === -1) return

          const segEnd = segStart + segment.length
          charIndex = segEnd

          if (segEnd <= paraStart || segStart >= paraEnd) return

          const overlapStart = Math.max(segStart, paraStart)
          const overlapEnd = Math.min(segEnd, paraEnd)
          const overlapContent = text.slice(overlapStart, overlapEnd)

          if (!overlapContent) return

          const isWhitespace = /^\s+$/.test(overlapContent)
          const trimmedSegment = overlapContent.trim()
          const firstChar = trimmedSegment[0] || ""

          const isClosingPunct = CLOSING_PUNCTUATION.has(firstChar)

          if (paraHtml.length > 0 && !isWhitespace && !isClosingPunct && trimmedSegment) {
            if (showBreaks) {
              paraHtml += `${ZWSP}<span class="break-marker" contenteditable="false"></span>${ZWSP}`
            } else {
              paraHtml += ZWSP
            }
          }

          for (let i = 0; i < overlapContent.length; i++) {
            const char = overlapContent[i]
            if (char === WJ) {
              paraHtml += WJ
            } else if (char === ZWSP) {
              paraHtml += ZWSP
            } else if (char !== "\n") {
              const escaped = char.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
              if (formattingRanges && formattingRanges.length > 0) {
                paraHtml += applyFormattingToChar(escaped, globalCharIndex, formattingRanges)
              } else {
                paraHtml += escaped
              }
              globalCharIndex++
            }
          }
        })

        result += `<p>${paraHtml || "<br>"}</p>`
        currentIndex = paraEnd + 1
      })

      return result
    },
    [segments, showBreaks, text],
  )

  useEffect(() => {
    if (!editorRef.current) return
    if (isComposingRef.current) return
    if (skipNextHtmlUpdateRef.current) {
      skipNextHtmlUpdateRef.current = false
      return
    }

    if (isTypingRef.current) {
      return
    }

    if (isUpdatingRef.current && !needsHtmlUpdateRef.current) return
    needsHtmlUpdateRef.current = false

    const selection = window.getSelection()
    const hadFocus = document.activeElement === editorRef.current

    const formattingRanges = extractFormattingFromDOM(editorRef.current)

    let cursorOffset = -1
    if (hadFocus && selection && selection.rangeCount > 0 && editorRef.current.contains(selection.anchorNode)) {
      const range = selection.getRangeAt(0)
      const preCaretRange = range.cloneRange()
      preCaretRange.selectNodeContents(editorRef.current)
      preCaretRange.setEnd(range.startContainer, range.startOffset)
      const tempDiv = document.createElement("div")
      tempDiv.appendChild(preCaretRange.cloneContents())

      let textSoFar = ""
      const processNode = (node: Node, isFirst = true) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const content = (node.textContent || "").replace(new RegExp(ZWSP, "g"), "")
          textSoFar += content
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as Element
          const tagName = el.tagName.toUpperCase()

          if (el.classList.contains("break-marker") || el.classList.contains("wj-data")) {
            return
          }

          const isBlockElement = ["P", "DIV", "H1", "H2", "H3", "H4", "H5", "H6", "LI", "BLOCKQUOTE"].includes(tagName)

          if (isBlockElement && !isFirst && textSoFar.length > 0 && !textSoFar.endsWith("\n")) {
            textSoFar += "\n"
          }

          if (tagName === "BR") {
            textSoFar += "\n"
          } else {
            el.childNodes.forEach((child, index) => processNode(child, isFirst && index === 0))
          }

          if (isBlockElement && textSoFar.length > 0 && !textSoFar.endsWith("\n")) {
            textSoFar += "\n"
          }
        }
      }

      tempDiv.childNodes.forEach((child, index) => processNode(child, index === 0))
      cursorOffset = textSoFar.length
    }

    const newHTML = generateHTML(formattingRanges)
    editorRef.current.innerHTML = newHTML

    if (hadFocus && cursorOffset >= 0) {
      const restoreCursor = () => {
        if (!editorRef.current) return
        const sel = window.getSelection()
        if (!sel) return

        const blockTags = new Set(["P", "DIV", "H1", "H2", "H3", "H4", "H5", "H6", "LI", "BLOCKQUOTE"])
        let currentOffset = 0
        let foundNode: Text | null = null
        let foundOffset = 0

        const walkNode = (node: Node, isFirst: boolean): boolean => {
          if (node.nodeType === Node.TEXT_NODE) {
            const textNode = node as Text
            const cleanText = (textNode.textContent || "").replace(new RegExp(ZWSP, "g"), "")

            if (currentOffset + cleanText.length >= cursorOffset) {
              // Found the target node
              foundNode = textNode
              const nodeText = textNode.textContent || ""
              let realOffset = 0
              let cleanOffset = 0

              for (let i = 0; i < nodeText.length; i++) {
                if (cleanOffset >= cursorOffset - currentOffset) break
                realOffset++
                if (nodeText[i] !== ZWSP) cleanOffset++
              }
              foundOffset = Math.min(realOffset, nodeText.length)
              return true // stop walking
            }
            currentOffset += cleanText.length
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as Element
            const tagName = el.tagName
            const isBlockElement = blockTags.has(tagName)

            // Add newline BEFORE block elements (except first)
            if (isBlockElement && !isFirst && currentOffset > 0) {
              if (currentOffset >= cursorOffset) {
                // Cursor is at the newline before this block - place at end of previous text
                return true
              }
              currentOffset++
            }

            if (tagName === "BR") {
              if (currentOffset >= cursorOffset) {
                return true
              }
              currentOffset++
            } else {
              const children = el.childNodes
              for (let i = 0; i < children.length; i++) {
                if (walkNode(children[i], isFirst && i === 0)) {
                  return true
                }
              }
            }

            // Add newline AFTER block elements
            if (isBlockElement && currentOffset > 0) {
              // Don't double-count if we already added one
            }
          }
          return false
        }

        const children = editorRef.current.childNodes
        for (let i = 0; i < children.length; i++) {
          if (walkNode(children[i], i === 0)) {
            break
          }
        }

        if (foundNode) {
          try {
            const range = document.createRange()
            range.setStart(foundNode, foundOffset)
            range.collapse(true)
            sel.removeAllRanges()
            sel.addRange(range)
          } catch (e) {
            editorRef.current?.focus()
          }
        } else {
          // Fallback: place cursor at end of editor
          try {
            const range = document.createRange()
            range.selectNodeContents(editorRef.current)
            range.collapse(false) // collapse to end
            sel.removeAllRanges()
            sel.addRange(range)
          } catch (e) {
            editorRef.current?.focus()
          }
        }
      }

      requestAnimationFrame(restoreCursor)
    } else if (hadFocus) {
      editorRef.current.focus()
    }
  }, [generateHTML, refreshKey, text, segments, showBreaks])

  const handleInput = useCallback(() => {
    if (!editorRef.current) return
    if (isComposingRef.current) return

    isTypingRef.current = true
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false
      needsHtmlUpdateRef.current = true
      setRefreshKey((prev) => prev + 1)
    }, 100) // Reduced from 500ms to 100ms to prevent race condition during fast typing

    let newText = ""
    const processNode = (node: Node, isFirst = true) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const content = (node.textContent || "").replace(new RegExp(ZWSP, "g"), "")
        newText += content
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element
        const tagName = el.tagName.toUpperCase()

        if (el.classList.contains("break-marker") || el.classList.contains("wj-data")) {
          return
        }

        const isBlockElement = ["P", "DIV", "H1", "H2", "H3", "H4", "H5", "H6", "LI", "BLOCKQUOTE"].includes(tagName)

        if (isBlockElement && !isFirst && newText.length > 0 && !newText.endsWith("\n")) {
          newText += "\n"
        }

        if (tagName === "BR") {
          newText += "\n"
        } else {
          el.childNodes.forEach((child, index) => processNode(child, isFirst && index === 0))
        }

        if (isBlockElement && newText.length > 0 && !newText.endsWith("\n")) {
          newText += "\n"
        }
      }
    }

    editorRef.current.childNodes.forEach((child, index) => processNode(child, index === 0))

    // Removed the line that strips trailing newlines
    console.log("[v0] handleInput - extracted text:", newText.slice(0, 30), "length:", newText.length)

    setText(newText)

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    if (skipNextHtmlUpdateRef.current) {
      return
    }

    debounceTimeoutRef.current = setTimeout(() => {
      needsHtmlUpdateRef.current = true
      setRefreshKey((prev) => prev + 1)
    }, 150)
  }, [])

  const handleInsertZWSP = useCallback(() => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    const wjNode = document.createTextNode(WJ)
    range.insertNode(wjNode)
    range.setStartAfter(wjNode)
    range.collapse(true)
    selection.removeAllRanges()
    selection.addRange(range)

    handleInput()
  }, [handleInput])

  const handleJoinWord = useCallback(() => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return

    const selectedText = selection.toString()
    if (!selectedText.trim()) return

    const cleanText = selectedText.replace(new RegExp(`[${ZWSP}${WJ}]`, "g"), "")
    const joinedText = WJ + cleanText + WJ

    const range = selection.getRangeAt(0)
    range.deleteContents()
    const textNode = document.createTextNode(joinedText)
    range.insertNode(textNode)

    range.setStartAfter(textNode)
    range.collapse(true)
    selection.removeAllRanges()
    selection.addRange(range)

    handleInput()
  }, [handleInput])

  const handleCopyWithBreaks = useCallback(async () => {
    const withBreaks = breaker.insertBreakOpportunities(text)
    const cleanOutput = withBreaks.replace(new RegExp(WJ, "g"), "")
    try {
      await navigator.clipboard.writeText(cleanOutput)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }, [breaker, text])

  const handleCopy = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault()
      const selection = window.getSelection()
      if (!selection) return

      let selectedText = selection.toString()
      selectedText = selectedText.replace(new RegExp(ZWSP, "g"), "")
      const withBreaks = breaker.insertBreakOpportunities(selectedText)
      const cleanOutput = withBreaks.replace(new RegExp(WJ, "g"), "")
      e.clipboardData.setData("text/plain", cleanOutput)
    },
    [breaker],
  )

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault()
      const pastedText = e.clipboardData.getData("text/plain")

      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0) return

      const range = selection.getRangeAt(0)
      range.deleteContents()
      const textNode = document.createTextNode(pastedText)
      range.insertNode(textNode)
      range.setStartAfter(textNode)
      range.collapse(true)
      selection.removeAllRanges()
      selection.addRange(range)

      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
      needsHtmlUpdateRef.current = true
      setTimeout(() => {
        handleInput()
        setRefreshKey((prev) => prev + 1)
      }, 50)
    },
    [handleInput],
  )

  const updateActiveFormats = useCallback(() => {
    if (!editorRef.current) return

    let alignment = "left"
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      let node: Node | null = selection.anchorNode
      while (node && node !== editorRef.current) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement
          const style = el.style.textAlign || window.getComputedStyle(el).textAlign
          if (style && ["left", "center", "right", "justify"].includes(style)) {
            alignment = style
            break
          }
        }
        node = node.parentNode
      }
    }

    let list: "ordered" | "unordered" | null = null
    if (selection && selection.rangeCount > 0) {
      let node: Node | null = selection.anchorNode
      while (node && node !== editorRef.current) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const tagName = (node as Element).tagName
          if (tagName === "UL") {
            list = "unordered"
            break
          } else if (tagName === "OL") {
            list = "ordered"
            break
          }
        }
        node = node.parentNode
      }
    }

    setActiveFormats({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      strikethrough: document.queryCommandState("strikeThrough"),
      heading: getActiveHeading(),
      fontSize: document.queryCommandValue("fontSize") || "3",
      alignment,
      list,
    })
  }, [])

  function getActiveHeading(): string | null {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return null

    let node: Node | null = selection.anchorNode
    while (node && node !== editorRef.current) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const tagName = (node as Element).tagName
        if (["H1", "H2", "H3"].includes(tagName)) {
          return tagName
        }
      }
      node = node.parentNode
    }
    return null
  }

  const handleUndo = useCallback(() => {
    if (!editorRef.current) return
    editorRef.current.focus()
    document.execCommand("undo")
  }, [])

  const handleRedo = useCallback(() => {
    if (!editorRef.current) return
    editorRef.current.focus()
    document.execCommand("redo")
  }, [])

  const handleFormat = useCallback(
    (command: string, value?: string) => {
      if (!editorRef.current) return
      editorRef.current.focus()

      if (command !== "bulletList" && command !== "numberedList") {
        skipNextHtmlUpdateRef.current = true
      }

      if (command === "bold") {
        document.execCommand("bold", false)
      } else if (command === "italic") {
        document.execCommand("italic", false)
      } else if (command === "underline") {
        document.execCommand("underline", false)
      } else if (command === "strikethrough") {
        document.execCommand("strikeThrough", false)
      } else if (command === "heading") {
        if (value === "p") {
          document.execCommand("formatBlock", false, "p")
        } else {
          document.execCommand("formatBlock", false, value)
        }
      } else if (command === "fontSize") {
        document.execCommand("fontSize", false, value)
      } else if (command === "bulletList") {
        document.execCommand("insertUnorderedList", false)
      } else if (command === "numberedList") {
        document.execCommand("insertOrderedList", false)
      } else if (command === "align") {
        document.execCommand("justify" + value?.charAt(0).toUpperCase() + value?.slice(1), false)
      }

      updateActiveFormats()
      if (command === "bulletList" || command === "numberedList") {
        handleInput()
      }
    },
    [handleInput, updateActiveFormats],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        skipNextHtmlUpdateRef.current = true
        return
      }

      if (e.ctrlKey || e.metaKey) {
        if (e.key === "b") {
          e.preventDefault()
          handleFormat("bold")
          return
        } else if (e.key === "i") {
          e.preventDefault()
          handleFormat("italic")
          return
        } else if (e.key === "u") {
          e.preventDefault()
          handleFormat("underline")
          return
        }
      }

      if (e.key !== "Backspace" && e.key !== "Delete") return

      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0) return

      const range = selection.getRangeAt(0)
      if (!range.collapsed) return

      const node = range.startContainer
      const offset = range.startOffset

      if (e.key === "Backspace") {
        let prevNode: Node | null = null

        if (node.nodeType === Node.TEXT_NODE && offset === 0) {
          prevNode = node.previousSibling
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          prevNode = (node as Element).childNodes[offset - 1] || null
        }

        while (prevNode) {
          if (prevNode.nodeType === Node.ELEMENT_NODE && (prevNode as Element).classList?.contains("break-marker")) {
            const nextPrev = prevNode.previousSibling
            prevNode.parentNode?.removeChild(prevNode)
            prevNode = nextPrev
            continue
          } else if (prevNode.nodeType === Node.TEXT_NODE) {
            const text = prevNode.textContent || ""
            if (text === ZWSP || text === ZWSP + ZWSP) {
              const nextPrev = prevNode.previousSibling
              prevNode.parentNode?.removeChild(prevNode)
              prevNode = nextPrev
              continue
            }
            break
          }
          break
        }
      } else if (e.key === "Delete") {
        let nextNode: Node | null = null

        if (node.nodeType === Node.TEXT_NODE && offset === (node.textContent?.length || 0)) {
          nextNode = node.nextSibling
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          nextNode = (node as Element).childNodes[offset] || null
        }

        while (nextNode) {
          if (nextNode.nodeType === Node.ELEMENT_NODE && (nextNode as Element).classList?.contains("break-marker")) {
            const nextNext = nextNode.nextSibling
            nextNode.parentNode?.removeChild(nextNode)
            nextNode = nextNext
            continue
          } else if (nextNode.nodeType === Node.TEXT_NODE) {
            const text = nextNode.textContent || ""
            if (text === ZWSP || text === ZWSP + ZWSP) {
              const nextNext = nextNode.nextSibling
              nextNode.parentNode?.removeChild(nextNode)
              nextNode = nextNext
              continue
            }
            break
          }
          break
        }
      }
    },
    [handleFormat],
  )

  useEffect(() => {
    // Use NEXT_PUBLIC_SHOW_SAMPLE_TEXT for client-side env variable check
    if (process.env.NEXT_PUBLIC_SHOW_SAMPLE_TEXT === "true") {
      const initialText = "សួស្តីបងប្អូនទាំងអស់គ្នា។ ខ្ញុំសង្ឃឹមថាអ្នកទាំងអស់គ្នាមានសុខភាពល្អ។"
      setText(initialText)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])

  const handleCompositionStart = useCallback(() => {
    isComposingRef.current = true
  }, [])

  const handleCompositionEnd = useCallback(() => {
    isComposingRef.current = false
    handleInput()
  }, [handleInput])

  const saveCursorPosition = useCallback(() => {
    if (!editorRef.current) return
    if (preventCursorSaveRef.current) {
      return
    }

    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    if (!selection.anchorNode) return
    if (!editorRef.current.contains(selection.anchorNode)) return

    const range = selection.getRangeAt(0)
    const preCaretRange = range.cloneRange()
    preCaretRange.selectNodeContents(editorRef.current)
    preCaretRange.setEnd(range.startContainer, range.startOffset)
    const tempDiv = document.createElement("div")
    tempDiv.appendChild(preCaretRange.cloneContents())

    let cursorOffset = 0
    let textSoFar = ""
    const processNode = (node: Node, isFirst = true) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const content = (node.textContent || "").replace(new RegExp(ZWSP, "g"), "")
        cursorOffset += content.length
        textSoFar += content
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element
        const tagName = el.tagName.toUpperCase()

        if (el.classList.contains("break-marker") || el.classList.contains("wj-data")) {
          return
        }

        const isBlockElement = ["P", "DIV", "H1", "H2", "H3", "H4", "H5", "H6", "LI", "BLOCKQUOTE"].includes(tagName)

        if (isBlockElement && !isFirst && textSoFar.length > 0 && !textSoFar.endsWith("\n")) {
          cursorOffset += 1
          textSoFar += "\n"
        }

        if (tagName === "BR") {
          cursorOffset += 1
          textSoFar += "\n"
        } else {
          el.childNodes.forEach((child, index) => processNode(child, isFirst && index === 0))
        }

        if (isBlockElement && textSoFar.length > 0 && !textSoFar.endsWith("\n")) {
          cursorOffset += 1
          textSoFar += "\n"
        }
      }
    }

    tempDiv.childNodes.forEach((child, index) => processNode(child, index === 0))

    console.log("[v0] saveCursorPosition DEBUG:", {
      cursorOffset,
      textSoFar,
      tempDivInnerHTML: tempDiv.innerHTML,
      editorInnerHTML: editorRef.current.innerHTML.substring(0, 200),
      anchorNodeType: selection.anchorNode.nodeType,
      anchorNodeName: selection.anchorNode.nodeName,
      anchorOffset: selection.anchorOffset,
    })

    if (cursorOffset >= 0) {
      savedCursorPositionRef.current = cursorOffset
    }
  }, [])

  const insertTextAtCursor = useCallback((textToInsert: string) => {
    if (!editorRef.current || !textToInsert.trim()) return

    preventCursorSaveRef.current = true

    setText((currentText) => {
      const insertPosition = savedCursorPositionRef.current ?? currentText.length

      console.log("[v0] insertTextAtCursor DEBUG:", {
        insertPosition,
        savedCursorPositionRef: savedCursorPositionRef.current,
        currentTextLength: currentText.length,
        currentTextPreview: currentText.substring(0, 100),
        currentTextHasNewlines: currentText.includes("\n"),
        newlineCount: (currentText.match(/\n/g) || []).length,
        textToInsert,
      })

      const newText = currentText.slice(0, insertPosition) + textToInsert + currentText.slice(insertPosition)

      savedCursorPositionRef.current = insertPosition + textToInsert.length

      return newText
    })

    needsHtmlUpdateRef.current = true
    setRefreshKey((prev) => prev + 1)
    setPartialVoiceText("")

    setTimeout(() => {
      if (!editorRef.current) return
      editorRef.current.focus()

      const newCursorPos = savedCursorPositionRef.current ?? 0
      try {
        const selection = window.getSelection()
        if (!selection) return

        let currentOffset = 0
        const walker = document.createTreeWalker(editorRef.current, NodeFilter.SHOW_TEXT, null)
        let node: Text | null
        let targetNode: Text | null = null
        let targetOffset = 0

        while ((node = walker.nextNode() as Text | null)) {
          const nodeText = node.textContent || ""
          const cleanText = nodeText.replace(new RegExp(ZWSP, "g"), "")
          if (currentOffset + cleanText.length >= newCursorPos) {
            targetNode = node
            let realOffset = 0
            let cleanOffset = 0
            for (let i = 0; i < nodeText.length && cleanOffset < newCursorPos - currentOffset; i++) {
              if (nodeText[i] !== ZWSP) {
                cleanOffset++
              }
              realOffset++
            }
            targetOffset = realOffset
            break
          }
          currentOffset += cleanText.length
        }

        if (targetNode) {
          const range = document.createRange()
          range.setStart(targetNode, Math.min(targetOffset, targetNode.length))
          range.collapse(true)
          selection.removeAllRanges()
          selection.addRange(range)
        }
      } catch {
        // Cursor restoration failed
      }

      setTimeout(() => {
        preventCursorSaveRef.current = false
      }, 200)
    }, 50)
  }, [])

  const handlePartialTranscript = useCallback((text: string) => {
    setPartialVoiceText(text)
  }, [])

  const handleVoiceStateChange = useCallback((active: boolean) => {
    setIsVoiceActive(active)
    if (!active) {
      setPartialVoiceText("")
    }
  }, [])

  const handleSelectionChange = useCallback(() => {
    updateActiveFormats()
  }, [updateActiveFormats])

  const handleExportOdt = useCallback(async () => {
    if (!editorRef.current) return
    try {
      await exportToOdt(editorRef.current, "aksara-document.odt")
    } catch (err) {
      console.error("Failed to export ODT:", err)
    }
  }, [])

  const handleApplyReplacements = useCallback(async () => {
    if (!editorRef.current) return
    const currentText = editorRef.current.innerText.replace(new RegExp(ZWSP, "g"), "")
    const replacedText = await applyReplacements(currentText)
    if (replacedText) {
      setText(replacedText)
      setRefreshKey((prev) => prev + 1)
    }
  }, [applyReplacements])

  return (
    <TooltipProvider>
      <div className="h-screen flex flex-col bg-gray-100 dark:bg-[#1a1a1a]">
        {/* Header / Toolbar */}
        <header className="bg-white dark:bg-[#202124] border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
          <EditorHeader theme={theme} setTheme={setTheme} mounted={mounted} />

          {/* Formatting Toolbar - Desktop */}
          <div className="hidden md:flex items-center gap-0.5 px-2 py-1.5 overflow-x-auto">
            <FileMenu
              onCopyWithBreaks={handleCopyWithBreaks}
              onExportOdt={handleExportOdt}
              debugMode={debugMode}
              onToggleDebug={handleToggleDebug}
            />

            <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

            <FormattingToolbar
              activeFormats={activeFormats}
              onFormat={handleFormat}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onInsertZWSP={handleInsertZWSP}
              onJoinWord={handleJoinWord}
              autoWordBreak={showBreaks}
              onToggleAutoWordBreak={() => setShowBreaks(!showBreaks)}
              spellCheckEnabled={true}
              onToggleSpellCheck={() => {}}
            />

            <div className="flex-1" />

            {/* Voice Input */}
            <VoiceInput
              onTranscript={insertTextAtCursor}
              onPartialTranscript={handlePartialTranscript}
              onVoiceStateChange={handleVoiceStateChange}
              applyReplacements={applyReplacements}
            />
          </div>

          <div className="flex md:hidden items-center gap-1 px-2 py-1.5">
            <MobileToolbar
              activeFormats={activeFormats}
              onFormat={handleFormat}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onInsertZWSP={handleInsertZWSP}
              onJoinWord={handleJoinWord}
              autoWordBreak={showBreaks}
              onToggleAutoWordBreak={() => setShowBreaks(!showBreaks)}
              spellCheckEnabled={true}
              onToggleSpellCheck={() => {}}
              onApplyReplacements={handleApplyReplacements}
              replacementsLoading={replacementsLoading}
            />

            <div className="flex-1" />

            {/* Voice Input */}
            <VoiceInput
              onTranscript={insertTextAtCursor}
              onPartialTranscript={handlePartialTranscript}
              onVoiceStateChange={handleVoiceStateChange}
              applyReplacements={applyReplacements}
            />
          </div>
        </header>

        {/* Main Content Area - Document Style */}
        <main className="flex-1 overflow-auto py-4 sm:py-8">
          <div className="md:max-w-[850px] mx-auto px-2 sm:px-4">
            {/* Voice Recording Indicator */}
            {isVoiceActive && (
              <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium text-red-700 dark:text-red-300">Recording...</span>
                  {partialVoiceText && (
                    <span className="text-sm text-red-600 dark:text-red-400 italic truncate flex-1">
                      {partialVoiceText}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Editor Content */}
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={handleInput}
              onKeyDown={handleKeyDown}
              onCopy={handleCopy}
              onPaste={handlePaste}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
              onMouseUp={saveCursorPosition}
              onKeyUp={saveCursorPosition}
              onFocus={saveCursorPosition}
              onSelect={handleSelectionChange}
              className={cn(
                "min-h-[calc(100vh-200px)] sm:min-h-[800px] w-full",
                "bg-white dark:bg-[#1e1e1e]",
                "shadow-sm border border-gray-200 dark:border-gray-700",
                "p-6 sm:p-12 md:p-16",
                "text-lg sm:text-xl leading-relaxed",
                "text-gray-800 dark:text-gray-200",
                "focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                "prose prose-lg dark:prose-invert max-w-none",
                "[&_.break-marker]:inline-block [&_.break-marker]:w-[1px] [&_.break-marker]:h-[1.2em]",
                "[&_.break-marker]:bg-blue-400/60 [&_.break-marker]:dark:bg-blue-500/50",
                "[&_.break-marker]:mx-[1px] [&_.break-marker]:align-middle",
                "[&_.break-marker]:select-none [&_.break-marker]:pointer-events-none",
              )}
              style={{
                fontFamily: 'var(--font-battambang), "Noto Sans Khmer", sans-serif',
                wordBreak: "keep-all",
                overflowWrap: "break-word",
                whiteSpace: "pre-wrap",
              }}
              dir="ltr"
              spellCheck={false}
            />
          </div>
        </main>

        {/* Status Bar */}
        <footer className="bg-white dark:bg-[#202124] border-t border-gray-200 dark:border-gray-700 px-4 py-2">
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
            <span>
              {wordCount} {wordCount === 1 ? "word" : "words"}
              {hasUserBreaks && " • Contains custom breaks"}
            </span>
            <button
              onClick={() => setShowBreaks(!showBreaks)}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              {showBreaks ? "Hide breaks" : "Show breaks"}
            </button>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  )
}
