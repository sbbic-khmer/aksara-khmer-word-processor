"use client"

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import {
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  UNDO_COMMAND,
  REDO_COMMAND,
  $createParagraphNode,
  $isTextNode,
} from "lexical"
import { FORCE_RESEGMENT_COMMAND, clearSegmentationCache } from "./khmer-word-break-plugin"
import { $setBlocksType, $patchStyleText } from "@lexical/selection"
import { $createHeadingNode, $isHeadingNode, type HeadingTagType } from "@lexical/rich-text"
import { INSERT_UNORDERED_LIST_COMMAND, INSERT_ORDERED_LIST_COMMAND, REMOVE_LIST_COMMAND } from "@lexical/list"
import { useCallback, useEffect, useState } from "react"
import { $getNearestNodeOfType, mergeRegister } from "@lexical/utils"
import { ListNode } from "@lexical/list"
import { mutate } from "swr"

export interface ActiveFormats {
  bold: boolean
  italic: boolean
  underline: boolean
  strikethrough: boolean
  highlight: boolean
  heading: string | null
  fontSize: string
  alignment: string
  list: "ordered" | "unordered" | null
}

interface ToolbarPluginProps {
  onFormatsChange: (formats: ActiveFormats) => void
}

const ZWSP = "\u200B"
const WJ = "\u2060"

const FONT_SIZE_MAP: Record<string, string> = {
  "1": "10px",
  "2": "13px",
  "3": "16px",
  "4": "18px",
  "5": "24px",
  "6": "32px",
  "7": "48px",
}

export function ToolbarPlugin({ onFormatsChange }: ToolbarPluginProps) {
  const [editor] = useLexicalComposerContext()
  const [activeFormats, setActiveFormats] = useState<ActiveFormats>({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    highlight: false,
    heading: null,
    fontSize: "3",
    alignment: "left",
    list: null,
  })

  const updateToolbar = useCallback(() => {
    const selection = $getSelection()
    if ($isRangeSelection(selection)) {
      const anchorNode = selection.anchor.getNode()
      const element = anchorNode.getKey() === "root" ? anchorNode : anchorNode.getTopLevelElementOrThrow()

      // Check heading
      let heading: string | null = null
      if ($isHeadingNode(element)) {
        heading = element.getTag().toUpperCase()
      }

      // Check list
      let list: "ordered" | "unordered" | null = null
      const listNode = $getNearestNodeOfType(anchorNode, ListNode)
      if (listNode) {
        list = listNode.getListType() === "number" ? "ordered" : "unordered"
      }

      let fontSize = "3"
      if ($isTextNode(anchorNode)) {
        const style = anchorNode.getStyle()
        const fontSizeMatch = style.match(/font-size:\s*(\d+)px/)
        if (fontSizeMatch) {
          const px = fontSizeMatch[1] + "px"
          for (const [key, value] of Object.entries(FONT_SIZE_MAP)) {
            if (value === px) {
              fontSize = key
              break
            }
          }
        }
      }

      const newFormats: ActiveFormats = {
        bold: selection.hasFormat("bold"),
        italic: selection.hasFormat("italic"),
        underline: selection.hasFormat("underline"),
        strikethrough: selection.hasFormat("strikethrough"),
        highlight: selection.hasFormat("highlight"),
        heading,
        fontSize,
        alignment: "left",
        list,
      }

      setActiveFormats(newFormats)
      onFormatsChange(newFormats)
    }
  }, [onFormatsChange])

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          updateToolbar()
        })
      }),
    )
  }, [editor, updateToolbar])

  return null
}

// Hook to expose formatting commands
export function useToolbarCommands() {
  const [editor] = useLexicalComposerContext()

  const formatText = useCallback(
    (command: string, value?: string) => {
      editor.update(() => {
        const selection = $getSelection()
        if (!$isRangeSelection(selection)) return

        switch (command) {
          case "bold":
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")
            break
          case "italic":
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")
            break
          case "underline":
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")
            break
          case "strikethrough":
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough")
            break
          case "highlight":
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, "highlight")
            break
          case "fontSize":
            if (value && FONT_SIZE_MAP[value]) {
              $patchStyleText(selection, { "font-size": FONT_SIZE_MAP[value] })
            }
            break
          case "heading":
            if (value === "p") {
              $setBlocksType(selection, () => $createParagraphNode())
            } else if (value) {
              $setBlocksType(selection, () => $createHeadingNode(value as HeadingTagType))
            }
            break
          case "bulletList":
            editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)
            break
          case "numberedList":
            editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)
            break
          case "removeList":
            editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)
            break
        }
      })
    },
    [editor],
  )

  const undo = useCallback(() => {
    editor.dispatchCommand(UNDO_COMMAND, undefined)
  }, [editor])

  const redo = useCallback(() => {
    editor.dispatchCommand(REDO_COMMAND, undefined)
  }, [editor])

  const insertZWSP = useCallback(() => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        selection.insertText(ZWSP)
      }
    })
  }, [editor])

  const joinWord = useCallback(() => {
    let cleanedWord = ''

    // First read the selection to get the word
    editor.getEditorState().read(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        const selectedText = selection.getTextContent()
        if (selectedText) {
          // Clean the text - remove existing ZWSPs and WJs to get the actual word
          cleanedWord = selectedText.replace(/[\u200B\u2060]/g, '').trim()
        }
      }
    })

    // Then collapse selection to end (so cursor stays near the joined word after resegment)
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        selection.anchor.set(selection.focus.key, selection.focus.offset, selection.focus.type)
      }
    })

    // Save the joined word to the user's dictionary (if logged in)
    // The dictionary update will trigger a resegmentation automatically
    if (cleanedWord.length > 0) {
      fetch('/api/dictionary/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: cleanedWord }),
      }).then(res => {
        if (res.ok) {
          // Trigger SWR revalidation so the breaker gets the new word
          mutate('/api/dictionary/user')
        }
      }).catch(() => {
        // Silently fail if not logged in or API error
      })
    }
  }, [editor])

  const getSplitInfo = useCallback(() => {
    let result: { word: string; cursorPosition: number } | null = null

    editor.getEditorState().read(() => {
      const selection = $getSelection()
      if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
        return
      }

      // Get the text node at cursor
      const anchor = selection.anchor
      const node = anchor.getNode()
      if (!$isTextNode(node)) {
        return
      }

      const textContent = node.getTextContent()
      const offset = anchor.offset

      // Find the word boundaries around the cursor
      // Look backwards for ZWSP or start of text
      let startIndex = offset - 1
      while (startIndex >= 0 && textContent[startIndex] !== ZWSP && textContent[startIndex] !== WJ) {
        startIndex--
      }
      startIndex++ // Move to character after ZWSP or to start

      // Look forwards for ZWSP or end of text
      let endIndex = offset
      while (endIndex < textContent.length && textContent[endIndex] !== ZWSP && textContent[endIndex] !== WJ) {
        endIndex++
      }

      // Extract the word
      const word = textContent.slice(startIndex, endIndex)

      // Remove any zero-width characters from the word
      const cleanWord = word.replace(/[\u200B\u2060]/g, '')

      // Calculate cursor position within the clean word
      const beforeCursor = textContent.slice(startIndex, offset).replace(/[\u200B\u2060]/g, '')
      const cursorPosition = beforeCursor.length

      if (cleanWord.length > 0) {
        result = { word: cleanWord, cursorPosition }
      }
    })

    return result
  }, [editor])

  const confirmSplit = useCallback(async (originalWord: string, word1: string, word2: string) => {
    // 1. Delete the original word from user dictionary (if present)
    try {
      await fetch(`/api/dictionary/user?word=${encodeURIComponent(originalWord)}`, {
        method: 'DELETE',
      })
    } catch {
      // Ignore error if word wasn't in dictionary
    }

    // 2. Add the original word to the ignore list (prevents master dictionary from preferring it)
    try {
      await fetch('/api/dictionary/user/ignored', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: originalWord }),
      })
    } catch {
      // Ignore error if already in ignore list
    }

    // 3. Add both split words to dictionary
    try {
      await Promise.all([
        fetch('/api/dictionary/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ word: word1 }),
        }),
        fetch('/api/dictionary/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ word: word2 }),
        }),
      ])

      // 4. Trigger SWR revalidation for both dictionary and ignore list
      await Promise.all([
        mutate('/api/dictionary/user'),
        mutate('/api/dictionary/user/ignored')
      ])

      // 5. Clear segmentation cache and force resegmentation
      // Cache must be cleared so stale results with the old word aren't returned
      clearSegmentationCache()
      editor.dispatchCommand(FORCE_RESEGMENT_COMMAND, undefined)
    } catch (error) {
      console.error('Error splitting word:', error)
      throw error
    }
  }, [editor])

  return { formatText, undo, redo, insertZWSP, joinWord, getSplitInfo, confirmSplit }
}
