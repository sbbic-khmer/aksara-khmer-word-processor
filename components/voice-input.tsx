"use client"

import { useState, useCallback, useEffect, useRef, useImperativeHandle, forwardRef } from "react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { Mic, MicOff, Loader2 } from "lucide-react"
import { useScribe } from "@elevenlabs/react"
import { MicSelector, type SttProvider } from "@/components/mic-selector"
import { usePreferences } from "@/hooks/use-preferences"
import { useWebSpeechRecognition } from "@/hooks/use-web-speech-recognition"
import { applyVoiceTextRules } from "@/lib/voice-text-rules"
import { useAuth } from "@/components/auth-provider"
import { useTranslations } from "next-intl"

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
  const t = useTranslations("editor")
  const { isDev, isAdmin } = useAuth()
  const canUseElevenLabs = isDev || isAdmin

  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isWaitingForFinal, setIsWaitingForFinal] = useState(false)
  const isDisconnectingRef = useRef(false)
  const lastPartialRef = useRef<string>("")
  const waitingForCommitRef = useRef(false)
  const onCommitReceivedRef = useRef<((text: string) => void) | null>(null)
  const commitTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const { preferences, updatePreference, isLoading: prefsLoading } = usePreferences()

  const [selectedMicId, setSelectedMicId] = useState<string | null>(null)
  const [vadSilenceThreshold, setVadSilenceThreshold] = useState<number>(DEFAULT_VAD_SILENCE)
  const [vadSensitivity, setVadSensitivity] = useState<number>(DEFAULT_VAD_SENSITIVITY)
  const [sttProvider, setSttProvider] = useState<SttProvider>("browser")
  const [prefsInitialized, setPrefsInitialized] = useState(false)

  useEffect(() => {
    if (!prefsLoading && preferences) {
      setSelectedMicId(preferences.preferred_mic_device_id)
      setVadSilenceThreshold(Number(preferences.vad_silence_threshold) || DEFAULT_VAD_SILENCE)
      setVadSensitivity(Number(preferences.vad_threshold) || DEFAULT_VAD_SENSITIVITY)
      if (preferences.stt_provider) {
        const savedProvider = preferences.stt_provider as SttProvider
        if (savedProvider === "elevenlabs" && !canUseElevenLabs) {
          setSttProvider("browser")
        } else {
          setSttProvider(savedProvider)
        }
      } else {
        setSttProvider(canUseElevenLabs ? "elevenlabs" : "browser")
      }
      setPrefsInitialized(true)
    }
  }, [preferences, prefsLoading, canUseElevenLabs])

  const handleMicChange = useCallback(
    (deviceId: string | null) => {
      setSelectedMicId(deviceId)
      if (prefsInitialized) {
        updatePreference("preferred_mic_device_id", deviceId)
      }
    },
    [updatePreference, prefsInitialized],
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

      let processed = applyVoiceTextRules(text)

      if (applyReplacements) {
        processed = applyReplacements(processed)
      }

      return processed
    },
    [applyReplacements],
  )

  const cleanupWaitingState = useCallback(() => {
    waitingForCommitRef.current = false
    onCommitReceivedRef.current = null
    setIsWaitingForFinal(false)
    if (commitTimeoutRef.current) {
      clearTimeout(commitTimeoutRef.current)
      commitTimeoutRef.current = null
    }
  }, [])

  const webSpeech = useWebSpeechRecognition({
    lang: "km-KH",
    onPartialTranscript: useCallback(
      (text: string) => {
        if (isDisconnectingRef.current) return
        lastPartialRef.current = text
        onPartialTranscript?.(processTranscript(text))
      },
      [onPartialTranscript, processTranscript],
    ),
    onCommittedTranscript: useCallback(
      (text: string) => {
        if (isDisconnectingRef.current && !waitingForCommitRef.current) return

        if (waitingForCommitRef.current && onCommitReceivedRef.current) {
          onCommitReceivedRef.current(text)
          cleanupWaitingState()
          return
        }

        if (text.trim()) {
          onTranscript(processTranscript(text))
          lastPartialRef.current = ""
        }
      },
      [onTranscript, processTranscript, cleanupWaitingState],
    ),
    onError: useCallback(
      (err: string) => {
        cleanupWaitingState()
        setError(err)
        setTimeout(() => setError(null), 3000)
      },
      [cleanupWaitingState],
    ),
  })

  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    languageCode: "km",
    commitStrategy: "vad",
    vadSilenceThresholdSecs: vadSilenceThreshold,
    vadThreshold: vadSensitivity,
    onConnect: () => {
      isDisconnectingRef.current = false
      lastPartialRef.current = ""
    },
    onPartialTranscript: (data) => {
      if (isDisconnectingRef.current) return
      lastPartialRef.current = data.text
      onPartialTranscript?.(processTranscript(data.text))
    },
    onCommittedTranscript: (data) => {
      if (waitingForCommitRef.current && onCommitReceivedRef.current) {
        onCommitReceivedRef.current(data.text)
        cleanupWaitingState()
        scribe.disconnect()
        return
      }

      if (isDisconnectingRef.current) return

      if (data.text.trim()) {
        onTranscript(processTranscript(data.text))
        lastPartialRef.current = ""
      }
    },
    onError: (err) => {
      const errorMessage = err instanceof Error ? err.message : String(err)
      console.error("[v0] Scribe error:", errorMessage)

      cleanupWaitingState()

      if (errorMessage.includes("capacity")) {
        setError(t("errors.serviceBusy"))
      } else if (errorMessage.includes("WebSocket")) {
        if (isDisconnectingRef.current) return
        setError(t("errors.connectionLost"))
      } else {
        setError(t("errors.voiceError"))
      }

      onVoiceStateChange?.(false)
      setTimeout(() => setError(null), 3000)
    },
    onDisconnect: () => {
      isDisconnectingRef.current = true
      cleanupWaitingState()
      onVoiceStateChange?.(false)
    },
  })

  const isActive = sttProvider === "elevenlabs" ? scribe.isConnected : webSpeech.listening

  useEffect(() => {
    onVoiceStateChange?.(isActive)
  }, [isActive, onVoiceStateChange])

  const handleToggle = useCallback(async () => {
    if (sttProvider === "browser") {
      if (webSpeech.listening) {
        if (lastPartialRef.current.trim()) {
          setIsWaitingForFinal(true)
          waitingForCommitRef.current = true

          onCommitReceivedRef.current = (text: string) => {
            if (text.trim()) {
              onTranscript(processTranscript(text))
            }
            lastPartialRef.current = ""
          }

          commitTimeoutRef.current = setTimeout(() => {
            if (lastPartialRef.current.trim()) {
              onTranscript(processTranscript(lastPartialRef.current))
              lastPartialRef.current = ""
            }
            cleanupWaitingState()
            webSpeech.stop()
          }, 5000)

          webSpeech.stop()
        } else {
          isDisconnectingRef.current = true
          webSpeech.stop()
        }
        return
      }

      isDisconnectingRef.current = false
      setError(null)
      webSpeech.start()
      return
    }

    if (scribe.isConnected) {
      if (lastPartialRef.current.trim()) {
        setIsWaitingForFinal(true)
        waitingForCommitRef.current = true

        onCommitReceivedRef.current = (text: string) => {
          if (text.trim()) {
            onTranscript(processTranscript(text))
          }
          lastPartialRef.current = ""
        }

        commitTimeoutRef.current = setTimeout(() => {
          if (lastPartialRef.current.trim()) {
            onTranscript(processTranscript(lastPartialRef.current))
            lastPartialRef.current = ""
          }
          cleanupWaitingState()
          isDisconnectingRef.current = true
          scribe.disconnect()
        }, 5000)

        return
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

      await scribe.connect({
        token,
        microphone: {
          deviceId: selectedMicId || undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
    } catch (err) {
      console.error("[v0] Connection error:", err)
      const errorMessage = err instanceof Error ? err.message : t("errors.failedToStart")

      if (errorMessage.includes("capacity")) {
        setError(t("errors.serviceBusy"))
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
    cleanupWaitingState,
  ])

  const showLoader = isConnecting || isWaitingForFinal

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
        if (!disabled && !isConnecting && !isWaitingForFinal) {
          handleToggle()
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleToggle, disabled, isConnecting, isWaitingForFinal])

  useEffect(() => {
    return () => {
      if (commitTimeoutRef.current) {
        clearTimeout(commitTimeoutRef.current)
      }
    }
  }, [])

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
          showElevenLabs={canUseElevenLabs}
          isLoadingPreferences={prefsLoading}
        />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isActive || isWaitingForFinal ? "default" : "outline"}
              size="sm"
              onClick={handleToggle}
              disabled={disabled || showLoader}
              className={`gap-1.5 text-xs sm:text-sm h-8 sm:h-9 transition-all ${
                isActive
                  ? "bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-500/25"
                  : isWaitingForFinal
                    ? "bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/25"
                    : "bg-transparent"
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
              <span className="hidden xs:inline">
                {isWaitingForFinal ? t("voice.processing") : isActive ? t("voice.stop") : t("voice.button")}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isWaitingForFinal
              ? t("voice.finishingTooltip")
              : isActive
                ? t("voice.stopTooltip")
                : t("voice.startTooltip")}
          </TooltipContent>
        </Tooltip>

        {error && <span className="text-xs text-red-500 truncate max-w-[150px] sm:max-w-[200px]">{error}</span>}
      </div>
    </TooltipProvider>
  )
})
