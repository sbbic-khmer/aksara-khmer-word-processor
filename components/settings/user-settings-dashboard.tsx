"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserReplacementsManager } from "./user-replacements-manager"
import { UserDictionaryManager } from "./user-dictionary-manager"
import { IgnoredDictionaryWordsManager } from "./ignored-dictionary-words-manager"
import { SpellCheckCustomWordsManager } from "./spell-check-custom-words-manager"
import { StorageUsage } from "./storage-usage"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export function UserSettingsDashboard() {
  const [activeTab, setActiveTab] = useState("dictionary")

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/editor">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Editor
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Settings</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Manage your personal preferences</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Storage Usage */}
        <div className="mb-6">
          <StorageUsage />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="dictionary">My Word Breaking Dictionary</TabsTrigger>
            <TabsTrigger value="spell-check">My Spell Check Dictionary</TabsTrigger>
            <TabsTrigger value="replacements">My Voice-to-Text Replacements</TabsTrigger>
          </TabsList>

          <TabsContent value="dictionary">
            <div className="space-y-6">
              <UserDictionaryManager />
              <IgnoredDictionaryWordsManager />
            </div>
          </TabsContent>

          <TabsContent value="spell-check">
            <SpellCheckCustomWordsManager />
          </TabsContent>

          <TabsContent value="replacements">
            <UserReplacementsManager />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
