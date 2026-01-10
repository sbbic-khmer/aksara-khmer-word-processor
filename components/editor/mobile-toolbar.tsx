"use client"

import { Button } from "@/components/ui/button"
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  Type,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Link2,
  Unlink2,
  Eye,
  EyeOff,
  Undo2,
  Redo2,
  Palette,
  ChevronDown,
  Copy,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface ActiveFormats {
  bold: boolean
  italic: boolean
  underline: boolean
  strikethrough: boolean
  heading: string | null
  fontSize: string
  alignment: string
  list: "ordered" | "unordered" | null
}

interface MobileToolbarProps {
  activeFormats: ActiveFormats
  onFormat: (command: string, value?: string) => void
  onUndo: () => void
  onRedo: () => void
  onInsertZWSP: () => void
  onJoinWord: () => void
  showBreaks: boolean
  onToggleBreaks: () => void
  onApplyReplacements: () => void
  replacementsLoading: boolean
}

export function MobileToolbar({
  activeFormats,
  onFormat,
  onUndo,
  onRedo,
  onInsertZWSP,
  onJoinWord,
  showBreaks,
  onToggleBreaks,
  onApplyReplacements,
  replacementsLoading,
}: MobileToolbarProps) {
  return (
    <TooltipProvider>
      <>
        {/* Format Menu - Contains all text formatting */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1 px-2">
              <Palette className="h-4 w-4" />
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem onClick={onUndo}>
              <Undo2 className="h-4 w-4 mr-2" />
              Undo
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onRedo}>
              <Redo2 className="h-4 w-4 mr-2" />
              Redo
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Type className="h-4 w-4 mr-2" />
                Text Style
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => onFormat("bold")}>
                  <Bold className="h-4 w-4 mr-2" />
                  Bold
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onFormat("italic")}>
                  <Italic className="h-4 w-4 mr-2" />
                  Italic
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onFormat("underline")}>
                  <Underline className="h-4 w-4 mr-2" />
                  Underline
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onFormat("strikethrough")}>
                  <Strikethrough className="h-4 w-4 mr-2" />
                  Strikethrough
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Heading1 className="h-4 w-4 mr-2" />
                Heading
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => onFormat("heading", "h1")}>
                  <Heading1 className="h-4 w-4 mr-2" />
                  Heading 1
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onFormat("heading", "h2")}>
                  <Heading2 className="h-4 w-4 mr-2" />
                  Heading 2
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onFormat("heading", "h3")}>
                  <Heading3 className="h-4 w-4 mr-2" />
                  Heading 3
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onFormat("heading", "p")}>
                  <Type className="h-4 w-4 mr-2" />
                  Normal
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <List className="h-4 w-4 mr-2" />
                List
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => onFormat("bulletList")}>
                  <List className="h-4 w-4 mr-2" />
                  Bullet List
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onFormat("numberedList")}>
                  <ListOrdered className="h-4 w-4 mr-2" />
                  Numbered List
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <AlignLeft className="h-4 w-4 mr-2" />
                Align
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => onFormat("align", "left")}>
                  <AlignLeft className="h-4 w-4 mr-2" />
                  Left
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onFormat("align", "center")}>
                  <AlignCenter className="h-4 w-4 mr-2" />
                  Center
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onFormat("align", "right")}>
                  <AlignRight className="h-4 w-4 mr-2" />
                  Right
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onFormat("align", "full")}>
                  <AlignJustify className="h-4 w-4 mr-2" />
                  Justify
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onApplyReplacements} disabled={replacementsLoading}>
              {replacementsLoading ? (
                <span className="h-4 w-4 mr-2 animate-spin">🔄</span>
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              Apply Replacements
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Quick access formatting buttons */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onFormat("bold")}
              className={cn(
                "h-8 w-8 p-0",
                activeFormats.bold && "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300",
              )}
            >
              <Bold className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Bold (Ctrl+B)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onFormat("italic")}
              className={cn(
                "h-8 w-8 p-0",
                activeFormats.italic && "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300",
              )}
            >
              <Italic className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Italic (Ctrl+I)</TooltipContent>
        </Tooltip>

        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-0.5" />

        {/* Word break tools */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={onInsertZWSP} className="h-8 w-8 p-0">
              <Link2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Insert break point</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={onJoinWord} className="h-8 w-8 p-0">
              <Unlink2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Join selected words</TooltipContent>
        </Tooltip>

        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-0.5" />

        {/* Show breaks toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleBreaks}
              className={cn(
                "h-8 w-8 p-0",
                showBreaks && "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300",
              )}
            >
              {showBreaks ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{showBreaks ? "Hide word breaks" : "Show word breaks"}</TooltipContent>
        </Tooltip>
      </>
    </TooltipProvider>
  )
}
