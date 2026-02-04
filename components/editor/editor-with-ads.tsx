"use client"

import { useEffect, useState } from "react"
import { KhmerLexicalEditor } from "@/components/lexical/khmer-lexical-editor"
import { MonetagProvider } from "@/components/ads"
import { DataTransparencyNotice } from "@/components/data-transparency-notice"

function EditorContent() {
  const [hasSeenDataNotice, setHasSeenDataNotice] = useState(true) // Default true to not show while loading
  const [preferencesLoaded, setPreferencesLoaded] = useState(false)

  // Fetch preferences to check if user has seen data notice
  useEffect(() => {
    fetch("/api/preferences")
      .then((res) => res.json())
      .then((data) => {
        setHasSeenDataNotice(data.has_seen_data_notice ?? false)
        setPreferencesLoaded(true)
      })
      .catch(() => {
        setPreferencesLoaded(true)
      })
  }, [])

  return (
    <>
      {/* Full-width editor - Monetag handles ad display timing/frequency */}
      <div className="h-screen">
        <KhmerLexicalEditor />
      </div>

      {/* Data transparency notice - shown once to new users */}
      {preferencesLoaded && (
        <DataTransparencyNotice
          hasSeenNotice={hasSeenDataNotice}
          onDismiss={() => setHasSeenDataNotice(true)}
        />
      )}
    </>
  )
}

export function EditorWithAds() {
  return (
    <MonetagProvider>
      <EditorContent />
    </MonetagProvider>
  )
}
