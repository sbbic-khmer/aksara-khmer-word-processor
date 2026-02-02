import { gzipSync, gunzipSync } from "zlib"

// Prefix to identify compressed data
const COMPRESSED_PREFIX = "gzip:"

/**
 * Compress a string using gzip and return base64-encoded result
 * Adds a prefix to identify compressed data for backwards compatibility
 */
export function compressString(data: string): string {
  const buffer = Buffer.from(data, "utf8")
  const compressed = gzipSync(buffer, { level: 6 }) // level 6 is good balance of speed/compression
  return COMPRESSED_PREFIX + compressed.toString("base64")
}

/**
 * Decompress a string that was compressed with compressString
 * If the data is not compressed (no prefix), returns it as-is for backwards compatibility
 */
export function decompressString(data: string): string {
  // Check if data is compressed (has our prefix)
  if (!data.startsWith(COMPRESSED_PREFIX)) {
    // Not compressed - return as-is (backwards compatibility with old documents)
    return data
  }

  // Remove prefix and decompress
  const base64Data = data.slice(COMPRESSED_PREFIX.length)
  const buffer = Buffer.from(base64Data, "base64")
  const decompressed = gunzipSync(buffer)
  return decompressed.toString("utf8")
}

/**
 * Check if a string is compressed
 */
export function isCompressed(data: string): boolean {
  return data.startsWith(COMPRESSED_PREFIX)
}

/**
 * Get compression stats for a string
 */
export function getCompressionStats(
  original: string,
  compressed: string
): { originalSize: number; compressedSize: number; ratio: number; savedBytes: number } {
  const originalSize = Buffer.byteLength(original, "utf8")
  const compressedSize = Buffer.byteLength(compressed, "utf8")
  const ratio = compressedSize / originalSize
  const savedBytes = originalSize - compressedSize

  return { originalSize, compressedSize, ratio, savedBytes }
}
