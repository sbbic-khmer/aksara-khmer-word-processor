import { type NextRequest, NextResponse } from "next/server"
import JSZip from "jszip"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth-server"
import { decompressString, isCompressed } from "@/lib/compression"

/**
 * POST /api/user/export
 *
 * Exports all user data as a downloadable ZIP file.
 * Fulfills GDPR Article 15 (right of access) requirements.
 *
 * ZIP structure:
 * aksara-export-{date}/
 * ├── profile.json
 * ├── preferences.json
 * ├── documents/
 * │   ├── {doc-id}.json
 * │   ├── {doc-id}.odt
 * │   └── ...
 * ├── dictionary/
 * │   ├── added-words.json
 * │   ├── ignored-words.json
 * │   ├── spell-check-added.json
 * │   └── spell-check-ignored.json
 * └── replacements.json
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const zip = new JSZip()
    const exportDate = new Date().toISOString().split("T")[0]
    const folderName = `aksara-export-${exportDate}`

    // 1. Profile data
    const profile = {
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      exportedAt: new Date().toISOString(),
    }
    zip.file(`${folderName}/profile.json`, JSON.stringify(profile, null, 2))

    // 2. Preferences
    const preferences = await prisma.userPreference.findUnique({
      where: { userId: user.id },
      select: {
        vadSilenceThreshold: true,
        vadThreshold: true,
        preferredMicDeviceId: true,
        sttProvider: true,
        showBreaks: true,
        theme: true,
        lastOpenedDocumentId: true,
        locale: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    zip.file(
      `${folderName}/preferences.json`,
      JSON.stringify(preferences || {}, null, 2)
    )

    // 3. Documents
    const documents = await prisma.document.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        title: true,
        content: true,
        editorState: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    const documentsFolder = zip.folder(`${folderName}/documents`)

    for (const doc of documents) {
      // Decompress editorState if needed
      let editorStateData = doc.editorState
      if (typeof editorStateData === "string" && isCompressed(editorStateData)) {
        try {
          const decompressed = decompressString(editorStateData)
          editorStateData = JSON.parse(decompressed)
        } catch {
          // Keep as-is if decompression fails
        }
      }

      // JSON export
      const docJson = {
        id: doc.id,
        title: doc.title,
        content: doc.content,
        editorState: editorStateData,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      }
      documentsFolder?.file(`${doc.id}.json`, JSON.stringify(docJson, null, 2))

      // ODT export (simplified server-side version)
      try {
        const odtBuffer = await generateSimpleOdt(doc.title, doc.content)
        documentsFolder?.file(`${doc.id}.odt`, odtBuffer)
      } catch (odtError) {
        // If ODT generation fails, add error note to JSON
        const errorNote = {
          ...docJson,
          _odtExportError: odtError instanceof Error ? odtError.message : "ODT export failed",
        }
        documentsFolder?.file(`${doc.id}.json`, JSON.stringify(errorNote, null, 2))
      }
    }

    // 4. Dictionary data
    const dictionaryFolder = zip.folder(`${folderName}/dictionary`)

    // Added words (word breaking)
    const addedWords = await prisma.userDictionaryWord.findMany({
      where: { userId: user.id },
      select: {
        word: true,
        frequency: true,
        notes: true,
        createdAt: true,
      },
    })
    dictionaryFolder?.file("added-words.json", JSON.stringify(addedWords, null, 2))

    // Ignored words (word breaking)
    const ignoredWords = await prisma.userIgnoredDictionaryWord.findMany({
      where: { userId: user.id },
      select: {
        word: true,
        createdAt: true,
      },
    })
    dictionaryFolder?.file("ignored-words.json", JSON.stringify(ignoredWords, null, 2))

    // Spell check added words
    const spellCheckAdded = await prisma.spellCheckAddedWord.findMany({
      where: { userId: user.id },
      select: {
        word: true,
        notes: true,
        createdAt: true,
      },
    })
    dictionaryFolder?.file("spell-check-added.json", JSON.stringify(spellCheckAdded, null, 2))

    // Spell check ignored words
    const spellCheckIgnored = await prisma.spellCheckIgnoredWord.findMany({
      where: { userId: user.id },
      select: {
        word: true,
        notes: true,
        createdAt: true,
      },
    })
    dictionaryFolder?.file("spell-check-ignored.json", JSON.stringify(spellCheckIgnored, null, 2))

    // 5. Replacements (voice-to-text)
    const replacements = await prisma.userReplacement.findMany({
      where: { userId: user.id },
      select: {
        incorrectWord: true,
        correctWord: true,
        notes: true,
        createdAt: true,
      },
    })
    zip.file(`${folderName}/replacements.json`, JSON.stringify(replacements, null, 2))

    // Generate ZIP
    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    })

    // Return as downloadable file
    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="aksara-export-${exportDate}.zip"`,
        "Content-Length": zipBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error("Error exporting user data:", error)
    return NextResponse.json(
      { error: "Failed to export user data" },
      { status: 500 }
    )
  }
}

/**
 * Generate a simple ODT file from plain text content.
 * This is a simplified server-side version that handles basic text.
 *
 * For full formatting, use the client-side exportToOdtFromLexical function.
 */
async function generateSimpleOdt(title: string, content: string): Promise<Buffer> {
  const odtZip = new JSZip()

  // Constants for Khmer font (must match client-side export)
  const KHMER_FONT_FACE_NAME = "Khmer Mondulkiri1"
  const KHMER_FONT_FAMILY = "Khmer Mondulkiri"

  // mimetype must be first and uncompressed
  odtZip.file("mimetype", "application/vnd.oasis.opendocument.text", {
    compression: "STORE",
  })

  // Process content - split by newlines and create paragraphs
  const paragraphs = content.split(/\n/).map((line) => escapeXml(line))

  const bodyContent = paragraphs
    .map((text) => `<text:p text:style-name="Text_20_body">${text}</text:p>`)
    .join("\n")

  // content.xml
  const contentXml = `<?xml version="1.0" encoding="UTF-8"?>
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
    <style:style style:name="Text_20_body" style:family="paragraph">
      <style:paragraph-properties fo:margin-top="0cm" fo:margin-bottom="0.25cm"/>
      <style:text-properties
        fo:font-family="${KHMER_FONT_FAMILY}"
        style:font-name="${KHMER_FONT_FACE_NAME}"
        style:font-name-complex="${KHMER_FONT_FACE_NAME}"
        fo:font-size="12pt"
        style:font-size-complex="12pt"/>
    </style:style>
  </office:automatic-styles>
  <office:body>
    <office:text>
${bodyContent}
    </office:text>
  </office:body>
</office:document-content>`

  odtZip.file("content.xml", contentXml)

  // styles.xml
  const stylesXml = `<?xml version="1.0" encoding="UTF-8"?>
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
  </office:styles>
</office:document-styles>`

  odtZip.file("styles.xml", stylesXml)

  // meta.xml
  const now = new Date().toISOString()
  const metaXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-meta xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0" office:version="1.2">
  <office:meta>
    <dc:title>${escapeXml(title)}</dc:title>
    <meta:generator>Aksara Pro Data Export</meta:generator>
    <meta:creation-date>${now}</meta:creation-date>
    <dc:date>${now}</dc:date>
  </office:meta>
</office:document-meta>`

  odtZip.file("meta.xml", metaXml)

  // manifest.xml
  const manifestXml = `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2">
  <manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.text"/>
  <manifest:file-entry manifest:full-path="mimetype" manifest:media-type="text/plain"/>
  <manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>
  <manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>
  <manifest:file-entry manifest:full-path="meta.xml" manifest:media-type="text/xml"/>
</manifest:manifest>`

  odtZip.file("META-INF/manifest.xml", manifestXml)

  return odtZip.generateAsync({
    type: "nodebuffer",
    mimeType: "application/vnd.oasis.opendocument.text",
  })
}

/**
 * Escape special XML characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}
