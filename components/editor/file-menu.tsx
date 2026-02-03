"use client"

import { Button } from "@/components/ui/button"
import { FilePlus, FolderOpen, Save, SaveAll, Copy, Download, Bug, BugOff, ChevronDown, Check } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface FileMenuProps {
  onNew: () => void
  onOpen: () => void
  onSave: () => void
  onSaveAs: () => void
  onCopyWithBreaks: () => void
  onExportOdt: () => void
  debugMode: boolean
  onToggleDebug: () => void
  wordBreakerDebugMode: boolean
  onToggleWordBreakerDebug: () => void
  cursorDebugMode: boolean
  onToggleCursorDebug: () => void
  spellCheckDebugMode: boolean
  onToggleSpellCheckDebug: () => void
  hasUnsavedChanges?: boolean
  currentDocTitle?: string
}

// Menu item with keyboard shortcut hint
function MenuItemWithShortcut({
  children,
  shortcut,
  onClick,
  icon: Icon,
  indicator,
  className,
}: {
  children: React.ReactNode
  shortcut?: string
  onClick: () => void
  icon?: React.ComponentType<{ className?: string }>
  indicator?: React.ReactNode
  className?: string
}) {
  return (
    <DropdownMenuItem onClick={onClick} className={cn("gap-2", className)}>
      {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      <span className="flex-1">{children}</span>
      {indicator}
      {shortcut && (
        <kbd className="ml-auto text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
          {shortcut}
        </kbd>
      )}
    </DropdownMenuItem>
  )
}

// Debug toggle menu item
function DebugToggleItem({
  enabled,
  onToggle,
  label,
}: {
  enabled: boolean
  onToggle: () => void
  label: string
}) {
  return (
    <DropdownMenuItem onClick={onToggle} className="gap-2">
      {enabled ? (
        <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
      ) : (
        <div className="h-4 w-4" />
      )}
      <span className="flex-1">{label}</span>
      {enabled && (
        <span className="text-[10px] font-medium text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40 px-1.5 py-0.5 rounded">
          ON
        </span>
      )}
    </DropdownMenuItem>
  )
}

export function FileMenu({
  onNew,
  onOpen,
  onSave,
  onSaveAs,
  onCopyWithBreaks,
  onExportOdt,
  debugMode,
  onToggleDebug,
  wordBreakerDebugMode,
  onToggleWordBreakerDebug,
  cursorDebugMode,
  onToggleCursorDebug,
  spellCheckDebugMode,
  onToggleSpellCheckDebug,
  hasUnsavedChanges,
  currentDocTitle,
}: FileMenuProps) {
  const anyDebugEnabled = debugMode || wordBreakerDebugMode || cursorDebugMode || spellCheckDebugMode

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 px-3 gap-1.5 text-sm font-medium transition-colors",
            "hover:bg-slate-100 dark:hover:bg-slate-800",
            "focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
          )}
        >
          File
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <MenuItemWithShortcut onClick={onNew} icon={FilePlus} shortcut="⌘N">
          New
        </MenuItemWithShortcut>
        <MenuItemWithShortcut onClick={onOpen} icon={FolderOpen} shortcut="⌘O">
          Open...
        </MenuItemWithShortcut>

        <DropdownMenuSeparator />

        <MenuItemWithShortcut
          onClick={onSave}
          icon={Save}
          shortcut="⌘S"
          indicator={hasUnsavedChanges && (
            <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
          )}
        >
          Save
        </MenuItemWithShortcut>
        <MenuItemWithShortcut onClick={onSaveAs} icon={SaveAll} shortcut="⌘⇧S">
          Save As...
        </MenuItemWithShortcut>

        <DropdownMenuSeparator />

        <MenuItemWithShortcut onClick={onCopyWithBreaks} icon={Copy}>
          Copy with breaks
        </MenuItemWithShortcut>
        <MenuItemWithShortcut onClick={onExportOdt} icon={Download}>
          Export as ODT
        </MenuItemWithShortcut>

        <DropdownMenuSeparator />

        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="gap-2">
            {anyDebugEnabled ? (
              <Bug className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            ) : (
              <Bug className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="flex-1">Debug Options</span>
            {anyDebugEnabled && (
              <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded mr-1">
                Active
              </span>
            )}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-52">
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
              Toggle debug modes
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DebugToggleItem
              enabled={debugMode}
              onToggle={onToggleDebug}
              label="General Debug"
            />
            <DebugToggleItem
              enabled={wordBreakerDebugMode}
              onToggle={onToggleWordBreakerDebug}
              label="Word Breaker"
            />
            <DebugToggleItem
              enabled={cursorDebugMode}
              onToggle={onToggleCursorDebug}
              label="Cursor Debug"
            />
            <DebugToggleItem
              enabled={spellCheckDebugMode}
              onToggle={onToggleSpellCheckDebug}
              label="Spell Check"
            />
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
