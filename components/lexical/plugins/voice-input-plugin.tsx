"use client"

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { $getSelection, $isRangeSelection, COMMAND_PRIORITY_EDITOR, createCommand } from "lexical"
import { useEffect, useCallback } from "react"

export const INSERT_VOICE_TEXT_COMMAND = createCommand<string>("INSERT_VOICE_TEXT")

interface VoiceInputPluginProps {
  onTranscriptInserted?: () => void
}

export function VoiceInputPlugin({ onTranscriptInserted }: VoiceInputPluginProps) {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    return editor.registerCommand(
      INSERT_VOICE_TEXT_COMMAND,
      (text: string) => {
        editor.update(() => {
          const selection = $getSelection()

          if ($isRangeSelection(selection)) {
            selection.insertText(text)
            onTranscriptInserted?.()
          }
        })
        return true
      },
      COMMAND_PRIORITY_EDITOR,
    )
  }, [editor, onTranscriptInserted])

  return null
}

// Hook to get the insert function
export function useVoiceInsert() {
  const [editor] = useLexicalComposerContext()

  const insertText = useCallback(
    (text: string) => {
      editor.dispatchCommand(INSERT_VOICE_TEXT_COMMAND, text)
    },
    [editor],
  )

  return insertText
}
