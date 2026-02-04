import { redirect } from "next/navigation"
import { isAdmin } from "@/lib/auth-server"
import { EmailComposer } from "@/components/admin/email-composer"

export default async function ComposeEmailPage() {
  const admin = await isAdmin()

  if (!admin) {
    redirect("/")
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="p-4 lg:p-6 max-w-5xl mx-auto">
        <EmailComposer />
      </main>
    </div>
  )
}
