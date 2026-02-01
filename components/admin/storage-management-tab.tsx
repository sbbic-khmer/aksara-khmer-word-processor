"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"

interface UserStorage {
  id: string
  email: string
  name: string | null
  storage_used: number
  storage_limit_bytes: number
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function StorageManagementTab() {
  const [users, setUsers] = useState<UserStorage[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [defaultLimit, setDefaultLimit] = useState(5)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadUsers()
    loadDefaultLimit()
  }, [])

  const loadUsers = async () => {
    try {
      const res = await fetch("/api/admin/users?includeStorage=true")
      const data = await res.json()
      setUsers(data.users || [])
    } catch (error) {
      console.error("Failed to load users:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadDefaultLimit = async () => {
    try {
      const res = await fetch("/api/admin/settings/storage")
      const data = await res.json()
      setDefaultLimit(data.defaultLimitMB || 5)
    } catch (error) {
      console.error("Failed to load default limit:", error)
    }
  }

  const updateUserLimit = async (userId: string, limitMB: number) => {
    setSaving(true)
    try {
      await fetch(`/api/admin/users/${userId}/storage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storageLimitBytes: limitMB * 1024 * 1024 }),
      })
      setEditingId(null)
      loadUsers()
    } catch (error) {
      console.error("Failed to update user limit:", error)
    } finally {
      setSaving(false)
    }
  }

  const updateDefaultLimit = async () => {
    setSaving(true)
    try {
      await fetch("/api/admin/settings/storage", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultLimitMB: defaultLimit }),
      })
    } catch (error) {
      console.error("Failed to update default limit:", error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Global Default Setting */}
      <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
        <h3 className="font-medium mb-2">Default Storage Limit</h3>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={defaultLimit}
            onChange={(e) => setDefaultLimit(Number(e.target.value))}
            className="w-24"
            min={1}
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">MB</span>
          <Button onClick={updateDefaultLimit} size="sm" disabled={saving}>
            {saving ? "Saving..." : "Save Default"}
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Applied to new users. Existing users keep their current limits.
        </p>
      </div>

      {/* User List */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium">User</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Usage</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Limit</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {users.map((user) => {
              const percentage = Math.min(
                100,
                Math.round((Number(user.storage_used) / Number(user.storage_limit_bytes)) * 100)
              )
              const isWarning = percentage >= 80

              return (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium">{user.email}</div>
                    {user.name && (
                      <div className="text-xs text-gray-500">{user.name}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Progress
                        value={percentage}
                        className={`w-20 h-2 ${isWarning ? "[&>div]:bg-orange-500" : ""}`}
                      />
                      <span className={`text-sm ${isWarning ? "text-orange-600 font-medium" : ""}`}>
                        {formatBytes(Number(user.storage_used))}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {editingId === user.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-20 h-8"
                          min={1}
                        />
                        <span className="text-sm">MB</span>
                      </div>
                    ) : (
                      <span className="text-sm">
                        {formatBytes(Number(user.storage_limit_bytes))}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === user.id ? (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          onClick={() => updateUserLimit(user.id, Number(editValue))}
                          disabled={saving}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingId(user.id)
                          setEditValue(
                            String(Math.round(Number(user.storage_limit_bytes) / (1024 * 1024)))
                          )
                        }}
                      >
                        Edit
                      </Button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
