"use client"

import { useTranslations } from 'next-intl'
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
  Settings,
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { Link } from "@/i18n/navigation"

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
  onSplitWord: () => void
  showBreaks: boolean
  onToggleBreaks: () => void
  spellCheckEnabled: boolean
  onToggleSpellCheck: () => void
  grammarCheckEnabled: boolean
  onToggleGrammarCheck: () => void
}

// Toolbar button with consistent styling
function ToolbarButton({
  onClick,
  isActive,
  tooltip,
  shortcut,
  children,
  variant = "default",
}: {
  onClick: () => void
  isActive?: boolean
  tooltip: string
  shortcut?: string
  children: React.ReactNode
  variant?: "default" | "highlight" | "spell" | "grammar"
}) {
  const activeStyles = {
    default: "bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 shadow-sm",
    highlight: "bg-yellow-100 dark:bg-yellow-900/60 text-yellow-600 dark:text-yellow-300 shadow-sm",
    spell: "bg-red-100 dark:bg-red-900/60 text-red-600 dark:text-red-300 shadow-sm",
    grammar: "bg-sky-100 dark:bg-sky-900/60 text-sky-600 dark:text-sky-300 shadow-sm",
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClick}
          className={cn(
            "h-8 w-8 p-0 transition-all duration-150",
            "hover:bg-slate-100 dark:hover:bg-slate-800",
            "focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1",
            isActive && activeStyles[variant]
          )}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="flex items-center gap-2">
        <span>{tooltip}</span>
        {shortcut && (
          <kbd className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
            {shortcut}
          </kbd>
        )}
      </TooltipContent>
    </Tooltip>
  )
}

// Visual separator between button groups
function ToolbarSeparator() {
  return <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1.5" />
}

// Button group wrapper for visual grouping
function ToolbarGroup({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <div className="flex items-center gap-0.5" role="group" aria-label={label}>
      {children}
    </div>
  )
}

export function FormattingToolbar({
  activeFormats,
  onFormat,
  onUndo,
  onRedo,
  onInsertZWSP,
  onJoinWord,
  onSplitWord,
  showBreaks,
  onToggleBreaks,
  spellCheckEnabled,
  onToggleSpellCheck,
  grammarCheckEnabled,
  onToggleGrammarCheck,
}: FormattingToolbarProps) {
  const t = useTranslations('editor.toolbar')

  const FONT_SIZES = [
    { value: "1", label: t('fontSize.tiny') },
    { value: "2", label: t('fontSize.small') },
    { value: "3", label: t('fontSize.normal') },
    { value: "4", label: t('fontSize.medium') },
    { value: "5", label: t('fontSize.large') },
    { value: "6", label: t('fontSize.xLarge') },
    { value: "7", label: t('fontSize.xxLarge') },
  ]

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center flex-wrap gap-1">
        {/* History */}
        <ToolbarGroup label="History">
          <ToolbarButton onClick={onUndo} tooltip={t('undo')} shortcut="⌘Z">
            <Undo2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={onRedo} tooltip={t('redo')} shortcut="⌘⇧Z">
            <Redo2 className="h-4 w-4" />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarSeparator />

        {/* Font Size */}
        <Select value={activeFormats.fontSize} onValueChange={(value) => onFormat("fontSize", value)}>
          <SelectTrigger className="w-[90px] h-8 text-xs border-slate-200 dark:border-slate-700 focus:ring-blue-500">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_SIZES.map((size) => (
              <SelectItem key={size.value} value={size.value} className="text-xs">
                {size.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <ToolbarSeparator />

        {/* Text Formatting */}
        <ToolbarGroup label="Text formatting">
          <ToolbarButton
            onClick={() => onFormat("bold")}
            isActive={activeFormats.bold}
            tooltip={t('bold')}
            shortcut="⌘B"
          >
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => onFormat("italic")}
            isActive={activeFormats.italic}
            tooltip={t('italic')}
            shortcut="⌘I"
          >
            <Italic className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => onFormat("underline")}
            isActive={activeFormats.underline}
            tooltip={t('underline')}
            shortcut="⌘U"
          >
            <Underline className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => onFormat("strikethrough")}
            isActive={activeFormats.strikethrough}
            tooltip={t('strikethrough')}
          >
            <Strikethrough className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => onFormat("highlight")}
            isActive={activeFormats.highlight}
            tooltip={t('highlight')}
            variant="highlight"
          >
            <Highlighter className="h-4 w-4" />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarSeparator />

        {/* Headings */}
        <ToolbarGroup label="Headings">
          <ToolbarButton
            onClick={() => onFormat("heading", "h1")}
            isActive={activeFormats.heading === "H1"}
            tooltip={t('heading1')}
          >
            <Heading1 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => onFormat("heading", "h2")}
            isActive={activeFormats.heading === "H2"}
            tooltip={t('heading2')}
          >
            <Heading2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => onFormat("heading", "h3")}
            isActive={activeFormats.heading === "H3"}
            tooltip={t('heading3')}
          >
            <Heading3 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => onFormat("heading", "p")}
            isActive={!activeFormats.heading}
            tooltip={t('normalText')}
          >
            <Type className="h-4 w-4" />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarSeparator />

        {/* Lists */}
        <ToolbarGroup label="Lists">
          <ToolbarButton
            onClick={() => onFormat("bulletList")}
            isActive={activeFormats.list === "unordered"}
            tooltip={t('bulletList')}
          >
            <List className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => onFormat("numberedList")}
            isActive={activeFormats.list === "ordered"}
            tooltip={t('numberedList')}
          >
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarSeparator />

        {/* Alignment */}
        <ToolbarGroup label="Alignment">
          <ToolbarButton
            onClick={() => onFormat("align", "left")}
            isActive={activeFormats.alignment === "left"}
            tooltip={t('alignLeft')}
          >
            <AlignLeft className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => onFormat("align", "center")}
            isActive={activeFormats.alignment === "center"}
            tooltip={t('alignCenter')}
          >
            <AlignCenter className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => onFormat("align", "right")}
            isActive={activeFormats.alignment === "right"}
            tooltip={t('alignRight')}
          >
            <AlignRight className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => onFormat("align", "full")}
            isActive={activeFormats.alignment === "justify"}
            tooltip={t('justify')}
          >
            <AlignJustify className="h-4 w-4" />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarSeparator />

        {/* Word Break Tools */}
        <ToolbarGroup label="Word breaking">
          <ToolbarButton onClick={onJoinWord} tooltip={t('joinWords')}>
            <Unlink2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={onSplitWord} tooltip={t('splitWord')}>
            <Link2 className="h-4 w-4" />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarSeparator />

        {/* Toggles */}
        <ToolbarGroup label="Editor options">
          <ToolbarButton
            onClick={onToggleBreaks}
            isActive={showBreaks}
            tooltip={showBreaks ? t('hideWordBreaks') : t('showWordBreaks')}
          >
            <WrapText className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={onToggleSpellCheck}
            isActive={spellCheckEnabled}
            tooltip={spellCheckEnabled ? t('disableSpellCheck') : t('enableSpellCheck')}
            variant="spell"
          >
            {spellCheckEnabled ? <SpellCheck className="h-4 w-4" /> : <SpellCheck2 className="h-4 w-4" />}
          </ToolbarButton>
          <ToolbarButton
            onClick={onToggleGrammarCheck}
            isActive={grammarCheckEnabled}
            tooltip={grammarCheckEnabled ? t('disableGrammarCheck') : t('enableGrammarCheck')}
            variant="grammar"
          >
            <BookCheck className="h-4 w-4" />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarSeparator />

        {/* Settings */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href="/settings">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="bottom">{t('settings')}</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}
