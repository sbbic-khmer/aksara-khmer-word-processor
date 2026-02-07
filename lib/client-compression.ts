/**
 * Client-side compression using the browser's CompressionStream API.
 * Produces the same "gzip:" prefixed base64 format as the server's
 * compressString() in lib/compression.ts.
 */

const COMPRESSED_PREFIX = "gzip:"

/**
 * Compress a string using the browser's CompressionStream (gzip) and
 * return a "gzip:" prefixed base64 string — the same format the server
 * produces and expects.
 *
 * Falls back to returning the uncompressed string if CompressionStream
 * is not available (older browsers).
 */
export async function compressStringClient(data: string): Promise<string> {
  if (typeof CompressionStream === "undefined") {
    return data
  }

  try {
    const encoder = new TextEncoder()
    const inputBytes = encoder.encode(data)

    const cs = new CompressionStream("gzip")
    const writer = cs.writable.getWriter()
    writer.write(inputBytes)
    writer.close()

    const reader = cs.readable.getReader()
    const chunks: Uint8Array[] = []
    let totalLength = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      totalLength += value.length
    }

    // Combine chunks into a single Uint8Array
    const combined = new Uint8Array(totalLength)
    let offset = 0
    for (const chunk of chunks) {
      combined.set(chunk, offset)
      offset += chunk.length
    }

    // Convert to base64
    let binary = ""
    for (let i = 0; i < combined.length; i++) {
      binary += String.fromCharCode(combined[i])
    }
    const base64 = btoa(binary)

    return COMPRESSED_PREFIX + base64
  } catch {
    // If compression fails for any reason, return uncompressed
    return data
  }
}
