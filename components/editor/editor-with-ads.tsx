"use client"

import { useEffect, useRef, useState } from "react"
import { KhmerLexicalEditor } from "@/components/lexical/khmer-lexical-editor"
import { AdSenseProvider, SidebarAd, MobileAdPopup } from "@/components/ads"
import { useAdTimer, COUNTDOWN_DURATION } from "@/hooks/use-ad-timer"
import { DataTransparencyNotice } from "@/components/data-transparency-notice"

interface EditorWithAdsProps {
  testMode?: boolean
}

function EditorContent({ testMode = false }: EditorWithAdsProps) {
  const editorContainerRef = useRef<HTMLDivElement>(null)
  const { showPopup, dismissAd, reportTypingActivity } = useAdTimer()
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

  // Listen for typing activity in the editor
  useEffect(() => {
    const container = editorContainerRef.current
    if (!container) return

    const handleInput = () => {
      reportTypingActivity()
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only count actual typing keys, not navigation
      if (e.key.length === 1 || e.key === "Backspace" || e.key === "Delete" || e.key === "Enter") {
        reportTypingActivity()
      }
    }

    container.addEventListener("input", handleInput)
    container.addEventListener("keydown", handleKeyDown)

    return () => {
      container.removeEventListener("input", handleInput)
      container.removeEventListener("keydown", handleKeyDown)
    }
  }, [reportTypingActivity])

  return (
    <>
      {/*
        Responsive ad layout:
        - ≥1440px: Left ad | Editor | Right ad (three-column)
        - 1024px-1439px: Editor | Right ad (two-column)
        - <1024px: Editor only (mobile popup ads)
      */}
      <div className="flex h-screen">
        {/* Left sidebar - only shows on extra large screens (≥1440px) */}
        <aside className="hidden min-[1440px]:block w-[316px] flex-shrink-0 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
          <SidebarAd testMode={testMode} position="left" />
        </aside>

        {/* Main editor area - always visible, centered between ads on large screens */}
        <div ref={editorContainerRef} className="flex-1 min-w-0">
          <KhmerLexicalEditor />
        </div>

        {/* Right sidebar - shows on lg screens and up (≥1024px) */}
        <aside className="hidden lg:block w-[316px] flex-shrink-0 bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
          <SidebarAd testMode={testMode} position="right" />
        </aside>
      </div>

      {/* Mobile ad popup - only triggers on mobile (<1024px via useAdTimer) */}
      <MobileAdPopup
        isOpen={showPopup}
        onDismiss={dismissAd}
        countdownDuration={COUNTDOWN_DURATION}
        testMode={testMode}
      />

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

export function EditorWithAds({ testMode = false }: EditorWithAdsProps) {
  return (
    <AdSenseProvider>
      <EditorContent testMode={testMode} />
    </AdSenseProvider>
  )
}
