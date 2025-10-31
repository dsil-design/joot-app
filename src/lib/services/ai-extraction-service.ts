/**
 * AI Data Extraction Service
 *
 * Uses Google Gemini 1.5 Flash to extract structured data from OCR text
 * Parses vendor name, amount, currency, and transaction date
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

export interface ExtractedData {
  vendor_name: string | null
  amount: number | null
  currency: string | null
  transaction_date: string | null // ISO 8601 format
  extraction_confidence: number // 0-100
  metadata: {
    raw_response?: string
    processing_time_ms?: number
    model_used?: string
    prompt_tokens?: number
    response_tokens?: number
  }
}

export interface ExtractionResult {
  success: boolean
  data: ExtractedData | null
  error?: string
}

// Initialize Gemini AI
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required')
  }

  return new GoogleGenerativeAI(apiKey)
}

/**
 * Create structured extraction prompt for Gemini
 *
 * Uses a clear, specific prompt to guide the AI in extracting
 * vendor, amount, currency, and date from receipt/invoice text
 */
function createExtractionPrompt(ocrText: string): string {
  return `You are a financial document parser. Extract the following information from this receipt or invoice text.

IMPORTANT RULES:
1. Return ONLY valid JSON, no markdown formatting, no code blocks
2. Extract the merchant/vendor name (the business that issued the receipt)
3. Extract the total amount (not subtotals or individual items)
4. Extract the currency code (USD, EUR, GBP, THB, etc.)
5. Extract the transaction/purchase date
6. Provide a confidence score (0-100) for the overall extraction quality
7. If you cannot find a field, use null for that field
8. For dates, use ISO 8601 format (YYYY-MM-DD)

RESPONSE FORMAT (strict JSON):
{
  "vendor_name": "string or null",
  "amount": number or null,
  "currency": "string or null",
  "transaction_date": "YYYY-MM-DD or null",
  "confidence": number (0-100)
}

DOCUMENT TEXT:
${ocrText}

Extract the data now:`
}

/**
 * Parse Gemini response into structured data
 *
 * Handles various response formats and validates the extracted data
 */
function parseGeminiResponse(responseText: string): ExtractedData {
  try {
    // Clean response (remove markdown code blocks if present)
    let cleanedText = responseText.trim()

    // Remove markdown code blocks
    cleanedText = cleanedText.replace(/```json\n?/g, '')
    cleanedText = cleanedText.replace(/```\n?/g, '')
    cleanedText = cleanedText.trim()

    // Parse JSON
    const parsed = JSON.parse(cleanedText)

    // Validate and normalize
    const vendor_name = parsed.vendor_name || null
    const amount = typeof parsed.amount === 'number' ? parsed.amount : null
    const currency = parsed.currency || null
    const transaction_date = parsed.transaction_date || null
    const confidence = typeof parsed.confidence === 'number'
      ? Math.min(100, Math.max(0, parsed.confidence))
      : 50

    return {
      vendor_name,
      amount,
      currency,
      transaction_date,
      extraction_confidence: confidence,
      metadata: {
        raw_response: responseText,
        model_used: 'gemini-2.0-flash',
      },
    }
  } catch (error) {
    console.error('Failed to parse Gemini response:', error)
    console.error('Response text:', responseText)

    // Return empty result with low confidence
    return {
      vendor_name: null,
      amount: null,
      currency: null,
      transaction_date: null,
      extraction_confidence: 0,
      metadata: {
        raw_response: responseText,
        model_used: 'gemini-2.0-flash',
      },
    }
  }
}

/**
 * Validate extracted data
 *
 * Checks if the extracted data meets minimum quality requirements
 */
function validateExtractedData(data: ExtractedData): boolean {
  // At minimum, we need vendor name OR amount
  if (!data.vendor_name && !data.amount) {
    return false
  }

  // Check confidence threshold
  if (data.extraction_confidence < 30) {
    return false
  }

  // If amount exists, currency should exist
  if (data.amount !== null && !data.currency) {
    return false
  }

  // If date exists, validate format (YYYY-MM-DD or similar)
  if (data.transaction_date) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(data.transaction_date)) {
      // Try to parse as date
      const parsed = new Date(data.transaction_date)
      if (isNaN(parsed.getTime())) {
        // Invalid date format
        data.transaction_date = null
      } else {
        // Convert to ISO format
        data.transaction_date = parsed.toISOString().split('T')[0]
      }
    }
  }

  return true
}

/**
 * Extract structured data from OCR text using Gemini AI
 *
 * @param ocrText - Raw OCR extracted text
 * @returns Extraction result with vendor, amount, currency, date
 *
 * @example
 * const result = await extractDataFromText(ocrText)
 * if (result.success && result.data) {
 *   console.log('Vendor:', result.data.vendor_name)
 *   console.log('Amount:', result.data.amount, result.data.currency)
 *   console.log('Date:', result.data.transaction_date)
 * }
 */
export async function extractDataFromText(
  ocrText: string
): Promise<ExtractionResult> {
  const startTime = Date.now()

  try {
    // Validate input
    if (!ocrText || ocrText.trim().length < 10) {
      return {
        success: false,
        data: null,
        error: 'OCR text too short or empty',
      }
    }

    // Initialize Gemini
    const genAI = getGeminiClient()
    // Use gemini-2.0-flash (stable model available in v1beta API)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    // Create prompt
    const prompt = createExtractionPrompt(ocrText)

    // Generate response
    const result = await model.generateContent(prompt)
    const response = result.response
    const responseText = response.text()

    // Calculate processing time
    const processingTime = Date.now() - startTime

    // Parse response
    const extractedData = parseGeminiResponse(responseText)

    // Add processing time to metadata
    extractedData.metadata.processing_time_ms = processingTime

    // Validate data
    const isValid = validateExtractedData(extractedData)

    if (!isValid) {
      return {
        success: false,
        data: extractedData,
        error: 'Extracted data failed validation checks',
      }
    }

    return {
      success: true,
      data: extractedData,
    }
  } catch (error) {
    console.error('AI extraction failed:', error)
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'AI extraction failed',
    }
  }
}

/**
 * Calculate overall extraction quality
 *
 * Combines AI confidence with field completeness
 *
 * @param data - Extracted data
 * @returns Quality score (0-100)
 */
export function calculateExtractionQuality(data: ExtractedData): number {
  let score = data.extraction_confidence

  // Bonus for having key fields
  let fieldCount = 0
  if (data.vendor_name) fieldCount++
  if (data.amount !== null) fieldCount++
  if (data.currency) fieldCount++
  if (data.transaction_date) fieldCount++

  // Each field is worth 5 bonus points
  const fieldBonus = fieldCount * 5

  score = Math.min(100, score + fieldBonus)

  return Math.round(score)
}

/**
 * Check if extraction result is good enough for use
 *
 * @param data - Extracted data
 * @param minConfidence - Minimum confidence threshold (default: 50)
 * @returns True if data meets quality threshold
 */
export function isExtractionValid(
  data: ExtractedData | null,
  minConfidence: number = 50
): boolean {
  if (!data) return false

  const quality = calculateExtractionQuality(data)
  return quality >= minConfidence && validateExtractedData(data)
}

/**
 * Format extracted data for display
 *
 * @param data - Extracted data
 * @returns Human-readable summary
 */
export function formatExtractedData(data: ExtractedData): string {
  const parts: string[] = []

  if (data.vendor_name) {
    parts.push(`Vendor: ${data.vendor_name}`)
  }

  if (data.amount !== null && data.currency) {
    parts.push(`Amount: ${data.amount} ${data.currency}`)
  }

  if (data.transaction_date) {
    const date = new Date(data.transaction_date)
    parts.push(`Date: ${date.toLocaleDateString()}`)
  }

  parts.push(`Confidence: ${data.extraction_confidence}%`)

  return parts.join(' | ')
}
