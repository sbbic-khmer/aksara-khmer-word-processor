"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Plus, Trash2, Save, RefreshCw, GripVertical } from "lucide-react"

export function AdFrequencyTab() {
  const [schedule, setSchedule] = useState<number[]>([2, 5, 10, 15])
  const [originalSchedule, setOriginalSchedule] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const hasChanges = useMemo(() => {
    return JSON.stringify(schedule) !== JSON.stringify(originalSchedule)
  }, [schedule, originalSchedule])

  const fetchSchedule = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch("/api/admin/settings/ad-frequency")
      if (!response.ok) {
        throw new Error("Failed to fetch schedule")
      }
      const data = await response.json()
      const fetchedSchedule = data.schedule || [2, 5, 10, 15]
      setSchedule(fetchedSchedule)
      setOriginalSchedule(fetchedSchedule)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch schedule")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSchedule()
  }, [fetchSchedule])

  // Calculate preview times
  const previewTimes = useMemo(() => {
    if (schedule.length === 0) return []
    const times: number[] = []
    let cumulative = 0
    // Show first 6 ad times
    for (let i = 0; i < 6; i++) {
      const index = Math.min(i, schedule.length - 1)
      cumulative += schedule[index]
      times.push(cumulative)
    }
    return times
  }, [schedule])

  const updateInterval = (index: number, value: number) => {
    setSchedule((prev) => {
      const next = [...prev]
      next[index] = Math.max(1, value)
      return next
    })
    setSaveSuccess(false)
  }

  const addInterval = () => {
    setSchedule((prev) => [...prev, prev[prev.length - 1] || 5])
    setSaveSuccess(false)
  }

  const removeInterval = (index: number) => {
    if (schedule.length <= 1) return // Keep at least one interval
    setSchedule((prev) => prev.filter((_, i) => i !== index))
    setSaveSuccess(false)
  }

  const saveSchedule = async () => {
    // Validate
    if (schedule.length === 0) {
      setError("At least one interval is required")
      return
    }
    if (schedule.some((v) => v < 1)) {
      setError("All intervals must be at least 1 minute")
      return
    }

    try {
      setSaving(true)
      setError(null)
      setSaveSuccess(false)

      const response = await fetch("/api/admin/settings/ad-frequency", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedule }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to save schedule")
      }

      setOriginalSchedule([...schedule])
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save schedule")
    } finally {
      setSaving(false)
    }
  }

  const resetChanges = () => {
    setSchedule([...originalSchedule])
    setError(null)
    setSaveSuccess(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Mobile Ad Frequency
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Configure how often ads appear on mobile devices
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {saveSuccess && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-green-700 dark:text-green-400 text-sm">
          Schedule saved successfully
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        <div className="space-y-3">
          {schedule.map((interval, index) => (
            <div key={index} className="flex items-center gap-3">
              <GripVertical className="h-4 w-4 text-gray-400 cursor-grab" />
              <span className="text-sm text-gray-500 dark:text-gray-400 w-16">
                Ad {index + 1}:
              </span>
              <Input
                type="number"
                min={1}
                value={interval}
                onChange={(e) => updateInterval(index, parseInt(e.target.value) || 1)}
                className="w-20"
              />
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {index === 0 ? "minutes after session start" : "minutes after previous ad"}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeInterval(index)}
                disabled={schedule.length <= 1}
                className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <Button variant="outline" size="sm" onClick={addInterval}>
          <Plus className="h-4 w-4 mr-2" />
          Add Interval
        </Button>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          After ad {schedule.length}, the last interval ({schedule[schedule.length - 1]} min) repeats
        </p>
      </div>

      {/* Preview */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4">
        <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-2">
          Preview
        </h3>
        <p className="text-sm text-blue-800 dark:text-blue-400">
          Ads will appear at:{" "}
          <span className="font-mono">
            {previewTimes.map((t) => `${t}min`).join(", ")}...
          </span>
        </p>
        <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">
          Then repeating every {schedule[schedule.length - 1]} minutes
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button onClick={saveSchedule} disabled={saving || !hasChanges}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </Button>
        {hasChanges && (
          <Button variant="outline" onClick={resetChanges}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        )}
      </div>
    </div>
  )
}
