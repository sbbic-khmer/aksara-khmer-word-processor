"use client"

import { useState, useCallback, useEffect, useRef, useImperativeHandle, forwardRef } from "react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { Mic, MicOff, Loader2 } from "lucide-react"
import { useScribe } from "@elevenlabs/react"
import { MicSelector, type SttProvider } from "@/components/mic-selector"
import { usePreferences } from "@/hooks/use-preferences"
import { useWebSpeechRecognition } from "@/hooks/use-web-speech-recognition"

interface VoiceInputProps {
  onTranscript: (text: string) => void
  onPartialTranscript?: (text: string) => void
  onVoiceStateChange?: (active: boolean) => void
  disabled?: boolean
  applyReplacements?: (text: string) => string
}

export interface VoiceInputHandle {
  toggle: () => void
  isActive: boolean
}

const DEFAULT_VAD_SILENCE = 1.0
const DEFAULT_VAD_SENSITIVITY = 0.4

export const VoiceInput = forwardRef<VoiceInputHandle, VoiceInputProps>(function VoiceInput(
  { onTranscript, onPartialTranscript, onVoiceStateChange, disabled, applyReplacements },
  ref,
) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isDisconnectingRef = useRef(false)
  const lastPartialRef = useRef<string>("")

  const { preferences, updatePreference, isLoading: prefsLoading } = usePreferences()

  const [selectedMicId, setSelectedMicId] = useState<string | null>(null)
  const [vadSilenceThreshold, setVadSilenceThreshold] = useState<number>(DEFAULT_VAD_SILENCE)
  const [vadSensitivity, setVadSensitivity] = useState<number>(DEFAULT_VAD_SENSITIVITY)
  const [sttProvider, setSttProvider] = useState<SttProvider>("elevenlabs")

  useEffect(() => {
    if (!prefsLoading && preferences) {
      setSelectedMicId(preferences.preferred_mic_device_id)
      setVadSilenceThreshold(Number(preferences.vad_silence_threshold) || DEFAULT_VAD_SILENCE)
      setVadSensitivity(Number(preferences.vad_threshold) || DEFAULT_VAD_SENSITIVITY)
      if (preferences.stt_provider) {
        setSttProvider(preferences.stt_provider as SttProvider)
      }
    }
  }, [preferences, prefsLoading])

  const handleMicChange = useCallback(
    (deviceId: string | null) => {
      setSelectedMicId(deviceId)
      updatePreference("preferred_mic_device_id", deviceId)
    },
    [updatePreference],
  )

  const handleVadSilenceChange = useCallback(
    (value: number) => {
      setVadSilenceThreshold(value)
      updatePreference("vad_silence_threshold", value)
    },
    [updatePreference],
  )

  const handleVadSensitivityChange = useCallback(
    (value: number) => {
      setVadSensitivity(value)
      updatePreference("vad_threshold", value)
    },
    [updatePreference],
  )

  const handleSttProviderChange = useCallback(
    (provider: SttProvider) => {
      setSttProvider(provider)
      updatePreference("stt_provider", provider)
    },
    [updatePreference],
  )

  const processTranscript = useCallback(
    (text: string): string => {
      if (!text.trim()) return text
      if (applyReplacements) {
        const processed = applyReplacements(text)
        if (processed !== text) {
          console.log("[v0] Applied replacements:", text, "->", processed)
        }
        return processed
      }
      return text
    },
    [applyReplacements],
  )

  const webSpeech = useWebSpeechRecognition({
    lang: "km-KH",
    onPartialTranscript: useCallback(
      (text: string) => {
        if (isDisconnectingRef.current) return
        console.log("[v0] WebSpeech partial:", text)
        lastPartialRef.current = text
        onPartialTranscript?.(processTranscript(text))
      },
      [onPartialTranscript, processTranscript],
    ),
    onCommittedTranscript: useCallback(
      (text: string) => {
        if (isDisconnectingRef.current) return
        console.log("[v0] WebSpeech COMMITTED:", text)
        if (text.trim()) {
          onTranscript(processTranscript(text))
          lastPartialRef.current = ""
        }
      },
      [onTranscript, processTranscript],
    ),
    onError: useCallback((err: string) => {
      setError(err)
      setTimeout(() => setError(null), 3000)
    }, []),
  })

  // ElevenLabs Scribe hook
  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    languageCode: "km",
    commitStrategy: "vad",
    vadSilenceThresholdSecs: vadSilenceThreshold,
    vadThreshold: vadSensitivity,
    onConnect: () => {
      console.log("[v0] Scribe WebSocket connected")
      isDisconnectingRef.current = false
      lastPartialRef.current = ""
    },
    onPartialTranscript: (data) => {
      if (isDisconnectingRef.current) return
      console.log("[v0] Partial transcript:", data.text)
      lastPartialRef.current = data.text
      onPartialTranscript?.(processTranscript(data.text))
    },
    onCommittedTranscript: (data) => {
      if (isDisconnectingRef.current) return
      console.log("[v0] COMMITTED transcript:", data.text)
      if (data.text.trim()) {
        onTranscript(processTranscript(data.text))
        lastPartialRef.current = ""
      }
    },
    onError: (err) => {
      const errorMessage = err instanceof Error ? err.message : String(err)
      console.error("[v0] Scribe error:", errorMessage)

      if (errorMessage.includes("capacity")) {
        setError("Service busy. Please try again in a moment.")
      } else if (errorMessage.includes("WebSocket")) {
        if (isDisconnectingRef.current) return
        setError("Connection lost. Please try again.")
      } else {
        setError("Voice error. Please try again.")
      }

      onVoiceStateChange?.(false)
      setTimeout(() => setError(null), 3000)
    },
    onDisconnect: () => {
      console.log("[v0] Scribe disconnected")
      isDisconnectingRef.current = true
      onVoiceStateChange?.(false)
    },
  })

  const isActive = sttProvider === "elevenlabs" ? scribe.isConnected : webSpeech.listening

  useEffect(() => {
    onVoiceStateChange?.(isActive)
  }, [isActive, onVoiceStateChange])

  const handleToggle = useCallback(async () => {
    if (sttProvider === "browser") {
      // Web Speech toggle
      if (webSpeech.listening) {
        if (lastPartialRef.current.trim()) {
          console.log("[v0] Inserting last partial on manual stop:", lastPartialRef.current)
          onTranscript(processTranscript(lastPartialRef.current))
          lastPartialRef.current = ""
        }
        isDisconnectingRef.current = true
        webSpeech.stop()
        return
      }

      isDisconnectingRef.current = false
      setError(null)
      webSpeech.start()
      return
    }

    // ElevenLabs toggle (existing logic)
    if (scribe.isConnected) {
      if (lastPartialRef.current.trim()) {
        console.log("[v0] Inserting last partial on manual stop:", lastPartialRef.current)
        onTranscript(processTranscript(lastPartialRef.current))
        lastPartialRef.current = ""
      }
      isDisconnectingRef.current = true
      scribe.disconnect()
      return
    }

    setIsConnecting(true)
    setError(null)
    isDisconnectingRef.current = false

    try {
      const response = await fetch("/api/scribe-token")
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to get token")
      }

      const { token } = await response.json()
      console.log(
        "[v0] Got token, connecting to Scribe with VAD (silence:",
        vadSilenceThreshold,
        "sensitivity:",
        vadSensitivity,
        ")...",
      )

      await scribe.connect({
        token,
        microphone: {
          deviceId: selectedMicId || undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      console.log("[v0] Scribe connected successfully with VAD commit strategy")
    } catch (err) {
      console.error("[v0] Connection error:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to start voice input"

      if (errorMessage.includes("capacity")) {
        setError("Service busy. Please try again.")
      } else {
        setError(errorMessage)
      }

      setTimeout(() => setError(null), 3000)
    } finally {
      setIsConnecting(false)
    }
  }, [
    sttProvider,
    scribe,
    webSpeech,
    selectedMicId,
    onTranscript,
    vadSilenceThreshold,
    vadSensitivity,
    processTranscript,
  ])

  const showLoader = isConnecting

  useImperativeHandle(
    ref,
    () => ({
      toggle: handleToggle,
      isActive,
    }),
    [handleToggle, isActive],
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === "m") {
        e.preventDefault()
        if (!disabled && !isConnecting) {
          handleToggle()
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleToggle, disabled, isConnecting])

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        <MicSelector
          selectedDeviceId={selectedMicId}
          onDeviceChange={handleMicChange}
          vadSilenceThreshold={vadSilenceThreshold ?? DEFAULT_VAD_SILENCE}
          onVadSilenceThresholdChange={handleVadSilenceChange}
          vadSensitivity={vadSensitivity ?? DEFAULT_VAD_SENSITIVITY}
          onVadSensitivityChange={handleVadSensitivityChange}
          sttProvider={sttProvider}
          onSttProviderChange={handleSttProviderChange}
          webSpeechSupported={webSpeech.supported ?? false}
        />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={handleToggle}
              disabled={disabled || showLoader}
              className={`gap-1.5 text-xs sm:text-sm h-8 sm:h-9 transition-all ${
                isActive ? "bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-500/25" : "bg-transparent"
              }`}
            >
              {showLoader ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : isActive ? (
                <>
                  <span className="relative flex h-2 w-2 mr-0.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                  </span>
                  <MicOff className="h-3.5 w-3.5" />
                </>
              ) : (
                <Mic className="h-3.5 w-3.5" />
              )}
              <span className="hidden xs:inline">{isActive ? "Stop" : "Voice"}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isActive ? "Stop voice input (Ctrl+M)" : "Start voice input (Ctrl+M)"}</TooltipContent>
        </Tooltip>

        {error && <span className="text-xs text-red-500 truncate max-w-[150px] sm:max-w-[200px]">{error}</span>}
      </div>
    </TooltipProvider>
  )
})
