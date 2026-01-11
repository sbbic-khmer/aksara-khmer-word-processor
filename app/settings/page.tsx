import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { UserSettingsDashboard } from "@/components/settings/user-settings-dashboard"

export default async function SettingsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  return <UserSettingsDashboard />
}
