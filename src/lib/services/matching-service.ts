/**
 * Transaction Matching Service
 *
 * Matches extracted document data to existing transactions
 * Uses fuzzy matching on vendor names, amount tolerance, and date ranges
 */

import { createClient } from '@/lib/supabase/server'
import type { Transaction } from '@/lib/supabase/types'

export interface MatchCandidate {
  transaction: Transaction
  confidence: number // 0-100
  matchReasons: string[]
  scores: {
    vendorScore: number
    amountScore: number
    dateScore: number
    overallScore: number
  }
}

export interface MatchResult {
  success: boolean
  matches: MatchCandidate[]
  bestMatch: MatchCandidate | null
  error?: string
}

interface MatchingCriteria {
  vendorName: string | null
  amount: number | null
  currency: string | null
  transactionDate: string | null // ISO format
}

/**
 * Calculate similarity between two strings (0-100)
 * Uses Levenshtein distance for fuzzy matching
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0

  // Normalize strings
  const s1 = str1.toLowerCase().trim()
  const s2 = str2.toLowerCase().trim()

  if (s1 === s2) return 100

  // Calculate Levenshtein distance
  const matrix: number[][] = []

  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }

  const distance = matrix[s2.length][s1.length]
  const maxLength = Math.max(s1.length, s2.length)
  const similarity = ((maxLength - distance) / maxLength) * 100

  return Math.round(similarity)
}

/**
 * Calculate vendor name match score
 *
 * Compares extracted vendor name with transaction description/vendor
 * Uses fuzzy matching to handle variations
 */
function calculateVendorScore(
  extractedVendor: string | null,
  transaction: any // Using any since vendor is joined data
): number {
  if (!extractedVendor) return 0

  const vendor = extractedVendor.toLowerCase().trim()
  const description = (transaction.description || '').toLowerCase().trim()
  const transactionVendorName = (transaction.vendor?.name || '').toLowerCase().trim()
  const paymentMethodName = (transaction.payment_method?.name || '').toLowerCase().trim()

  // Direct match bonus - check description, vendor name, and payment method
  if (description.includes(vendor) || vendor.includes(description)) {
    return 100
  }

  if (transactionVendorName && (transactionVendorName.includes(vendor) || vendor.includes(transactionVendorName))) {
    return 100
  }

  // Check if extracted vendor is actually the payment method
  if (paymentMethodName && (paymentMethodName.includes(vendor) || vendor.includes(paymentMethodName))) {
    return 90 // High score but not 100 since it's not the actual vendor
  }

  // Fuzzy match
  const descriptionSimilarity = calculateStringSimilarity(vendor, description)
  const vendorSimilarity = transactionVendorName
    ? calculateStringSimilarity(vendor, transactionVendorName)
    : 0
  const paymentMethodSimilarity = paymentMethodName
    ? calculateStringSimilarity(vendor, paymentMethodName)
    : 0

  return Math.max(descriptionSimilarity, vendorSimilarity, paymentMethodSimilarity * 0.9)
}

/**
 * Calculate amount match score
 *
 * Allows for small differences due to rounding or currency conversion
 */
function calculateAmountScore(
  extractedAmount: number | null,
  transaction: Transaction,
  tolerance: number = 0.05 // 5% tolerance
): number {
  if (!extractedAmount) return 0

  // Transactions are stored as positive values for expenses
  const transactionAmount = transaction.amount
  const difference = Math.abs(extractedAmount - transactionAmount)
  const percentDiff = difference / transactionAmount

  if (percentDiff === 0) return 100
  if (percentDiff <= tolerance) {
    // Linear scoring within tolerance
    return Math.round(100 - (percentDiff / tolerance) * 30)
  }

  // Exponential decay for larger differences
  return Math.round(70 * Math.exp(-percentDiff * 10))
}

/**
 * Calculate date match score
 *
 * Allows for dates within a reasonable window
 * Transactions might post 1-3 days after the receipt date
 */
function calculateDateScore(
  extractedDate: string | null,
  transaction: Transaction,
  windowDays: number = 5
): number {
  if (!extractedDate) return 50 // Neutral if no date

  const docDate = new Date(extractedDate)
  const transDate = new Date(transaction.date)

  if (isNaN(docDate.getTime()) || isNaN(transDate.getTime())) {
    return 50 // Neutral if invalid dates
  }

  // Calculate day difference
  const dayDiff = Math.abs(
    (docDate.getTime() - transDate.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (dayDiff === 0) return 100
  if (dayDiff <= windowDays) {
    // Linear scoring within window
    return Math.round(100 - (dayDiff / windowDays) * 40)
  }

  // Exponential decay for dates outside window
  return Math.round(60 * Math.exp(-dayDiff / 30))
}

/**
 * Calculate overall match confidence
 *
 * Weighted combination of vendor, amount, and date scores
 */
function calculateOverallConfidence(scores: {
  vendorScore: number
  amountScore: number
  dateScore: number
}): number {
  // Weights: vendor (50%), amount (40%), date (10%)
  const weighted =
    scores.vendorScore * 0.5 +
    scores.amountScore * 0.4 +
    scores.dateScore * 0.1

  return Math.round(weighted)
}

/**
 * Generate match reasons for display
 */
function generateMatchReasons(scores: {
  vendorScore: number
  amountScore: number
  dateScore: number
}): string[] {
  const reasons: string[] = []

  if (scores.vendorScore >= 80) {
    reasons.push('Strong vendor name match')
  } else if (scores.vendorScore >= 60) {
    reasons.push('Partial vendor name match')
  }

  if (scores.amountScore >= 95) {
    reasons.push('Exact amount match')
  } else if (scores.amountScore >= 70) {
    reasons.push('Similar amount')
  }

  if (scores.dateScore >= 90) {
    reasons.push('Same date')
  } else if (scores.dateScore >= 60) {
    reasons.push('Close date (within 5 days)')
  }

  return reasons
}

/**
 * Find matching transactions for extracted document data
 *
 * @param criteria - Extracted vendor, amount, currency, date
 * @param userId - User ID to scope search
 * @param minConfidence - Minimum confidence threshold (default: 50)
 * @param maxResults - Maximum number of matches to return (default: 5)
 * @returns Match result with ranked candidates
 *
 * @example
 * const result = await findMatchingTransactions({
 *   vendorName: 'Starbucks',
 *   amount: 5.90,
 *   currency: 'USD',
 *   transactionDate: '2024-06-15'
 * }, userId)
 */
export async function findMatchingTransactions(
  criteria: MatchingCriteria,
  userId: string,
  minConfidence: number = 50,
  maxResults: number = 5,
  supabaseClient?: any // Optional client to avoid cookies() issues
): Promise<MatchResult> {
  try {
    console.log('[MATCHING] Starting transaction matching...')
    console.log('[MATCHING] Criteria:', JSON.stringify(criteria, null, 2))
    console.log('[MATCHING] User ID:', userId)
    console.log('[MATCHING] Min confidence:', minConfidence)

    const supabase = supabaseClient || await createClient()

    // Build query to fetch candidate transactions
    // Look for transactions within ±30 days if date is provided
    let query = supabase
      .from('transactions')
      .select(`
        *,
        vendor:vendors(id, name),
        payment_method:payment_methods(id, name)
      `)
      .eq('user_id', userId)
      .order('transaction_date', { ascending: false })

    // Date range filter if date provided
    if (criteria.transactionDate) {
      const docDate = new Date(criteria.transactionDate)
      const startDate = new Date(docDate)
      startDate.setDate(startDate.getDate() - 30)
      const endDate = new Date(docDate)
      endDate.setDate(endDate.getDate() + 30)

      console.log('[MATCHING] Date range:', {
        docDate: docDate.toISOString(),
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      })

      query = query
        .gte('transaction_date', startDate.toISOString().split('T')[0])
        .lte('transaction_date', endDate.toISOString().split('T')[0])
    } else {
      // If no date, just look at recent transactions (last 90 days)
      const ninetyDaysAgo = new Date()
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
      console.log('[MATCHING] No date provided, using 90-day window from:', ninetyDaysAgo.toISOString().split('T')[0])
      query = query.gte('transaction_date', ninetyDaysAgo.toISOString().split('T')[0])
    }

    // Amount range filter if amount provided
    if (criteria.amount) {
      const tolerance = criteria.amount * 0.1 // 10% tolerance for initial filter
      const minAmount = criteria.amount - tolerance
      const maxAmount = criteria.amount + tolerance
      console.log('[MATCHING] Amount range:', { minAmount, maxAmount, tolerance })
      query = query
        .gte('amount', minAmount)
        .lte('amount', maxAmount)
    }

    console.log('[MATCHING] Executing query...')
    const { data: transactions, error } = await query.limit(50) // Get more candidates for scoring

    if (error) {
      console.error('[MATCHING] Query failed:', error)
      return {
        success: false,
        matches: [],
        bestMatch: null,
        error: 'Failed to fetch transactions',
      }
    }

    console.log('[MATCHING] Query returned', transactions?.length || 0, 'transactions')
    if (transactions && transactions.length > 0) {
      console.log('[MATCHING] First transaction sample:', JSON.stringify(transactions[0], null, 2))
    }

    if (!transactions || transactions.length === 0) {
      console.log('[MATCHING] No transactions found in database query')
      return {
        success: true,
        matches: [],
        bestMatch: null,
      }
    }

    // Score each transaction
    console.log('[MATCHING] Scoring', transactions.length, 'candidate transactions...')
    const allScored = transactions.map((transaction, idx) => {
      const vendorScore = calculateVendorScore(criteria.vendorName, transaction)
      const amountScore = calculateAmountScore(criteria.amount, transaction)
      const dateScore = calculateDateScore(criteria.transactionDate, transaction)
      const overallScore = calculateOverallConfidence({ vendorScore, amountScore, dateScore })

      if (idx < 3) { // Log first 3 for debugging
        console.log(`[MATCHING] Transaction ${idx + 1}:`, {
          id: transaction.id,
          description: transaction.description,
          amount: transaction.amount,
          date: transaction.transaction_date,
          vendor: transaction.vendor?.name,
          paymentMethod: transaction.payment_method?.name,
          scores: { vendorScore, amountScore, dateScore, overallScore }
        })
      }

      return {
        transaction,
        confidence: overallScore,
        matchReasons: generateMatchReasons({ vendorScore, amountScore, dateScore }),
        scores: {
          vendorScore,
          amountScore,
          dateScore,
          overallScore,
        },
      }
    })

    console.log('[MATCHING] Filtering by min confidence:', minConfidence)
    const candidates: MatchCandidate[] = allScored
      .filter((candidate) => candidate.confidence >= minConfidence)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, maxResults)

    console.log('[MATCHING] After filtering:', candidates.length, 'matches above threshold')
    if (candidates.length > 0) {
      console.log('[MATCHING] Best match:', {
        confidence: candidates[0].confidence,
        description: candidates[0].transaction.description,
        scores: candidates[0].scores
      })
    }

    const bestMatch = candidates.length > 0 ? candidates[0] : null

    return {
      success: true,
      matches: candidates,
      bestMatch,
    }
  } catch (error) {
    console.error('Matching error:', error)
    return {
      success: false,
      matches: [],
      bestMatch: null,
      error: error instanceof Error ? error.message : 'Matching failed',
    }
  }
}

/**
 * Check if a match is strong enough for auto-matching
 *
 * @param match - Match candidate
 * @returns True if match meets auto-matching criteria
 */
export function isAutoMatchCandidate(match: MatchCandidate): boolean {
  // Auto-match criteria:
  // - Overall confidence >= 90%
  // - Vendor score >= 80%
  // - Amount score >= 95%
  return (
    match.confidence >= 90 &&
    match.scores.vendorScore >= 80 &&
    match.scores.amountScore >= 95
  )
}

/**
 * Format match confidence for display
 */
export function formatMatchConfidence(confidence: number): string {
  if (confidence >= 90) return 'Excellent match'
  if (confidence >= 75) return 'Good match'
  if (confidence >= 60) return 'Possible match'
  return 'Weak match'
}
