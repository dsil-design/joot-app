/**
 * Payment Slip Extraction Validator
 *
 * Validates extracted data from Claude Vision and calculates confidence score.
 * Includes deterministic cross-check of dates extracted by the vision model.
 */

import type { PaymentSlipExtraction } from './types'
import { parseThaiSlipDate } from './thai-date-parser'

export interface ValidationResult {
  isValid: boolean
  confidence: number
  warnings: string[]
  errors: string[]
  /** If the deterministic parser disagrees with the vision model, this holds the corrected date */
  correctedDate: string | null
}

/**
 * Validate extracted payment slip data and calculate a confidence score (0-100).
 */
export function validateExtraction(extraction: PaymentSlipExtraction): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  let confidence = 40 // base score for successful parse
  let correctedDate: string | null = null

  // Cross-check: parse date_raw deterministically and compare with vision model's date
  if (extraction.date_raw) {
    const parsed = parseThaiSlipDate(extraction.date_raw)
    if (parsed && extraction.date && parsed.date !== extraction.date) {
      warnings.push(
        `Date mismatch: vision model returned "${extraction.date}" but raw date "${extraction.date_raw}" parses to "${parsed.date}" — using deterministic parse`
      )
      correctedDate = parsed.date
    }
  }

  // Cross-check: parse amount_raw and compare with vision model's amount
  if (extraction.amount_raw && extraction.amount) {
    const parsedRaw = parseFloat(extraction.amount_raw.replace(/,/g, ''))
    if (!isNaN(parsedRaw) && Math.abs(parsedRaw - extraction.amount) > 0.01) {
      warnings.push(
        `Amount mismatch: vision model returned ${extraction.amount} but raw amount "${extraction.amount_raw}" parses to ${parsedRaw} — using raw amount`
      )
      extraction.amount = parsedRaw
    }
  }

  // Required: amount
  if (!extraction.amount || extraction.amount <= 0) {
    errors.push('Amount is missing or invalid')
  } else {
    confidence += 15
  }

  // Required: date
  if (!extraction.date) {
    errors.push('Date is missing')
  } else {
    const dateObj = new Date(extraction.date)
    if (isNaN(dateObj.getTime())) {
      errors.push(`Invalid date format: ${extraction.date}`)
    } else {
      confidence += 10
      // Check date is reasonable (not in the future, not more than 2 years ago)
      const now = new Date()
      const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate())
      if (dateObj > now) {
        warnings.push('Transaction date is in the future')
      } else if (dateObj < twoYearsAgo) {
        warnings.push('Transaction date is more than 2 years ago')
      }
    }
  }

  // Sender and recipient
  if (extraction.sender_name && extraction.recipient_name) {
    confidence += 10
  } else {
    if (!extraction.sender_name) warnings.push('Sender name not extracted')
    if (!extraction.recipient_name) warnings.push('Recipient name not extracted')
  }

  // Transaction reference
  if (extraction.transaction_reference) {
    confidence += 10
  } else {
    warnings.push('Transaction reference not extracted')
  }

  // Bank detected
  if (extraction.bank_detected !== 'unknown') {
    confidence += 5
  } else {
    warnings.push('Bank could not be identified')
  }

  // Time
  if (extraction.time) {
    confidence += 5
  }

  // Fee (should be present even if 0)
  if (extraction.fee !== undefined && extraction.fee !== null) {
    confidence += 5
  }

  return {
    isValid: errors.length === 0,
    confidence: Math.min(100, confidence),
    warnings,
    errors,
    correctedDate,
  }
}
