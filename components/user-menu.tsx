"use client"

import type React from "react"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { User, LogOut, Settings, Shield, Camera, Loader2, Key } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/components/auth-provider"
import { authClient } from "@/lib/auth-client"

export function UserMenu() {
  const router = useRouter()
  const { user, isLoading, logout, isAdmin } = useAuth()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isPasswordOpen, setIsPasswordOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const [editName, setEditName] = useState(user?.name || "")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleLogout = async () => {
    try {
      await logout()
      router.push("/")
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  const handleProfilePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file")
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      alert("Image must be smaller than 2MB")
      return
    }

    setIsUploading(true)

    try {
      const reader = new FileReader()
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string

        const result = await authClient.updateUser({
          image: dataUrl,
        })

        if (result.error) {
          alert("Failed to upload profile picture")
        }
        setIsUploading(false)
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error("Upload failed:", error)
      alert("Failed to upload profile picture")
      setIsUploading(false)
    }
  }

  const handleSaveProfile = async () => {
    try {
      const result = await authClient.updateUser({
        name: editName,
      })

      if (result.error) {
        alert("Failed to update profile")
      } else {
        setIsProfileOpen(false)
      }
    } catch (error) {
      console.error("Profile update failed:", error)
      alert("Failed to update profile")
    }
  }

  const handleChangePassword = async () => {
    setPasswordError("")

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All fields are required")
      return
    }

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters")
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match")
      return
    }

    setIsSavingPassword(true)

    try {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
      })

      if (result.error) {
        setPasswordError(result.error.message || "Failed to change password")
      } else {
        setIsPasswordOpen(false)
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
        alert("Password changed successfully")
      }
    } catch (error) {
      console.error("Password change failed:", error)
      setPasswordError("Failed to change password")
    } finally {
      setIsSavingPassword(false)
    }
  }

  if (isLoading) {
    return <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
  }

  if (!user) {
    return (
      <Button variant="ghost" size="sm" onClick={() => router.push("/login")}>
        Sign in
      </Button>
    )
  }

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email[0].toUpperCase()

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-10 w-10 rounded-full p-0">
            <Avatar className="h-10 w-10">
              {user?.image && (
                <AvatarImage src={user?.image || "/placeholder.svg"} alt={user.name || "User"} />
              )}
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-medium">{initials}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-3 py-2">
            <p className="text-sm font-medium text-foreground">{user.name || "User"}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="cursor-pointer" onClick={() => setIsProfileOpen(true)}>
            <User className="h-4 w-4 mr-2" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer" onClick={() => setIsPasswordOpen(true)}>
            <Key className="h-4 w-4 mr-2" />
            Change Password
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer" onClick={() => router.push("/settings")}>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </DropdownMenuItem>
          {isAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer" onClick={() => router.push("/admin")}>
                <Shield className="h-4 w-4 mr-2" />
                Admin Panel
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="cursor-pointer text-red-600 dark:text-red-400" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>Update your profile information</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  {user?.image && (
                    <AvatarImage src={user?.image || "/placeholder.svg"} alt={user.name || "User"} />
                  )}
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleProfilePictureUpload}
                />
              </div>
              <p className="text-xs text-muted-foreground">Click the camera icon to upload a photo</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter your name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user.email} disabled className="bg-muted" />
            </div>

            <Button onClick={handleSaveProfile} className="w-full">
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isPasswordOpen}
        onOpenChange={(open) => {
          setIsPasswordOpen(open)
          if (!open) {
            setCurrentPassword("")
            setNewPassword("")
            setConfirmPassword("")
            setPasswordError("")
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>Enter your current password and choose a new one</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {passwordError && (
              <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/50 dark:text-red-400 rounded-md">
                {passwordError}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 8 characters)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>

            <Button onClick={handleChangePassword} className="w-full" disabled={isSavingPassword}>
              {isSavingPassword ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Changing Password...
                </>
              ) : (
                "Change Password"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
