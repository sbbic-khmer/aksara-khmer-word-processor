"use client"

import { useEffect, useRef } from "react"
import { KhmerLexicalEditor } from "@/components/lexical/khmer-lexical-editor"
import { AdSenseProvider, SidebarAd, MobileAdPopup } from "@/components/ads"
import { useAdTimer, COUNTDOWN_DURATION } from "@/hooks/use-ad-timer"

interface EditorWithAdsProps {
  testMode?: boolean
}

function EditorContent({ testMode = false }: EditorWithAdsProps) {
  const editorContainerRef = useRef<HTMLDivElement>(null)
  const { showPopup, dismissAd, reportTypingActivity } = useAdTimer()

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
      <div className="flex h-screen">
        {/* Main editor area */}
        <div ref={editorContainerRef} className="flex-1 min-w-0">
          <KhmerLexicalEditor />
        </div>

        {/* Desktop sidebar - only shows on lg screens (≥1024px) */}
        <aside className="hidden lg:block w-[316px] flex-shrink-0 bg-gray-100 dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700">
          <SidebarAd testMode={testMode} />
        </aside>
      </div>

      {/* Mobile ad popup - only renders on mobile (<1024px via CSS) */}
      <MobileAdPopup
        isOpen={showPopup}
        onDismiss={dismissAd}
        countdownDuration={COUNTDOWN_DURATION}
        testMode={testMode}
      />
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
