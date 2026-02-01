"use client"

import { useState, useEffect, useCallback } from "react"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface User {
  id: string
  email: string
  name: string | null
  role: string
  show_ads: boolean
  created_at: string
}

export function UserAdControlTab() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingUsers, setUpdatingUsers] = useState<Set<string>>(new Set())

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch("/api/admin/users")
      if (!response.ok) {
        throw new Error("Failed to fetch users")
      }
      const data = await response.json()
      setUsers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch users")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const toggleUserAds = async (userId: string, showAds: boolean) => {
    setUpdatingUsers((prev) => new Set(prev).add(userId))

    try {
      const response = await fetch(`/api/admin/users/${userId}/ads`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showAds }),
      })

      if (!response.ok) {
        throw new Error("Failed to update user")
      }

      // Update local state
      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId ? { ...user, show_ads: showAds } : user
        )
      )
    } catch (err) {
      console.error("Error updating user ads:", err)
      // Revert on error - refetch to get accurate state
      fetchUsers()
    } finally {
      setUpdatingUsers((prev) => {
        const next = new Set(prev)
        next.delete(userId)
        return next
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">{error}</p>
        <Button variant="outline" onClick={fetchUsers}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            User Ad Settings
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Enable or disable ads for individual users
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchUsers}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                User
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Role
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Show Ads
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                <td className="px-4 py-3">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {user.name || "No name"}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {user.email}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant={user.role === "admin" ? "default" : "secondary"}
                  >
                    {user.role}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {updatingUsers.has(user.id) && (
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    )}
                    <Switch
                      checked={user.show_ads ?? true}
                      onCheckedChange={(checked) => toggleUserAds(user.id, checked)}
                      disabled={updatingUsers.has(user.id)}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No users found
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        {users.filter((u) => u.show_ads !== false).length} of {users.length} users have ads enabled
      </p>
    </div>
  )
}
