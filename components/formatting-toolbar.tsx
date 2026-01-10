"use client"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Bold, Italic, Heading1, Heading2, Heading3, Type } from "lucide-react"
import { cn } from "@/lib/utils"

interface FormattingToolbarProps {
  onFormat: (command: string, value?: string) => void
  activeFormats: {
    bold: boolean
    italic: boolean
    heading: string | null
    fontSize: string
  }
}

const FONT_SIZES = [
  { value: "1", label: "Small" },
  { value: "3", label: "Normal" },
  { value: "4", label: "Large" },
  { value: "5", label: "X-Large" },
  { value: "6", label: "XX-Large" },
]

export function FormattingToolbar({ onFormat, activeFormats }: FormattingToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-1 p-1 border-b bg-muted/30">
      {/* Bold */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onFormat("bold")}
        className={cn("h-8 w-8 p-0", activeFormats.bold && "bg-primary/20 text-primary")}
        title="Bold (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </Button>

      {/* Italic */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onFormat("italic")}
        className={cn("h-8 w-8 p-0", activeFormats.italic && "bg-primary/20 text-primary")}
        title="Italic (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Headings */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onFormat("heading", "h1")}
        className={cn("h-8 w-8 p-0", activeFormats.heading === "H1" && "bg-primary/20 text-primary")}
        title="Heading 1"
      >
        <Heading1 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onFormat("heading", "h2")}
        className={cn("h-8 w-8 p-0", activeFormats.heading === "H2" && "bg-primary/20 text-primary")}
        title="Heading 2"
      >
        <Heading2 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onFormat("heading", "h3")}
        className={cn("h-8 w-8 p-0", activeFormats.heading === "H3" && "bg-primary/20 text-primary")}
        title="Heading 3"
      >
        <Heading3 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onFormat("heading", "p")}
        className={cn("h-8 w-8 p-0", !activeFormats.heading && "bg-primary/20 text-primary")}
        title="Normal text"
      >
        <Type className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Font Size */}
      <Select value={activeFormats.fontSize} onValueChange={(value) => onFormat("fontSize", value)}>
        <SelectTrigger className="h-8 w-24 text-xs">
          <SelectValue placeholder="Size" />
        </SelectTrigger>
        <SelectContent>
          {FONT_SIZES.map((size) => (
            <SelectItem key={size.value} value={size.value}>
              {size.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
