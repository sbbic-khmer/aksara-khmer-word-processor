import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { EditorWithAds } from "@/components/editor/editor-with-ads"

export default async function EditorPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  // Enable test mode when no AdSense client ID is configured
  const testMode = !process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID

  return <EditorWithAds testMode={testMode} />
}
