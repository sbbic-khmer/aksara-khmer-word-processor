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
  Undo2,
  Redo2,
  Highlighter,
  WrapText,
  SpellCheck,
  SpellCheck2,
  BookCheck,
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const FONT_SIZES = [
  { value: "1", label: "Tiny" },
  { value: "2", label: "Small" },
  { value: "3", label: "Normal" },
  { value: "4", label: "Medium" },
  { value: "5", label: "Large" },
  { value: "6", label: "X-Large" },
  { value: "7", label: "XX-Large" },
]

interface ActiveFormats {
  bold: boolean
  italic: boolean
  underline: boolean
  strikethrough: boolean
  highlight: boolean
  heading: string | null
  fontSize: string
  alignment: string
  list: "ordered" | "unordered" | null
}

interface FormattingToolbarProps {
  activeFormats: ActiveFormats
  onFormat: (command: string, value?: string) => void
  onUndo: () => void
  onRedo: () => void
  onInsertZWSP: () => void
  onJoinWord: () => void
  showBreaks: boolean
  onToggleBreaks: () => void
  spellCheckEnabled: boolean
  onToggleSpellCheck: () => void
  grammarCheckEnabled: boolean
  onToggleGrammarCheck: () => void
}

export function FormattingToolbar({
  activeFormats,
  onFormat,
  onUndo,
  onRedo,
  onInsertZWSP,
  onJoinWord,
  showBreaks,
  onToggleBreaks,
  spellCheckEnabled,
  onToggleSpellCheck,
  grammarCheckEnabled,
  onToggleGrammarCheck,
}: FormattingToolbarProps) {
  return (
    <TooltipProvider>
      <>
        {/* Undo/Redo */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={onUndo} className="h-8 w-8 p-0">
              <Undo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={onRedo} className="h-8 w-8 p-0">
              <Redo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Redo (Ctrl+Y)</TooltipContent>
        </Tooltip>

        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

        {/* Font Size */}
        <Select value={activeFormats.fontSize} onValueChange={(value) => onFormat("fontSize", value)}>
          <SelectTrigger className="w-24 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_SIZES.map((size) => (
              <SelectItem key={size.value} value={size.value}>
                {size.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

        {/* Text formatting */}
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
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onFormat("underline")}
              className={cn(
                "h-8 w-8 p-0",
                activeFormats.underline && "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300",
              )}
            >
              <Underline className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Underline (Ctrl+U)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onFormat("strikethrough")}
              className={cn(
                "h-8 w-8 p-0",
                activeFormats.strikethrough && "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300",
              )}
            >
              <Strikethrough className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Strikethrough</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onFormat("highlight")}
              className={cn(
                "h-8 w-8 p-0",
                activeFormats.highlight && "bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-300",
              )}
            >
              <Highlighter className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Highlight</TooltipContent>
        </Tooltip>

        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

        {/* Headings */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onFormat("heading", "h1")}
              className={cn(
                "h-8 w-8 p-0",
                activeFormats.heading === "H1" && "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300",
              )}
            >
              <Heading1 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Heading 1</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onFormat("heading", "h2")}
              className={cn(
                "h-8 w-8 p-0",
                activeFormats.heading === "H2" && "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300",
              )}
            >
              <Heading2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Heading 2</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onFormat("heading", "h3")}
              className={cn(
                "h-8 w-8 p-0",
                activeFormats.heading === "H3" && "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300",
              )}
            >
              <Heading3 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Heading 3</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onFormat("heading", "p")}
              className={cn(
                "h-8 w-8 p-0",
                !activeFormats.heading && "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300",
              )}
            >
              <Type className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Normal text</TooltipContent>
        </Tooltip>

        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

        {/* Lists */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onFormat("bulletList")}
              className={cn(
                "h-8 w-8 p-0",
                activeFormats.list === "unordered" && "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300",
              )}
            >
              <List className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Bullet list</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onFormat("numberedList")}
              className={cn(
                "h-8 w-8 p-0",
                activeFormats.list === "ordered" && "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300",
              )}
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Numbered list</TooltipContent>
        </Tooltip>

        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

        {/* Alignment */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onFormat("align", "left")}
              className={cn(
                "h-8 w-8 p-0",
                activeFormats.alignment === "left" && "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300",
              )}
            >
              <AlignLeft className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Align left</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onFormat("align", "center")}
              className={cn(
                "h-8 w-8 p-0",
                activeFormats.alignment === "center" && "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300",
              )}
            >
              <AlignCenter className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Align center</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onFormat("align", "right")}
              className={cn(
                "h-8 w-8 p-0",
                activeFormats.alignment === "right" && "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300",
              )}
            >
              <AlignRight className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Align right</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onFormat("align", "full")}
              className={cn(
                "h-8 w-8 p-0",
                activeFormats.alignment === "justify" &&
                  "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300",
              )}
            >
              <AlignJustify className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Justify</TooltipContent>
        </Tooltip>

        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

        {/* Word Break Tools */}
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

        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

        {/* Auto Word Break Toggle */}
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
              <WrapText className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{showBreaks ? "Disable auto word break" : "Enable auto word break"}</TooltipContent>
        </Tooltip>

        {/* Spell Check Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleSpellCheck}
              className={cn(
                "h-8 w-8 p-0",
                spellCheckEnabled && "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300",
              )}
            >
              {spellCheckEnabled ? <SpellCheck className="h-4 w-4" /> : <SpellCheck2 className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{spellCheckEnabled ? "បិទត្រួតពិនិត្យអក្ខរាវិរុទ្ធ" : "បើកត្រួតពិនិត្យអក្ខរាវិរុទ្ធ"}</TooltipContent>
        </Tooltip>

        {/* Grammar Check Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleGrammarCheck}
              className={cn(
                "h-8 w-8 p-0",
                grammarCheckEnabled && "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300",
              )}
            >
              <BookCheck className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{grammarCheckEnabled ? "បិទត្រួតពិនិត្យអក្ខរាវិរុទ្ធស្តង់ដារ" : "បើកត្រួតពិនិត្យអក្ខរាវិរុទ្ធស្តង់ដារ"}</TooltipContent>
        </Tooltip>
      </>
    </TooltipProvider>
  )
}
