import JSZip from "jszip"
import { debugLog } from "./debug"

const WJ = "\u2060"
const ZWSP = "\u200B"

interface TextRun {
  text: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strikethrough?: boolean
  highlight?: boolean
  fontSize?: string
}

interface Paragraph {
  runs: TextRun[]
  heading?: "h1" | "h2" | "h3"
  alignment?: "left" | "center" | "right" | "justify"
  listType?: "bullet" | "numbered"
  listLevel?: number
}

function parseEditorContent(element: HTMLElement): Paragraph[] {
  debugLog("ODT Export Lexical - Parsing editor content")

  const paragraphs: Paragraph[] = []
  let currentParagraph: Paragraph = { runs: [] }
  let currentAlignment: "left" | "center" | "right" | "justify" | undefined
  let currentHeading: "h1" | "h2" | "h3" | undefined

  function getCurrentStyles(node: Node): Partial<TextRun> {
    const styles: Partial<TextRun> = {}
    let current: Node | null = node

    while (current && current !== element) {
      if (current.nodeType === Node.ELEMENT_NODE) {
        const el = current as HTMLElement
        const tagName = el.tagName.toLowerCase()

        if (tagName === "b" || tagName === "strong" || el.classList.contains("font-bold")) styles.bold = true
        if (tagName === "i" || tagName === "em" || el.classList.contains("italic")) styles.italic = true
        if (tagName === "u" || el.classList.contains("underline")) styles.underline = true
        if (tagName === "s" || tagName === "strike" || tagName === "del" || el.classList.contains("line-through"))
          styles.strikethrough = true
        if (tagName === "mark" || el.classList.contains("highlight")) styles.highlight = true

        const computedStyle = window.getComputedStyle(el)
        if (computedStyle.fontWeight === "bold" || Number.parseInt(computedStyle.fontWeight) >= 700) {
          styles.bold = true
        }
        if (computedStyle.fontStyle === "italic") styles.italic = true
        if (computedStyle.textDecoration.includes("underline")) styles.underline = true
        if (computedStyle.textDecoration.includes("line-through")) styles.strikethrough = true
        const bgColor = computedStyle.backgroundColor
        if (
          bgColor &&
          (bgColor.includes("yellow") || bgColor === "rgb(255, 255, 0)" || bgColor === "rgba(255, 255, 0)")
        ) {
          styles.highlight = true
        }
      }
      current = current.parentNode
    }

    return styles
  }

  function finishParagraph() {
    if (currentParagraph.runs.length > 0) {
      if (currentAlignment) currentParagraph.alignment = currentAlignment
      if (currentHeading) currentParagraph.heading = currentHeading
      paragraphs.push(currentParagraph)
    }
    currentParagraph = { runs: [] }
    currentAlignment = undefined
    currentHeading = undefined
  }

  function processNode(node: Node, inheritedHeading?: "h1" | "h2" | "h3"): void {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || ""
      const cleanText = text.replace(new RegExp(WJ, "g"), "")
      if (cleanText) {
        const styles = getCurrentStyles(node)
        currentParagraph.runs.push({ text: cleanText, ...styles })
      }
      return
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return

    const el = node as HTMLElement
    const tagName = el.tagName.toLowerCase()

    if (el.classList.contains("break-marker")) {
      if (currentParagraph.runs.length > 0) {
        const lastRun = currentParagraph.runs[currentParagraph.runs.length - 1]
        lastRun.text += ZWSP
      }
      return
    }

    if (el.classList.contains("text-3xl")) currentHeading = "h1"
    else if (el.classList.contains("text-2xl")) currentHeading = "h2"
    else if (el.classList.contains("text-xl")) currentHeading = "h3"

    if (tagName === "br") {
      finishParagraph()
      return
    }

    if (tagName === "h1" || tagName === "h2" || tagName === "h3") {
      finishParagraph()
      currentHeading = tagName as "h1" | "h2" | "h3"
      el.childNodes.forEach((child) => processNode(child, tagName as "h1" | "h2" | "h3"))
      finishParagraph()
      return
    }

    if (tagName === "p" || tagName === "div") {
      const hadContent = currentParagraph.runs.length > 0
      if (hadContent) finishParagraph()
      if (inheritedHeading) currentHeading = inheritedHeading
      el.childNodes.forEach((child) => processNode(child, inheritedHeading))
      if (currentParagraph.runs.length > 0) finishParagraph()
      return
    }

    if (tagName === "ul") {
      finishParagraph()
      processListItems(el, "bullet")
      return
    }

    if (tagName === "ol") {
      finishParagraph()
      processListItems(el, "numbered")
      return
    }

    el.childNodes.forEach((child) => processNode(child, inheritedHeading))
  }

  function processListItems(list: HTMLElement, listType: "bullet" | "numbered", level = 0): void {
    const items = list.querySelectorAll(":scope > li")
    items.forEach((li) => {
      currentParagraph = { runs: [], listType, listLevel: level }
      li.childNodes.forEach((child) => {
        if (child.nodeType === Node.ELEMENT_NODE) {
          const childEl = child as HTMLElement
          if (childEl.tagName === "UL") {
            finishParagraph()
            processListItems(childEl, "bullet", level + 1)
            return
          } else if (childEl.tagName === "OL") {
            finishParagraph()
            processListItems(childEl, "numbered", level + 1)
            return
          }
        }
        processNode(child)
      })
      finishParagraph()
    })
  }

  element.childNodes.forEach((child) => processNode(child))

  if (paragraphs.length === 0 && element.textContent) {
    const text = element.textContent.replace(new RegExp(WJ, "g"), "")
    if (text.trim()) paragraphs.push({ runs: [{ text }] })
  }

  debugLog("ODT Export Lexical - Total paragraphs:", paragraphs.length)
  return paragraphs
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

const fontSizeMap: Record<string, string> = {
  "1": "8pt",
  "2": "10pt",
  "3": "12pt",
  "4": "14pt",
  "5": "18pt",
  "6": "24pt",
  "7": "32pt",
}

/**
 * ============================================================================
 * CRITICAL ODT/ODF FONT CONFIGURATION - READ BEFORE MODIFYING
 * ============================================================================
 * 
 * These constants control font rendering in LibreOffice/OpenOffice.
 * Getting this wrong = font won't display, even though the ODT "looks" correct.
 * 
 * RULE 1: Font Face Name MUST include the "1" suffix
 * ------------------------------------------------
 * KHMER_FONT_FACE_NAME is used in style:name and style:font-name attributes.
 * It MUST be "Khmer Mondulkiri1" (with the "1" at the end).
 * 
 * ❌ WRONG: const KHMER_FONT_FACE_NAME = "Khmer Mondulkiri"
 * ✅ CORRECT: const KHMER_FONT_FACE_NAME = "Khmer Mondulkiri1"
 * 
 * RULE 2: Font Family is the actual font family name (no suffix)
 * ---------------------------------------------------------------
 * KHMER_FONT_FAMILY is used in fo:font-family and svg:font-family attributes.
 * It should be "Khmer Mondulkiri" (WITHOUT the "1").
 * 
 * ✅ CORRECT: const KHMER_FONT_FAMILY = "Khmer Mondulkiri"
 * 
 * RULE 3: These MUST match in all font declarations
 * --------------------------------------------------
 * Both constants are used together in EVERY font style. They must be consistent:
 * 
 * <style:font-face 
 *   style:name="Khmer Mondulkiri1"        ← KHMER_FONT_FACE_NAME
 *   svg:font-family="Khmer Mondulkiri"    ← KHMER_FONT_FAMILY
 * />
 * <style:text-properties
 *   style:font-name="Khmer Mondulkiri1"   ← KHMER_FONT_FACE_NAME
 *   fo:font-family="Khmer Mondulkiri"     ← KHMER_FONT_FAMILY
 * />
 * 
 * WHY THIS MATTERS:
 * - ODF uses style:name as an internal reference ID
 * - style:font-name must match this ID exactly
 * - svg:font-family and fo:font-family reference the actual system font
 * - If these don't match, LibreOffice can't find the font and uses a fallback
 */
const KHMER_FONT_FACE_NAME = "Khmer Mondulkiri1"  // ← Must have "1" suffix!
const KHMER_FONT_FAMILY = "Khmer Mondulkiri"      // ← No "1" suffix here!

function generateContentXml(paragraphs: Paragraph[]): string {
  let bodyContent = ""
  let styleIndex = 1
  const textStyles: Map<string, string> = new Map()
  let paragraphStyleIndex = 1
  const paragraphStyles: Map<string, string> = new Map()

  function getTextStyleName(run: TextRun): string | null {
    const parts: string[] = []
    if (run.bold) parts.push("bold")
    if (run.italic) parts.push("italic")
    if (run.underline) parts.push("underline")
    if (run.strikethrough) parts.push("strike")
    if (run.highlight) parts.push("highlight")
    if (run.fontSize && run.fontSize !== "3") parts.push(`size${run.fontSize}`)

    if (parts.length === 0) return null

    const key = parts.sort().join("_")
    if (!textStyles.has(key)) {
      const styleName = `T${styleIndex++}`
      textStyles.set(key, styleName)
    }
    return textStyles.get(key)!
  }

  function getParagraphStyleName(para: Paragraph): string {
    if (para.heading) {
      return `Heading_20_${para.heading === "h1" ? "1" : para.heading === "h2" ? "2" : "3"}`
    }

    const alignment = para.alignment || "left"
    const key = `para_${alignment}`

    if (!paragraphStyles.has(key)) {
      const styleName = `P${paragraphStyleIndex++}`
      paragraphStyles.set(key, styleName)
    }
    return paragraphStyles.get(key)!
  }

  paragraphs.forEach((para) => {
    getParagraphStyleName(para)
    para.runs.forEach((run) => getTextStyleName(run))
  })

  let automaticStyles = ""

  /**
   * ============================================================================
   * CRITICAL: ODF ATTRIBUTE NAMING RULES
   * ============================================================================
   * 
   * ODF (OpenDocument Format) requires HYPHENATED attribute names, NOT camelCase.
   * LibreOffice will IGNORE attributes with wrong names, causing fonts to not display.
   * 
   * COMMON MISTAKES TO AVOID:
   * ❌ fo:fontFamily    → ✅ fo:font-family
   * ❌ fo:fontSize      → ✅ fo:font-size
   * ❌ fo:fontWeight    → ✅ fo:font-weight
   * ❌ fo:fontStyle     → ✅ fo:font-style
   * ❌ svg:fontFamily   → ✅ svg:font-family
   * 
   * WHY THIS HAPPENS:
   * - JavaScript/TypeScript uses camelCase (fontSize, fontFamily)
   * - XML/ODF uses kebab-case with hyphens (font-size, font-family)
   * - It's easy to accidentally type camelCase when working in JS/TS
   * - LibreOffice strictly follows the ODF spec and ignores invalid attributes
   * 
   * HOW TO VERIFY YOUR CODE IS CORRECT:
   * 1. Search this file for "fo:font" - should ONLY find hyphenated versions
   * 2. Search for "svg:font" - should ONLY find hyphenated versions
   * 3. Search for "fontFamily" or "fontSize" - should find ZERO matches in XML strings
   * 
   * TESTING YOUR EXPORTED ODT:
   * 1. Export a test document
   * 2. Unzip the .odt file (it's a ZIP archive)
   * 3. Check content.xml and styles.xml
   * 4. Search for "fontFamily" or "fontSize" in those files
   * 5. If you find ANY camelCase font attributes, the font WON'T work
   * 6. All font attributes MUST be hyphenated
   */

  textStyles.forEach((styleName, key) => {
    const parts = key.split("_")
    
    /**
     * CRITICAL: NO EXTRA QUOTES IN FONT FAMILY VALUES
     * ------------------------------------------------
     * The font family value should be:
     * ✅ CORRECT: fo:font-family="Khmer Mondulkiri"
     * ❌ WRONG:   fo:font-family="'Khmer Mondulkiri'"  ← Extra quotes inside!
     * 
     * The template literal ${KHMER_FONT_FAMILY} is already inside double quotes.
     * Don't add single quotes around it like this: '${KHMER_FONT_FAMILY}'
     * 
     * WHY: The nested quotes can cause font name matching to fail.
     * LibreOffice might look for a font literally named "'Khmer Mondulkiri'"
     * instead of "Khmer Mondulkiri", and won't find it.
     */
    const attrs: string[] = [
      `fo:font-family="${KHMER_FONT_FAMILY}"`,              // ✅ No extra quotes
      `style:font-name="${KHMER_FONT_FACE_NAME}"`,
      `style:font-name-complex="${KHMER_FONT_FACE_NAME}"`, // For complex scripts like Khmer
    ]

    parts.forEach((part) => {
      if (part === "bold") {
        // REMEMBER: fo:font-weight (hyphenated), NOT fo:fontWeight
        attrs.push(`fo:font-weight="bold" style:font-weight-complex="bold"`)
      }
      if (part === "italic") {
        // REMEMBER: fo:font-style (hyphenated), NOT fo:fontStyle
        attrs.push(`fo:font-style="italic" style:font-style-complex="italic"`)
      }
      if (part === "underline") {
        attrs.push(
          `style:text-underline-style="solid" style:text-underline-width="auto" style:text-underline-color="font-color"`,
        )
      }
      if (part === "strike") {
        attrs.push(`style:text-line-through-style="solid"`)
      }
      if (part === "highlight") {
        attrs.push(`fo:background-color="#ffff00"`)
      }
      if (part.startsWith("size")) {
        const sizeNum = part.replace("size", "")
        const size = fontSizeMap[sizeNum] || "12pt"
        // REMEMBER: fo:font-size (hyphenated), NOT fo:fontSize
        attrs.push(`fo:font-size="${size}" style:font-size-complex="${size}"`)
      }
    })

    automaticStyles += `    <style:style style:name="${styleName}" style:family="text">
      <style:text-properties ${attrs.join(" ")}/>
    </style:style>\n`
  })

  paragraphStyles.forEach((styleName, key) => {
    const alignment = key.replace("para_", "")
    let alignAttr = ""
    if (alignment === "center") alignAttr = 'fo:text-align="center"'
    else if (alignment === "right") alignAttr = 'fo:text-align="end"'
    else if (alignment === "justify") alignAttr = 'fo:text-align="justify"'

    /**
     * PARAGRAPH STYLES: Same rules apply here
     * - Use hyphenated attributes (fo:font-family, fo:font-size)
     * - No extra quotes around font family
     * - Include both style:font-name and style:font-name-complex
     */
    automaticStyles += `    <style:style style:name="${styleName}" style:family="paragraph" style:parent-style-name="Text_20_body">
      ${alignAttr ? `<style:paragraph-properties ${alignAttr}/>` : ""}
      <style:text-properties 
        fo:font-family="${KHMER_FONT_FAMILY}"
        style:font-name="${KHMER_FONT_FACE_NAME}"
        style:font-name-complex="${KHMER_FONT_FACE_NAME}"
        fo:font-size="12pt"
        style:font-size-complex="12pt"/>
    </style:style>\n`
  })

  paragraphs.forEach((para) => {
    if (para.listType) {
      const listStyleName = para.listType === "bullet" ? "L1" : "L2"
      bodyContent += `<text:list text:style-name="${listStyleName}"><text:list-item>`
      bodyContent += `<text:p text:style-name="${getParagraphStyleName(para)}">`
    } else if (para.heading) {
      const level = para.heading === "h1" ? "1" : para.heading === "h2" ? "2" : "3"
      const styleName = `Heading_20_${level}`
      bodyContent += `<text:h text:style-name="${styleName}" text:outline-level="${level}">`
    } else {
      bodyContent += `<text:p text:style-name="${getParagraphStyleName(para)}">`
    }

    para.runs.forEach((run) => {
      const textContent = escapeXml(run.text)
      const textStyleName = getTextStyleName(run)

      if (textStyleName) bodyContent += `<text:span text:style-name="${textStyleName}">${textContent}</text:span>`
      else bodyContent += textContent
    })

    if (para.listType) bodyContent += `</text:p></text:list-item></text:list>`
    else if (para.heading) bodyContent += `</text:h>`
    else bodyContent += `</text:p>`
  })

  /**
   * FONT-FACE DECLARATION IN content.xml
   * -------------------------------------
   * This declares the font for use in automatic styles.
   * MUST use:
   * - style:name="${KHMER_FONT_FACE_NAME}" (with "1")
   * - svg:font-family="${KHMER_FONT_FAMILY}" (no "1", no extra quotes, HYPHENATED)
   */
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content 
    xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" 
    xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" 
    xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" 
    xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
    xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"
    office:version="1.3">
  <office:font-face-decls>
    <style:font-face style:name="${KHMER_FONT_FACE_NAME}" svg:font-family="${KHMER_FONT_FAMILY}" style:font-pitch="variable"/>
  </office:font-face-decls>
  <office:automatic-styles>
${automaticStyles}
    <text:list-style style:name="L1">
      <text:list-level-style-bullet text:level="1" text:bullet-char="•">
        <style:list-level-properties text:list-level-position-and-space-mode="label-alignment">
          <style:list-level-label-alignment text:label-followed-by="listtab" fo:margin-left="1.27cm" fo:text-indent="-0.635cm"/>
        </style:list-level-properties>
      </text:list-level-style-bullet>
    </text:list-style>
    <text:list-style style:name="L2">
      <text:list-level-style-number text:level="1" style:num-format="1" style:num-suffix=".">
        <style:list-level-properties text:list-level-position-and-space-mode="label-alignment">
          <style:list-level-label-alignment text:label-followed-by="listtab" fo:margin-left="1.27cm" fo:text-indent="-0.635cm"/>
        </style:list-level-properties>
      </text:list-level-style-number>
    </text:list-style>
  </office:automatic-styles>
  <office:body>
    <office:text>
${bodyContent}
    </office:text>
  </office:body>
</office:document-content>`
}

function generateStylesXml(): string {
  /**
   * styles.xml - Document-wide Style Definitions
   * ==============================================
   * Same rules apply here as in content.xml:
   * 1. Use hyphenated attributes (fo:font-family, fo:font-size, fo:font-weight, fo:font-style)
   * 2. No extra quotes around font family values
   * 3. Include both style:font-name and style:font-name-complex
   * 4. Font face name must have "1" suffix
   */
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document-styles 
    xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" 
    xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" 
    xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
    xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"
    office:version="1.3">
  <office:font-face-decls>
    <style:font-face style:name="${KHMER_FONT_FACE_NAME}" svg:font-family="${KHMER_FONT_FAMILY}" style:font-pitch="variable"/>
  </office:font-face-decls>
  <office:styles>
    <style:style style:name="Standard" style:family="paragraph" style:class="text">
      <style:text-properties 
        fo:font-family="${KHMER_FONT_FAMILY}"
        style:font-name="${KHMER_FONT_FACE_NAME}"
        style:font-name-complex="${KHMER_FONT_FACE_NAME}"
        fo:font-size="12pt"
        style:font-size-complex="12pt"/>
    </style:style>

    <style:style style:name="Text_20_body" style:display-name="Text body" style:family="paragraph" style:parent-style-name="Standard" style:class="text">
      <style:paragraph-properties fo:margin-top="0cm" fo:margin-bottom="0.25cm"/>
      <style:text-properties 
        fo:font-family="${KHMER_FONT_FAMILY}"
        style:font-name="${KHMER_FONT_FACE_NAME}"
        style:font-name-complex="${KHMER_FONT_FACE_NAME}"
        fo:font-size="12pt"
        style:font-size-complex="12pt"/>
    </style:style>

    <style:style style:name="Heading" style:family="paragraph" style:parent-style-name="Standard" style:class="text">
      <style:paragraph-properties fo:margin-top="0.423cm" fo:margin-bottom="0.212cm" fo:keep-with-next="always"/>
      <style:text-properties 
        fo:font-family="${KHMER_FONT_FAMILY}"
        style:font-name="${KHMER_FONT_FACE_NAME}"
        style:font-name-complex="${KHMER_FONT_FACE_NAME}"
        fo:font-size="14pt" 
        fo:font-weight="bold"
        style:font-size-complex="14pt"
        style:font-weight-complex="bold"/>
    </style:style>

    <style:style style:name="Heading_20_1" style:display-name="Heading 1" style:family="paragraph" style:parent-style-name="Heading" style:next-style-name="Text_20_body" style:class="text" style:default-outline-level="1">
      <style:text-properties 
        fo:font-family="${KHMER_FONT_FAMILY}"
        style:font-name="${KHMER_FONT_FACE_NAME}"
        style:font-name-complex="${KHMER_FONT_FACE_NAME}"
        fo:font-size="24pt" 
        fo:font-weight="bold"
        style:font-size-complex="24pt"
        style:font-weight-complex="bold"/>
    </style:style>

    <style:style style:name="Heading_20_2" style:display-name="Heading 2" style:family="paragraph" style:parent-style-name="Heading" style:next-style-name="Text_20_body" style:class="text" style:default-outline-level="2">
      <style:text-properties 
        fo:font-family="${KHMER_FONT_FAMILY}"
        style:font-name="${KHMER_FONT_FACE_NAME}"
        style:font-name-complex="${KHMER_FONT_FACE_NAME}"
        fo:font-size="18pt" 
        fo:font-weight="bold"
        style:font-size-complex="18pt"
        style:font-weight-complex="bold"/>
    </style:style>

    <style:style style:name="Heading_20_3" style:display-name="Heading 3" style:family="paragraph" style:parent-style-name="Heading" style:next-style-name="Text_20_body" style:class="text" style:default-outline-level="3">
      <style:text-properties 
        fo:font-family="${KHMER_FONT_FAMILY}"
        style:font-name="${KHMER_FONT_FACE_NAME}"
        style:font-name-complex="${KHMER_FONT_FACE_NAME}"
        fo:font-size="14pt" 
        fo:font-weight="bold"
        style:font-size-complex="14pt"
        style:font-weight-complex="bold"/>
    </style:style>
  </office:styles>
</office:document-styles>`
}

function generateMetaXml(): string {
  const now = new Date().toISOString()
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document-meta xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0" office:version="1.2">
  <office:meta>
    <dc:title>Aksara Document</dc:title>
    <meta:generator>Aksara Khmer Word Processor</meta:generator>
    <meta:creation-date>${now}</meta:creation-date>
    <dc:date>${now}</dc:date>
  </office:meta>
</office:document-meta>`
}

function generateManifestXml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2">
  <manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.text"/>
  <manifest:file-entry manifest:full-path="mimetype" manifest:media-type="text/plain"/>
  <manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>
  <manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>
  <manifest:file-entry manifest:full-path="meta.xml" manifest:media-type="text/xml"/>
</manifest:manifest>`
}

export async function exportToOdtFromLexical(editorElement: HTMLElement, filename = "document.odt"): Promise<void> {
  debugLog("ODT Export Lexical - Starting export")
  const paragraphs = parseEditorContent(editorElement)

  const zip = new JSZip()

  zip.file("mimetype", "application/vnd.oasis.opendocument.text", { compression: "STORE" })
  zip.file("content.xml", generateContentXml(paragraphs))
  zip.file("styles.xml", generateStylesXml())
  zip.file("meta.xml", generateMetaXml())
  zip.file("META-INF/manifest.xml", generateManifestXml())

  const blob = await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.oasis.opendocument.text",
  })

  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  debugLog("ODT Export Lexical - Export complete")
}

/**
 * ============================================================================
 * QUICK REFERENCE: ODT FONT DEBUGGING CHECKLIST
 * ============================================================================
 * 
 * If fonts aren't displaying correctly in exported ODT files, check these:
 * 
 * □ 1. Font constants are correct:
 *      - KHMER_FONT_FACE_NAME = "Khmer Mondulkiri1" (WITH "1")
 *      - KHMER_FONT_FAMILY = "Khmer Mondulkiri" (WITHOUT "1")
 * 
 * □ 2. All ODF attributes are HYPHENATED (not camelCase):
 *      Search entire file for these WRONG patterns:
 *      - "fo:fontFamily"  ← Should be "fo:font-family"
 *      - "fo:fontSize"    ← Should be "fo:font-size"
 *      - "fo:fontWeight"  ← Should be "fo:font-weight"
 *      - "fo:fontStyle"   ← Should be "fo:font-style"
 *      - "svg:fontFamily" ← Should be "svg:font-family"
 * 
 * □ 3. No extra quotes in font family values:
 *      ❌ WRONG: fo:font-family="'Khmer Mondulkiri'"
 *      ✅ RIGHT: fo:font-family="Khmer Mondulkiri"
 * 
 * □ 4. Complex script support is included:
 *      Every font declaration should have:
 *      - style:font-name-complex="${KHMER_FONT_FACE_NAME}"
 *      - style:font-size-complex="..."
 *      - style:font-weight-complex="..." (for bold)
 *      - style:font-style-complex="..." (for italic)
 * 
 * □ 5. Test the exported file:
 *      - Unzip the .odt file
 *      - Open content.xml and styles.xml in a text editor
 *      - Search for "fontFamily" or "fontSize" (camelCase)
 *      - If you find ANY, the font WON'T work
 *      - All font attributes MUST be hyphenated
 * 
 * □ 6. Verify in LibreOffice:
 *      - Open the exported ODT in LibreOffice
 *      - Click on text and check Format → Character
 *      - Font should show "Khmer Mondulkiri"
 *      - If it shows a different font, check steps 1-5 above
 */
