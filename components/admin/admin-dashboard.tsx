"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MasterReplacementsTab } from "./master-replacements-tab"
import { UserReplacementsTab } from "./user-replacements-tab"
import { UserDictionaryWordsTab } from "./user-dictionary-words-tab"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("master")

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Editor
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Admin Dashboard</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Manage word replacements</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="master">Master Replacements</TabsTrigger>
            <TabsTrigger value="user">User Submissions</TabsTrigger>
            <TabsTrigger value="dictionary">User Dictionary Words</TabsTrigger>
          </TabsList>

          <TabsContent value="master">
            <MasterReplacementsTab />
          </TabsContent>

          <TabsContent value="user">
            <UserReplacementsTab />
          </TabsContent>

          <TabsContent value="dictionary">
            <UserDictionaryWordsTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
