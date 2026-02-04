import { redirect } from "next/navigation"
import { isAdmin } from "@/lib/auth-server"
import { EmailComposer } from "@/components/admin/email-composer"

interface EditCampaignPageProps {
  params: Promise<{ id: string }>
}

export default async function EditCampaignPage({ params }: EditCampaignPageProps) {
  const admin = await isAdmin()

  if (!admin) {
    redirect("/")
  }

  const { id } = await params

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="p-4 lg:p-6 max-w-5xl mx-auto">
        <EmailComposer campaignId={id} />
      </main>
    </div>
  )
}
