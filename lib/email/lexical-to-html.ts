/**
 * Converts Lexical editor state to email-safe HTML
 *
 * Email HTML Requirements:
 * - Inline CSS styles (no external stylesheets)
 * - Table-based layout for older email clients
 * - Absolute URLs for images
 * - Web-safe fonts with fallbacks
 */

interface LexicalTextNode {
  type: 'text'
  text: string
  format: number
  style?: string
}

interface LexicalParagraphNode {
  type: 'paragraph'
  children: LexicalNode[]
  format?: string
  indent?: number
}

interface LexicalHeadingNode {
  type: 'heading'
  tag: 'h1' | 'h2' | 'h3'
  children: LexicalNode[]
}

interface LexicalListNode {
  type: 'list'
  listType: 'bullet' | 'number'
  children: LexicalNode[]
}

interface LexicalListItemNode {
  type: 'listitem'
  children: LexicalNode[]
}

interface LexicalLinkNode {
  type: 'link'
  url: string
  children: LexicalNode[]
}

interface LexicalImageNode {
  type: 'image'
  src: string
  altText?: string
  width?: number
  height?: number
}

interface LexicalLineBreakNode {
  type: 'linebreak'
}

type LexicalNode =
  | LexicalTextNode
  | LexicalParagraphNode
  | LexicalHeadingNode
  | LexicalListNode
  | LexicalListItemNode
  | LexicalLinkNode
  | LexicalImageNode
  | LexicalLineBreakNode
  | { type: string; children?: LexicalNode[] }

interface EditorState {
  root: {
    children: LexicalNode[]
  }
}

// Text format flags from Lexical
const IS_BOLD = 1
const IS_ITALIC = 2
const IS_UNDERLINE = 8
const IS_STRIKETHROUGH = 4

// Email-safe font stack
const FONT_FAMILY = "'Khmer OS Battambang', 'Khmer OS', Arial, sans-serif"

// Base styles for email
const BASE_STYLES = {
  paragraph: `margin: 0 0 16px 0; line-height: 1.6; font-family: ${FONT_FAMILY}; font-size: 16px; color: #333333;`,
  h1: `margin: 0 0 20px 0; font-family: ${FONT_FAMILY}; font-size: 28px; font-weight: bold; color: #1a1a1a; line-height: 1.3;`,
  h2: `margin: 0 0 16px 0; font-family: ${FONT_FAMILY}; font-size: 24px; font-weight: bold; color: #1a1a1a; line-height: 1.3;`,
  h3: `margin: 0 0 14px 0; font-family: ${FONT_FAMILY}; font-size: 20px; font-weight: bold; color: #1a1a1a; line-height: 1.3;`,
  link: `color: #2563eb; text-decoration: underline;`,
  list: `margin: 0 0 16px 0; padding-left: 24px; font-family: ${FONT_FAMILY}; font-size: 16px; color: #333333;`,
  listItem: `margin: 0 0 8px 0; line-height: 1.6;`,
  image: `max-width: 100%; height: auto; display: block; margin: 16px 0;`,
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function formatText(node: LexicalTextNode): string {
  let text = escapeHtml(node.text)
  const format = node.format || 0

  if (format & IS_BOLD) {
    text = `<strong>${text}</strong>`
  }
  if (format & IS_ITALIC) {
    text = `<em>${text}</em>`
  }
  if (format & IS_UNDERLINE) {
    text = `<u>${text}</u>`
  }
  if (format & IS_STRIKETHROUGH) {
    text = `<s>${text}</s>`
  }

  return text
}

function serializeNode(node: LexicalNode): string {
  switch (node.type) {
    case 'text':
      return formatText(node as LexicalTextNode)

    case 'linebreak':
      return '<br>'

    case 'paragraph': {
      const paragraphNode = node as LexicalParagraphNode
      const children = paragraphNode.children?.map(serializeNode).join('') || ''
      let style = BASE_STYLES.paragraph

      // Handle text alignment
      if (paragraphNode.format === 'center') {
        style += ' text-align: center;'
      } else if (paragraphNode.format === 'right') {
        style += ' text-align: right;'
      } else if (paragraphNode.format === 'justify') {
        style += ' text-align: justify;'
      }

      return `<p style="${style}">${children}</p>`
    }

    case 'heading': {
      const headingNode = node as LexicalHeadingNode
      const children = headingNode.children?.map(serializeNode).join('') || ''
      const tag = headingNode.tag || 'h2'
      const style = BASE_STYLES[tag] || BASE_STYLES.h2
      return `<${tag} style="${style}">${children}</${tag}>`
    }

    case 'list': {
      const listNode = node as LexicalListNode
      const children = listNode.children?.map(serializeNode).join('') || ''
      const tag = listNode.listType === 'number' ? 'ol' : 'ul'
      return `<${tag} style="${BASE_STYLES.list}">${children}</${tag}>`
    }

    case 'listitem': {
      const listItemNode = node as LexicalListItemNode
      const children = listItemNode.children?.map(serializeNode).join('') || ''
      return `<li style="${BASE_STYLES.listItem}">${children}</li>`
    }

    case 'link': {
      const linkNode = node as LexicalLinkNode
      const children = linkNode.children?.map(serializeNode).join('') || ''
      const url = escapeHtml(linkNode.url || '#')
      return `<a href="${url}" style="${BASE_STYLES.link}" target="_blank">${children}</a>`
    }

    case 'image': {
      const imageNode = node as LexicalImageNode
      const src = escapeHtml(imageNode.src || '')
      const alt = escapeHtml(imageNode.altText || '')
      let style = BASE_STYLES.image
      if (imageNode.width) {
        style += ` width: ${imageNode.width}px;`
      }
      return `<img src="${src}" alt="${alt}" style="${style}" />`
    }

    default:
      // Handle unknown nodes with children
      if ('children' in node && Array.isArray(node.children)) {
        return node.children.map(serializeNode).join('')
      }
      return ''
  }
}

/**
 * Convert Lexical editor state JSON to email-safe HTML
 */
export function lexicalToEmailHtml(editorStateJson: string | null): string {
  if (!editorStateJson) {
    return ''
  }

  try {
    const editorState: EditorState = JSON.parse(editorStateJson)
    const content = editorState.root?.children?.map(serializeNode).join('') || ''

    // Wrap in email-safe container
    return `
<!DOCTYPE html>
<html lang="km">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Email</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: ${FONT_FAMILY};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px;">
              ${content}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim()
  } catch (error) {
    console.error('Error converting Lexical to HTML:', error)
    return ''
  }
}

/**
 * Convert Lexical editor state JSON to plain text (for email preview)
 */
export function lexicalToPlainText(editorStateJson: string | null): string {
  if (!editorStateJson) {
    return ''
  }

  try {
    const editorState: EditorState = JSON.parse(editorStateJson)

    function extractText(node: LexicalNode): string {
      if (node.type === 'text') {
        return (node as LexicalTextNode).text
      }
      if (node.type === 'linebreak') {
        return '\n'
      }
      if ('children' in node && Array.isArray(node.children)) {
        const childText = node.children.map(extractText).join('')
        // Add newline after block elements
        if (['paragraph', 'heading', 'listitem'].includes(node.type)) {
          return childText + '\n'
        }
        return childText
      }
      return ''
    }

    return editorState.root?.children?.map(extractText).join('').trim() || ''
  } catch (error) {
    console.error('Error converting Lexical to plain text:', error)
    return ''
  }
}
