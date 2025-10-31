/**
 * OCR Service
 *
 * Optical Character Recognition service using Tesseract.js
 * Extracts text from images and PDFs for document processing
 */

import { createWorker, type Worker } from 'tesseract.js'

export interface OCRResult {
  success: boolean
  text: string
  confidence: number
  error?: string
  processingTime?: number
  language?: string
}

export interface OCROptions {
  language?: string // Default: 'eng'
  imagePreprocessing?: boolean // Default: true
}

// Cache worker instance for better performance
let workerInstance: Worker | null = null

/**
 * Get or create Tesseract worker instance
 *
 * Reuses existing worker to avoid initialization overhead
 * Worker is lazy-loaded on first OCR request
 */
async function getWorker(): Promise<Worker> {
  if (!workerInstance) {
    workerInstance = await createWorker('eng')
  }
  return workerInstance
}

/**
 * Terminate worker and clean up resources
 *
 * Should be called when OCR processing is complete
 * or during application shutdown
 */
export async function terminateOCRWorker(): Promise<void> {
  if (workerInstance) {
    await workerInstance.terminate()
    workerInstance = null
  }
}

/**
 * Extract text from image buffer using OCR
 *
 * @param imageBuffer - Image file buffer (JPEG, PNG, etc.)
 * @param options - OCR configuration options
 * @returns OCR result with extracted text and confidence
 *
 * @example
 * const result = await extractTextFromImage(fileBuffer)
 * if (result.success) {
 *   console.log('Extracted text:', result.text)
 *   console.log('Confidence:', result.confidence)
 * }
 */
export async function extractTextFromImage(
  imageBuffer: Buffer,
  options: OCROptions = {}
): Promise<OCRResult> {
  const startTime = Date.now()
  const { language = 'eng' } = options

  try {
    // Get worker instance
    const worker = await getWorker()

    // Set language if different from default
    if (language !== 'eng') {
      await worker.loadLanguage(language)
      await worker.initialize(language)
    }

    // Perform OCR
    const { data } = await worker.recognize(imageBuffer)

    const processingTime = Date.now() - startTime

    return {
      success: true,
      text: data.text.trim(),
      confidence: data.confidence,
      processingTime,
      language,
    }
  } catch (error) {
    console.error('OCR extraction failed:', error)
    return {
      success: false,
      text: '',
      confidence: 0,
      error: error instanceof Error ? error.message : 'OCR extraction failed',
      processingTime: Date.now() - startTime,
    }
  }
}

/**
 * Extract text from PDF (first page only)
 *
 * Note: For Week 1, we'll use a simple approach that converts
 * PDF first page to image, then runs OCR. In production, you might
 * want to use pdf.js or similar for better PDF text extraction.
 *
 * @param pdfBuffer - PDF file buffer
 * @param options - OCR configuration options
 * @returns OCR result with extracted text
 */
export async function extractTextFromPDF(
  pdfBuffer: Buffer,
  options: OCROptions = {}
): Promise<OCRResult> {
  // TODO: Implement PDF to image conversion
  // For now, return placeholder
  // This will be enhanced in Week 2 Day 2 if needed
  console.warn('PDF OCR not yet fully implemented - returning placeholder')

  return {
    success: false,
    text: '',
    confidence: 0,
    error: 'PDF OCR conversion not yet implemented. Will be added if needed.',
  }
}

/**
 * Extract text from document based on file type
 *
 * Routes to appropriate extraction method based on MIME type
 *
 * @param fileBuffer - File buffer
 * @param mimeType - MIME type of file
 * @param options - OCR configuration options
 * @returns OCR result with extracted text
 *
 * @example
 * const result = await extractTextFromDocument(buffer, 'image/jpeg')
 */
export async function extractTextFromDocument(
  fileBuffer: Buffer,
  mimeType: string,
  options: OCROptions = {}
): Promise<OCRResult> {
  // Route based on MIME type
  if (mimeType.startsWith('image/')) {
    return extractTextFromImage(fileBuffer, options)
  }

  if (mimeType === 'application/pdf') {
    return extractTextFromPDF(fileBuffer, options)
  }

  // Handle email files (.eml)
  if (mimeType === 'message/rfc822') {
    return extractTextFromEmail(fileBuffer)
  }

  return {
    success: false,
    text: '',
    confidence: 0,
    error: `Unsupported file type for OCR: ${mimeType}`,
  }
}

/**
 * Extract text from email files (.eml)
 *
 * Email files are plain text format, so we just need to parse them
 * to extract the body content
 *
 * @param fileBuffer - Email file buffer
 * @returns OCR result with extracted email text
 */
async function extractTextFromEmail(fileBuffer: Buffer): Promise<OCRResult> {
  try {
    const startTime = Date.now()

    // Convert buffer to string
    const emailContent = fileBuffer.toString('utf-8')

    // Simple email parsing - extract body after headers
    // Headers end with a blank line (double newline)
    const headerEndIndex = emailContent.indexOf('\n\n')
    const bodyStartIndex = headerEndIndex !== -1 ? headerEndIndex + 2 : 0

    // Extract subject line for better context
    const subjectMatch = emailContent.match(/^Subject: (.+)$/m)
    const subject = subjectMatch ? subjectMatch[1] : ''

    // Extract from line
    const fromMatch = emailContent.match(/^From: (.+)$/m)
    const from = fromMatch ? fromMatch[1] : ''

    // Extract date
    const dateMatch = emailContent.match(/^Date: (.+)$/m)
    const date = dateMatch ? dateMatch[1] : ''

    // Get body content
    let body = emailContent.substring(bodyStartIndex)

    // Clean up common email artifacts
    body = body
      .replace(/=\r?\n/g, '') // Remove soft line breaks
      .replace(/=([0-9A-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16))) // Decode quoted-printable
      .trim()

    // Combine extracted parts
    const extractedText = [
      subject && `Subject: ${subject}`,
      from && `From: ${from}`,
      date && `Date: ${date}`,
      '',
      body
    ].filter(Boolean).join('\n')

    const processingTime = Date.now() - startTime

    return {
      success: true,
      text: extractedText,
      confidence: 100, // Email is plain text, so confidence is 100%
      processingTime,
      language: 'eng'
    }
  } catch (error) {
    return {
      success: false,
      text: '',
      confidence: 0,
      error: error instanceof Error ? error.message : 'Failed to parse email'
    }
  }
}

/**
 * Preprocess text for better parsing
 *
 * Cleans up OCR text by:
 * - Removing excessive whitespace
 * - Normalizing line breaks
 * - Fixing common OCR errors
 *
 * @param text - Raw OCR text
 * @returns Cleaned text
 */
export function preprocessOCRText(text: string): string {
  return text
    // Normalize line breaks
    .replace(/\r\n/g, '\n')
    // Remove multiple spaces
    .replace(/ {2,}/g, ' ')
    // Remove multiple line breaks (keep max 2)
    .replace(/\n{3,}/g, '\n\n')
    // Trim each line
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    // Trim overall
    .trim()
}

/**
 * Extract key information snippets from OCR text
 *
 * Useful for quick preview of what was detected
 *
 * @param text - OCR extracted text
 * @returns Array of key snippets
 */
export function extractKeySnippets(text: string): string[] {
  const lines = text.split('\n').filter((line) => line.trim().length > 0)

  // Return first 10 non-empty lines as snippets
  return lines.slice(0, 10)
}

/**
 * Calculate OCR quality score
 *
 * Estimates quality of OCR result based on:
 * - Tesseract confidence
 * - Text length
 * - Presence of readable words
 *
 * @param result - OCR result
 * @returns Quality score (0-100)
 */
export function calculateOCRQuality(result: OCRResult): number {
  if (!result.success || !result.text) {
    return 0
  }

  // Start with Tesseract confidence
  let quality = result.confidence

  // Penalize very short text (likely poor extraction)
  if (result.text.length < 50) {
    quality *= 0.7
  }

  // Penalize if mostly numbers (might be noise)
  const numberRatio = (result.text.match(/\d/g) || []).length / result.text.length
  if (numberRatio > 0.8) {
    quality *= 0.8
  }

  // Bonus for readable words (simplified check)
  const words = result.text.split(/\s+/)
  const longWords = words.filter((w) => w.length >= 4).length
  if (longWords > 5) {
    quality = Math.min(100, quality * 1.1)
  }

  return Math.round(Math.min(100, Math.max(0, quality)))
}

/**
 * Check if OCR result is good enough for processing
 *
 * @param result - OCR result
 * @param minConfidence - Minimum confidence threshold (default: 60)
 * @returns True if result meets quality threshold
 */
export function isOCRResultValid(
  result: OCRResult,
  minConfidence: number = 60
): boolean {
  if (!result.success) {
    return false
  }

  const quality = calculateOCRQuality(result)
  return quality >= minConfidence
}
