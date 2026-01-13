"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { Settings2, Mic, AlertCircle, RefreshCw, Globe, Zap } from "lucide-react"
import { Slider } from "@/components/ui/slider"

export type SttProvider = "elevenlabs" | "browser"

interface AudioDevice {
  deviceId: string
  label: string
}

interface MicSelectorProps {
  selectedDeviceId: string | null
  onDeviceChange: (deviceId: string | null) => void
  vadSilenceThreshold?: number
  onVadSilenceThresholdChange: (value: number) => void
  vadSensitivity?: number
  onVadSensitivityChange: (value: number) => void
  sttProvider?: SttProvider
  onSttProviderChange?: (provider: SttProvider) => void
  webSpeechSupported?: boolean
  showElevenLabs?: boolean
  isLoadingPreferences?: boolean
}

export function MicSelector({
  selectedDeviceId,
  onDeviceChange,
  vadSilenceThreshold,
  onVadSilenceThresholdChange,
  vadSensitivity,
  onVadSensitivityChange,
  sttProvider = "elevenlabs",
  onSttProviderChange,
  webSpeechSupported = false,
  showElevenLabs = true,
  isLoadingPreferences = false,
}: MicSelectorProps) {
  const safeVadSilenceThreshold = vadSilenceThreshold ?? 1.0
  const safeVadSensitivity = vadSensitivity ?? 0.4

  const [devices, setDevices] = useState<AudioDevice[]>([])
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const hasInitialized = useRef(false)

  const loadDevices = async (requestPermission = false) => {
    console.log("[v0] loadDevices called, requestPermission:", requestPermission)
    setIsLoading(true)
    setError(null)

    try {
      if (requestPermission) {
        console.log("[v0] Requesting mic permission...")
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        stream.getTracks().forEach((track) => track.stop())
        console.log("[v0] Permission granted, stream stopped")
        setHasPermission(true)
      }

      console.log("[v0] Enumerating devices...")
      const allDevices = await navigator.mediaDevices.enumerateDevices()
      console.log("[v0] All devices:", allDevices)

      const audioInputs = allDevices
        .filter((device) => device.kind === "audioinput")
        .map((device, index) => ({
          deviceId: device.deviceId,
          label: device.label || `Microphone ${index + 1}`,
        }))

      console.log("[v0] Audio inputs found:", audioInputs)
      setDevices(audioInputs)

      if (!selectedDeviceId && !isLoadingPreferences && audioInputs.length > 0) {
        const defaultDevice = audioInputs.find((d) => d.deviceId === "default") || audioInputs[0]
        console.log("[v0] Auto-selecting device:", defaultDevice)
        onDeviceChange(defaultDevice.deviceId)
      }
    } catch (err) {
      console.error("[v0] Failed to load audio devices:", err)
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setHasPermission(false)
        setError("Microphone access denied")
      } else {
        setError("Failed to access microphones")
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (hasInitialized.current) return
    hasInitialized.current = true

    const init = async () => {
      console.log("[v0] MicSelector initializing...")

      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices()
        const audioInputs = allDevices.filter((device) => device.kind === "audioinput")

        console.log("[v0] Initial enumerate result:", audioInputs)

        if (audioInputs.length > 0 && audioInputs[0].label) {
          console.log("[v0] Permission already granted, loading devices")
          setHasPermission(true)
          await loadDevices(false)
        } else {
          console.log("[v0] No labels, need permission")
          setHasPermission(false)
          setDevices(
            audioInputs.map((device, index) => ({
              deviceId: device.deviceId,
              label: `Microphone ${index + 1}`,
            })),
          )
        }
      } catch (err) {
        console.error("[v0] Initial enumerate failed:", err)
        setError("Failed to access microphones")
      }
    }

    init()
  }, [])

  useEffect(() => {
    const handleDeviceChange = () => {
      console.log("[v0] Device change detected")
      if (hasPermission) {
        loadDevices(false)
      }
    }

    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange)
    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChange)
    }
  }, [hasPermission])

  const handleRequestPermission = async () => {
    console.log("[v0] User clicked request permission")
    await loadDevices(true)
  }

  const selectedLabel = devices.find((d) => d.deviceId === selectedDeviceId)?.label || "Select mic"

  return (
    <TooltipProvider>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 sm:h-9 px-2 gap-1.5 text-xs sm:text-sm text-muted-foreground hover:text-foreground"
                title="Microphone settings"
              >
                <Settings2 className="h-3.5 w-3.5" />
                <span className="hidden lg:inline max-w-[100px] truncate">{selectedLabel}</span>
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>Voice input settings</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="start" className="w-[280px]">
          <DropdownMenuLabel className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Voice Recognition Provider
          </DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={sttProvider}
            onValueChange={(value) => onSttProviderChange?.(value as SttProvider)}
          >
            {showElevenLabs && (
              <DropdownMenuRadioItem value="elevenlabs" className="text-sm cursor-pointer">
                <div className="flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                  <div>
                    <span>ElevenLabs</span>
                    <p className="text-[10px] text-muted-foreground">High accuracy, requires internet</p>
                  </div>
                </div>
              </DropdownMenuRadioItem>
            )}
            <DropdownMenuRadioItem value="browser" className="text-sm cursor-pointer" disabled={!webSpeechSupported}>
              <div className="flex items-center gap-2">
                <Globe className="h-3.5 w-3.5 text-blue-500" />
                <div>
                  <span>Browser (Google)</span>
                  <p className="text-[10px] text-muted-foreground">
                    {webSpeechSupported ? "Free, runs in browser" : "Not supported in this browser"}
                  </p>
                </div>
              </div>
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>

          <DropdownMenuSeparator />

          <DropdownMenuLabel className="flex items-center gap-2">
            <Mic className="h-4 w-4" />
            Select Microphone
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {isLoading ? (
            <div className="px-2 py-3 text-sm text-muted-foreground flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Loading microphones...</span>
            </div>
          ) : error ? (
            <div className="px-2 py-3 text-sm text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span>{error}</span>
            </div>
          ) : devices.length === 0 ? (
            <div className="px-2 py-3 text-sm text-muted-foreground">
              No microphones detected. Click below to grant access.
            </div>
          ) : (
            <DropdownMenuRadioGroup
              value={selectedDeviceId || ""}
              onValueChange={(value) => {
                console.log("[v0] Device selected:", value)
                onDeviceChange(value || null)
              }}
            >
              {devices.map((device) => (
                <DropdownMenuRadioItem key={device.deviceId} value={device.deviceId} className="text-sm cursor-pointer">
                  <span className="truncate">{device.label}</span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          )}

          <DropdownMenuSeparator />
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-xs gap-2"
            onClick={handleRequestPermission}
            disabled={isLoading}
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
            {hasPermission ? "Refresh devices" : "Grant microphone access"}
          </Button>

          {sttProvider === "elevenlabs" && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="flex items-center gap-2 text-xs">
                <Settings2 className="h-3.5 w-3.5" />
                Voice Detection Settings
              </DropdownMenuLabel>

              <div className="px-3 py-2 space-y-4">
                {/* Silence threshold slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-muted-foreground">Pause before commit</label>
                    <span className="text-xs font-medium tabular-nums">{safeVadSilenceThreshold.toFixed(1)}s</span>
                  </div>
                  <Slider
                    value={[safeVadSilenceThreshold]}
                    onValueChange={([value]) => onVadSilenceThresholdChange(value)}
                    min={0.5}
                    max={3.0}
                    step={0.1}
                    className="w-full"
                  />
                  <p className="text-[10px] text-muted-foreground/70">
                    How long to wait after you stop speaking before committing text
                  </p>
                </div>

                {/* Sensitivity threshold slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-muted-foreground">Voice sensitivity</label>
                    <span className="text-xs font-medium tabular-nums">{Math.round(safeVadSensitivity * 100)}%</span>
                  </div>
                  <Slider
                    value={[safeVadSensitivity]}
                    onValueChange={([value]) => onVadSensitivityChange(value)}
                    min={0.1}
                    max={0.9}
                    step={0.05}
                    className="w-full"
                  />
                  <p className="text-[10px] text-muted-foreground/70">
                    Lower = more sensitive (picks up quiet speech), Higher = less sensitive (ignores background noise)
                  </p>
                </div>
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  )
}
