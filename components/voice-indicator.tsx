"use client"

import { useEffect, useState } from "react"
import { Mic } from "lucide-react"

interface VoiceIndicatorProps {
  isActive: boolean
  partialTranscript: string
}

export function VoiceIndicator({ isActive, partialTranscript }: VoiceIndicatorProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isActive) {
      setVisible(true)
    } else {
      const timeout = setTimeout(() => setVisible(false), 300)
      return () => clearTimeout(timeout)
    }
  }, [isActive])

  if (!visible) return null

  return (
    <div className={`fixed left-1/2 -translate-x-1/2 top-32 z-50 ${!isActive ? "pointer-events-none" : ""}`}>
      <div
        className={`transition-all duration-300 ${isActive ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"}`}
      >
        {/* Main indicator card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200/80 dark:border-gray-700/80 overflow-hidden">
          {/* Top bar with recording status */}
          <div className="flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 border-b border-red-100 dark:border-red-900/30">
            {/* Mic icon with pulse ring */}
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                <Mic className="w-4 h-4 text-white" />
              </div>
              <div className="absolute inset-0 rounded-full border-2 border-red-500 animate-ping opacity-40" />
            </div>

            {/* Waveform animation */}
            <div className="flex items-center gap-[3px] h-6">
              {[...Array(7)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-gradient-to-t from-red-500 to-orange-400 rounded-full"
                  style={{
                    animation: `waveform 0.8s ease-in-out infinite`,
                    animationDelay: `${i * 0.1}s`,
                    height: "100%",
                  }}
                />
              ))}
            </div>

            <span className="text-sm font-medium text-red-600 dark:text-red-400">Recording</span>
          </div>

          {/* Transcript preview area */}
          <div className="px-4 py-3 min-w-[280px] max-w-[400px]">
            {partialTranscript ? (
              <p
                className="text-base text-gray-800 dark:text-gray-100 leading-relaxed"
                style={{
                  fontFamily: 'var(--font-battambang), "Noto Sans Khmer", sans-serif',
                }}
              >
                {partialTranscript}
                <span className="inline-block w-0.5 h-4 bg-red-500 ml-1 animate-pulse align-middle" />
              </p>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500 italic">Listening for speech...</p>
            )}
          </div>
        </div>

        {/* Subtle hint */}
        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-2">Click mic button to stop</p>
      </div>

      <style jsx>{`
        @keyframes waveform {
          0%, 100% { transform: scaleY(0.25); }
          50% { transform: scaleY(1); }
        }
      `}</style>
    </div>
  )
}
