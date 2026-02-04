"use client"

import { useState } from "react"
import { MasterReplacementsTab } from "./master-replacements-tab"
import { UserReplacementsTab } from "./user-replacements-tab"
import { UserDictionaryWordsTab } from "./user-dictionary-words-tab"
import { SpellCheckAddedWordsTab } from "./spell-check-added-words-tab"
import { SpellCheckIgnoredWordsTab } from "./spell-check-ignored-words-tab"
import { IgnoredDictionaryWordsTab } from "./ignored-dictionary-words-tab"
import { UserAdControlTab } from "./user-ad-control-tab"
import { StorageManagementTab } from "./storage-management-tab"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  Mic,
  SplitSquareHorizontal,
  SpellCheck,
  ChevronRight,
  Menu,
  X,
  Megaphone,
  HardDrive,
  Mail,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

type NavItem = {
  id: string
  label: string
  icon?: React.ReactNode
  href?: string
  children?: { id: string; label: string }[]
}

const navigation: NavItem[] = [
  {
    id: "email",
    label: "Email Campaigns",
    icon: <Mail className="h-4 w-4" />,
    href: "/admin/email",
  },
  {
    id: "voice-to-text",
    label: "Voice-to-Text",
    icon: <Mic className="h-4 w-4" />,
    children: [
      { id: "master", label: "Master Replacements" },
      { id: "user", label: "User Replacements" },
    ],
  },
  {
    id: "word-breaking",
    label: "Word Breaking",
    icon: <SplitSquareHorizontal className="h-4 w-4" />,
    children: [
      { id: "dictionary", label: "User Custom Word-Breaks" },
      { id: "ignored-dictionary", label: "Ignored Dictionary Words" },
    ],
  },
  {
    id: "spell-check",
    label: "Spell Check",
    icon: <SpellCheck className="h-4 w-4" />,
    children: [
      { id: "spell-check-added", label: "Added Words" },
      { id: "spell-check-ignored", label: "Ignored Words" },
    ],
  },
  {
    id: "ads",
    label: "Ads",
    icon: <Megaphone className="h-4 w-4" />,
    children: [
      { id: "user-ads", label: "User Ad Control" },
    ],
  },
  {
    id: "storage",
    label: "Storage",
    icon: <HardDrive className="h-4 w-4" />,
    children: [
      { id: "storage-management", label: "User Storage Limits" },
    ],
  },
]

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("master")
  const [expandedSections, setExpandedSections] = useState<string[]>([
    "voice-to-text",
    "word-breaking",
    "spell-check",
    "ads",
    "storage",
  ])
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId]
    )
  }

  const getActiveSection = () => {
    for (const section of navigation) {
      if (section.children?.some((child) => child.id === activeTab)) {
        return section
      }
    }
    return navigation[0]
  }

  const getActiveLabel = () => {
    for (const section of navigation) {
      const child = section.children?.find((c) => c.id === activeTab)
      if (child) return child.label
    }
    return ""
  }

  const renderContent = () => {
    switch (activeTab) {
      case "master":
        return <MasterReplacementsTab />
      case "user":
        return <UserReplacementsTab />
      case "dictionary":
        return <UserDictionaryWordsTab />
      case "ignored-dictionary":
        return <IgnoredDictionaryWordsTab />
      case "spell-check-added":
        return <SpellCheckAddedWordsTab />
      case "spell-check-ignored":
        return <SpellCheckIgnoredWordsTab />
      case "user-ads":
        return <UserAdControlTab />
      case "storage-management":
        return <StorageManagementTab />
      default:
        return <MasterReplacementsTab />
    }
  }

  const NavContent = ({ onItemClick }: { onItemClick?: () => void }) => (
    <nav className="space-y-1">
      {navigation.map((section) => (
        <div key={section.id}>
          {section.href ? (
            // Direct link item (no children)
            <Link
              href={section.href}
              onClick={onItemClick}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
            >
              {section.icon}
              {section.label}
            </Link>
          ) : (
            <>
              <button
                onClick={() => toggleSection(section.id)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                  "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                )}
              >
                <span className="flex items-center gap-2">
                  {section.icon}
                  {section.label}
                </span>
                <ChevronRight
                  className={cn(
                    "h-4 w-4 transition-transform",
                    expandedSections.includes(section.id) && "rotate-90"
                  )}
                />
              </button>
              {expandedSections.includes(section.id) && section.children && (
                <div className="ml-6 mt-1 space-y-1">
                  {section.children.map((child) => (
                    <button
                      key={child.id}
                      onClick={() => {
                        setActiveTab(child.id)
                        onItemClick?.()
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2 text-sm rounded-lg transition-colors",
                        activeTab === child.id
                          ? "bg-primary text-primary-foreground font-medium"
                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                      )}
                    >
                      {child.label}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      ))}
    </nav>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href="/editor">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to Editor</span>
              </Button>
            </Link>
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Admin Dashboard</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Manage replacements, dictionaries, and spell checking
              </p>
            </div>
          </div>

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile: Current section indicator */}
        <div className="lg:hidden px-4 pb-3 flex items-center gap-2 text-sm">
          <span className="text-gray-500 dark:text-gray-400">{getActiveSection()?.label}</span>
          <ChevronRight className="h-3 w-3 text-gray-400" />
          <span className="font-medium text-gray-900 dark:text-white">{getActiveLabel()}</span>
        </div>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 min-h-[calc(100vh-65px)]">
          <div className="p-4">
            <NavContent />
          </div>
        </aside>

        {/* Mobile Sidebar Overlay */}
        {mobileMenuOpen && (
          <div
            className="lg:hidden fixed inset-0 z-30 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Mobile Sidebar */}
        <aside
          className={cn(
            "lg:hidden fixed top-0 left-0 z-40 w-72 h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-200 ease-in-out",
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 dark:text-white">Admin Dashboard</h2>
              <Button variant="ghost" size="sm" onClick={() => setMobileMenuOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
          <div className="p-4">
            <NavContent onItemClick={() => setMobileMenuOpen(false)} />
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          <div className="p-4 lg:p-6 max-w-5xl">{renderContent()}</div>
        </main>
      </div>
    </div>
  )
}
