import { redirect } from "next/navigation"
import { isAdmin } from "@/lib/auth-server"
import { EmailSendForm } from "@/components/admin/email-send-form"

interface SendCampaignPageProps {
  params: Promise<{ id: string }>
}

export default async function SendCampaignPage({ params }: SendCampaignPageProps) {
  const admin = await isAdmin()

  if (!admin) {
    redirect("/")
  }

  const { id } = await params

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="p-4 lg:p-6 max-w-3xl mx-auto">
        <EmailSendForm campaignId={id} />
      </main>
    </div>
  )
}
