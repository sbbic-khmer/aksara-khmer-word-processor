"use client"

import { Button } from "@/components/ui/button"
import { Sun, Moon } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { UserMenu } from "@/components/user-menu"

interface EditorHeaderProps {
  theme: string | undefined
  setTheme: (theme: string) => void
  mounted: boolean
}

export function EditorHeader({ theme, setTheme, mounted }: EditorHeaderProps) {
  return (
    <div className="flex items-center justify-between px-2 sm:px-4 py-2 border-b border-gray-100 dark:border-gray-800">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-3">
          {/* Minimal abstract icon - stylized pen/writing mark */}
          <div className="relative w-10 h-10 sm:w-11 sm:h-11">
            {/* Background with subtle gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg shadow-blue-500/25" />
            {/* Glass overlay effect */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 via-transparent to-black/5" />
            {/* Inner border for depth */}
            <div className="absolute inset-[1px] rounded-[14px] border border-white/20" />
            {/* Stylized អ character */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white text-2xl sm:text-[26px] font-bold leading-none translate-y-[-1.5px]">អ</span>
            </div>
          </div>

          {/* Text lockup */}
          <div className="flex flex-col gap-0">
            <div className="flex items-baseline gap-1.5">
              <h1
                className="text-[22px] sm:text-[26px] leading-none text-gray-900 dark:text-white tracking-tight"
                style={{ fontFamily: "var(--font-moul), serif" }}
              >
                អក្សរា
              </h1>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] sm:text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-[0.15em] hidden sm:block">
                Smart Khmer Writing
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        {/* Theme toggle */}
        <TooltipProvider>
          {mounted && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="h-8 w-8 p-0"
                >
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}</TooltipContent>
            </Tooltip>
          )}
        </TooltipProvider>
        <UserMenu />
      </div>
    </div>
  )
}
