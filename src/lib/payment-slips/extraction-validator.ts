/**
 * Payment Slip Extraction Validator
 *
 * Validates extracted data from Claude Vision and calculates confidence score.
 */

import type { PaymentSlipExtraction } from './types'

export interface ValidationResult {
  isValid: boolean
  confidence: number
  warnings: string[]
  errors: string[]
}

/**
 * Validate extracted payment slip data and calculate a confidence score (0-100).
 */
export function validateExtraction(extraction: PaymentSlipExtraction): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  let confidence = 40 // base score for successful parse

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
  }
}
