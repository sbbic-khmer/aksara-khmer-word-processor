import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth-server"
import { EditorWithAds } from "@/components/editor/editor-with-ads"
import { prisma } from "@/lib/prisma"

export default async function EditorPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  // Check if user's email is verified
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { emailVerified: true },
  })

  if (!dbUser?.emailVerified) {
    redirect("/verify-email")
  }

  // Enable test mode when no AdSense client ID is configured
  const testMode = !process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID

  return <EditorWithAds testMode={testMode} />
}
