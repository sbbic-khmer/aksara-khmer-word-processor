import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import KhmerEditor from "@/components/khmer-editor"

export default async function EditorPage() {
  const user = await getCurrentUser()

  // The dev bypass is now controlled by ALLOW_DEV_AUTH_BYPASS env var in getCurrentUser
  if (!user) {
    redirect("/login")
  }

  return <KhmerEditor />
}
