import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { KhmerLexicalEditor } from "@/components/lexical/khmer-lexical-editor"

export default async function EditorPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  return <KhmerLexicalEditor />
}
