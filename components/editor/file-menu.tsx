"use client"

import { Button } from "@/components/ui/button"
import { Copy, Download, Bug, BugOff, ChevronDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

interface FileMenuProps {
  onCopyWithBreaks: () => void
  onExportOdt: () => void
  debugMode: boolean
  onToggleDebug: () => void
}

export function FileMenu({ onCopyWithBreaks, onExportOdt, debugMode, onToggleDebug }: FileMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2 gap-1 text-sm font-medium">
          File
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
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
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
