/**
 * Image Compression Utilities
 *
 * Utilities for compressing and optimizing images for document management
 * Uses Sharp for high-performance image processing
 */

import * as sharp from 'sharp'

export interface CompressionOptions {
  quality?: number // 1-100, default 80
  maxWidth?: number // Max width in pixels, default 1200
  maxHeight?: number // Max height in pixels, default 1200
  format?: 'jpeg' | 'png' | 'webp' // Output format, default jpeg
}

export interface ThumbnailOptions {
  width?: number // Thumbnail width, default 200
  height?: number // Thumbnail height, default 200
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside' // Default 'cover'
  quality?: number // 1-100, default 60
}

/**
 * Compress an image file for storage
 *
 * @param buffer - Input image buffer
 * @param options - Compression options
 * @returns Compressed image buffer
 *
 * @example
 * const compressed = await compressImage(fileBuffer, { quality: 80, maxWidth: 1200 })
 */
export async function compressImage(
  buffer: Buffer,
  options: CompressionOptions = {}
): Promise<Buffer> {
  const {
    quality = 80,
    maxWidth = 1200,
    maxHeight = 1200,
    format = 'jpeg'
  } = options

  let image = sharp(buffer)

  // Get metadata to check dimensions
  const metadata = await image.metadata()

  // Resize if image is larger than max dimensions
  if (
    metadata.width &&
    metadata.height &&
    (metadata.width > maxWidth || metadata.height > maxHeight)
  ) {
    image = image.resize(maxWidth, maxHeight, {
      fit: 'inside',
      withoutEnlargement: true
    })
  }

  // Compress based on format
  switch (format) {
    case 'jpeg':
      image = image.jpeg({
        quality,
        mozjpeg: true // Use mozjpeg for better compression
      })
      break

    case 'png':
      image = image.png({
        quality,
        compressionLevel: 9
      })
      break

    case 'webp':
      image = image.webp({
        quality
      })
      break
  }

  return image.toBuffer()
}

/**
 * Generate a thumbnail from an image
 *
 * @param buffer - Input image buffer
 * @param options - Thumbnail options
 * @returns Thumbnail image buffer (JPEG format)
 *
 * @example
 * const thumbnail = await generateThumbnail(fileBuffer, { width: 200, height: 200 })
 */
export async function generateThumbnail(
  buffer: Buffer,
  options: ThumbnailOptions = {}
): Promise<Buffer> {
  const {
    width = 200,
    height = 200,
    fit = 'cover',
    quality = 60
  } = options

  return sharp(buffer)
    .resize(width, height, {
      fit,
      position: 'center'
    })
    .jpeg({
      quality,
      mozjpeg: true
    })
    .toBuffer()
}

/**
 * Get image metadata without loading the full image
 *
 * @param buffer - Input image buffer
 * @returns Image metadata (width, height, format, size)
 *
 * @example
 * const metadata = await getImageMetadata(fileBuffer)
 * console.log(`${metadata.width}x${metadata.height} ${metadata.format}`)
 */
export async function getImageMetadata(buffer: Buffer) {
  const metadata = await sharp(buffer).metadata()

  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
    format: metadata.format || 'unknown',
    size: buffer.length,
    hasAlpha: metadata.hasAlpha || false,
    orientation: metadata.orientation
  }
}

/**
 * Convert PDF first page to image
 *
 * Note: This is a placeholder. For actual PDF to image conversion,
 * you'll need a library like pdf-poppler or pdf.js in Week 2
 *
 * @param pdfBuffer - Input PDF buffer
 * @returns Image buffer of first page
 */
export async function pdfToImage(pdfBuffer: Buffer): Promise<Buffer> {
  // TODO: Implement in Week 2 with pdf-poppler or similar
  // For now, return a placeholder
  throw new Error('PDF to image conversion not yet implemented. Will be added in Week 2.')
}

/**
 * Validate if buffer is a valid image
 *
 * @param buffer - Input buffer
 * @returns True if valid image format
 *
 * @example
 * const isValid = await isValidImage(fileBuffer)
 */
export async function isValidImage(buffer: Buffer): Promise<boolean> {
  try {
    const metadata = await sharp(buffer).metadata()
    return !!metadata.format
  } catch {
    return false
  }
}

/**
 * Get optimal compression quality based on file size
 *
 * Smaller files get less aggressive compression to maintain quality
 * Larger files get more aggressive compression to save storage
 *
 * @param sizeBytes - File size in bytes
 * @returns Recommended quality (1-100)
 */
export function getOptimalQuality(sizeBytes: number): number {
  const sizeMB = sizeBytes / (1024 * 1024)

  if (sizeMB < 0.5) return 90 // Small files: preserve quality
  if (sizeMB < 1) return 85
  if (sizeMB < 2) return 80
  if (sizeMB < 5) return 75
  return 70 // Large files: aggressive compression
}

/**
 * Calculate storage savings from compression
 *
 * @param originalSize - Original file size in bytes
 * @param compressedSize - Compressed file size in bytes
 * @returns Savings percentage and bytes saved
 */
export function calculateSavings(originalSize: number, compressedSize: number) {
  const bytesSaved = originalSize - compressedSize
  const percentSaved = Math.round((bytesSaved / originalSize) * 100)

  return {
    bytesSaved,
    percentSaved,
    originalSizeMB: Math.round((originalSize / (1024 * 1024)) * 100) / 100,
    compressedSizeMB: Math.round((compressedSize / (1024 * 1024)) * 100) / 100
  }
}

/**
 * Batch compress multiple images with progress callback
 *
 * @param buffers - Array of image buffers
 * @param options - Compression options
 * @param onProgress - Progress callback (current, total)
 * @returns Array of compressed buffers
 */
export async function batchCompressImages(
  buffers: Buffer[],
  options: CompressionOptions = {},
  onProgress?: (current: number, total: number) => void
): Promise<Buffer[]> {
  const results: Buffer[] = []

  for (let i = 0; i < buffers.length; i++) {
    const compressed = await compressImage(buffers[i], options)
    results.push(compressed)

    if (onProgress) {
      onProgress(i + 1, buffers.length)
    }
  }

  return results
}
