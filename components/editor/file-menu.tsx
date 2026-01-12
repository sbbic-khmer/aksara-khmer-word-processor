"use client"

import { Button } from "@/components/ui/button"
import { FilePlus, FolderOpen, Save, Copy, Download, Bug, BugOff, ChevronDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

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
  hasUnsavedChanges?: boolean
  currentDocTitle?: string
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
  hasUnsavedChanges,
  currentDocTitle,
}: FileMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2 gap-1 text-sm font-medium">
          File
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={onNew}>
          <FilePlus className="h-4 w-4 mr-2" />
          New
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onOpen}>
          <FolderOpen className="h-4 w-4 mr-2" />
          Open...
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSave}>
          <Save className="h-4 w-4 mr-2" />
          Save
          {hasUnsavedChanges && <span className="ml-auto text-xs text-gray-500">●</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onSaveAs}>
          <Save className="h-4 w-4 mr-2" />
          Save As...
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onCopyWithBreaks}>
          <Copy className="h-4 w-4 mr-2" />
          Copy with breaks
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onExportOdt}>
          <Download className="h-4 w-4 mr-2" />
          Export as ODT
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onToggleDebug}>
          {debugMode ? <BugOff className="h-4 w-4 mr-2" /> : <Bug className="h-4 w-4 mr-2" />}
          {debugMode ? "Disable Debug Mode" : "Enable Debug Mode"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onToggleWordBreakerDebug}>
          {wordBreakerDebugMode ? <BugOff className="h-4 w-4 mr-2" /> : <Bug className="h-4 w-4 mr-2" />}
          {wordBreakerDebugMode ? "Disable Word Breaker Debug" : "Enable Word Breaker Debug"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
