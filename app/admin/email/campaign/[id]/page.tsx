import { redirect } from "next/navigation"
import { isAdmin } from "@/lib/auth-server"
import { EmailCampaignDetail } from "@/components/admin/email-campaign-detail"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

interface CampaignDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function CampaignDetailPage({ params }: CampaignDetailPageProps) {
  const admin = await isAdmin()

  if (!admin) {
    redirect("/")
  }

  const { id } = await params

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="p-4 lg:p-6 max-w-5xl mx-auto">
        <EmailCampaignDetail campaignId={id} />
      </main>
    </div>
  )
}
