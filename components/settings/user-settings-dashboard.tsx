"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserReplacementsManager } from "./user-replacements-manager"
import { UserDictionaryManager } from "./user-dictionary-manager"
import { IgnoredDictionaryWordsManager } from "./ignored-dictionary-words-manager"
import { SpellCheckCustomWordsManager } from "./spell-check-custom-words-manager"
import { StorageUsage } from "./storage-usage"
import { YourDataSection } from "./your-data-section"
import { DangerZoneSection } from "./danger-zone-section"
import { EmailPreferencesSection } from "./email-preferences-section"
import { Button } from "@/components/ui/button"
import { ArrowLeft, BookOpen, SpellCheck, Mic, Settings } from "lucide-react"
import { Link } from "@/i18n/navigation"
import { LanguageSwitcher } from "@/components/language-switcher"

export function UserSettingsDashboard() {
  const t = useTranslations('settings')
  const [activeTab, setActiveTab] = useState("dictionary")

  const tabs = [
    { id: "dictionary", icon: BookOpen },
    { id: "spell-check", icon: SpellCheck },
    { id: "replacements", icon: Mic },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header with glassmorphism effect */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/50 dark:border-slate-700/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/editor">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('backToEditor')}</span>
                </Button>
              </Link>
              <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/20">
                  <Settings className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white">
                    {t('title')}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 hidden sm:block">
                    {t('subtitle')}
                  </p>
                </div>
              </div>
            </div>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Storage Card with enhanced styling */}
        <div className="mb-8">
          <StorageUsage />
        </div>

        {/* Tabs with modern styling */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-1.5 shadow-sm border border-slate-200/80 dark:border-slate-700/50">
            <TabsList className="w-full grid grid-cols-3 gap-1 bg-transparent h-auto p-0">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const label = t(`tabs.${tab.id === 'spell-check' ? 'spellCheck' : tab.id}`)
                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200
                      data-[state=inactive]:text-slate-600 data-[state=inactive]:dark:text-slate-400
                      data-[state=inactive]:hover:text-slate-900 data-[state=inactive]:dark:hover:text-white
                      data-[state=inactive]:hover:bg-slate-100 data-[state=inactive]:dark:hover:bg-slate-700/50
                      data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-500 data-[state=active]:to-blue-600
                      data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/25"
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="hidden sm:inline truncate">{label}</span>
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </div>

          <TabsContent value="dictionary" className="space-y-6 mt-0">
            <UserDictionaryManager />
            <IgnoredDictionaryWordsManager />
          </TabsContent>

          <TabsContent value="spell-check" className="mt-0">
            <SpellCheckCustomWordsManager />
          </TabsContent>

          <TabsContent value="replacements" className="mt-0">
            <UserReplacementsManager />
          </TabsContent>
        </Tabs>

        {/* Email Preferences Section */}
        <div className="mt-8">
          <EmailPreferencesSection />
        </div>

        {/* Your Data Section */}
        <div className="mt-8">
          <YourDataSection />
        </div>

        {/* Danger Zone Section */}
        <div className="mt-8">
          <DangerZoneSection />
        </div>

        {/* Footer with privacy link */}
        <footer className="mt-12 pt-6 border-t border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-center justify-center gap-4 text-sm text-slate-500 dark:text-slate-400">
            <a
              href="/privacy"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Privacy Policy
            </a>
          </div>
        </footer>
      </main>
    </div>
  )
}
