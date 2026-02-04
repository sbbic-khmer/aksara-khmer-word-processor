import { redirect } from "next/navigation"
import { isAdmin } from "@/lib/auth-server"
import { EmailCampaignList } from "@/components/admin/email-campaign-list"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default async function AdminEmailPage() {
  const admin = await isAdmin()

  if (!admin) {
    redirect("/")
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to Admin</span>
              </Button>
            </Link>
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Email Campaigns</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Create and send emails to your users
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="p-4 lg:p-6 max-w-5xl mx-auto">
        <EmailCampaignList />
      </main>
    </div>
  )
}
