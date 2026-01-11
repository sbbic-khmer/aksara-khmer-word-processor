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
import { $setBlocksType } from "@lexical/selection"
import { $createHeadingNode, $isHeadingNode, type HeadingTagType } from "@lexical/rich-text"
import { INSERT_UNORDERED_LIST_COMMAND, INSERT_ORDERED_LIST_COMMAND, REMOVE_LIST_COMMAND } from "@lexical/list"
import { useCallback, useEffect, useState } from "react"
import { $getNearestNodeOfType, mergeRegister } from "@lexical/utils"
import { ListNode } from "@lexical/list"

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
              const fontSize = FONT_SIZE_MAP[value]
              const nodes = selection.getNodes()
              nodes.forEach((node) => {
                if ($isTextNode(node)) {
                  const currentStyle = node.getStyle()
                  // Remove existing font-size and add new one
                  const newStyle = currentStyle.replace(/font-size:\s*[^;]+;?/g, "").trim()
                  const styleWithSize = newStyle ? `${newStyle}; font-size: ${fontSize}` : `font-size: ${fontSize}`
                  node.setStyle(styleWithSize)
                }
              })
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
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        const selectedText = selection.getTextContent()
        if (selectedText) {
          // Wrap selection with Word Joiners
          selection.insertText(WJ + selectedText + WJ)
        }
      }
    })
  }, [editor])

  return { formatText, undo, redo, insertZWSP, joinWord }
}
