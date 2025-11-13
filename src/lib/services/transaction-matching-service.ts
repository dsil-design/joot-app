/**
 * Transaction Matching Service
 *
 * Implements automatic transaction matching logic using a weighted scoring algorithm.
 * Matches expected transactions to actual transactions based on vendor, amount, date, etc.
 */

import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type {
  ExpectedTransaction,
  Transaction,
  MatchSuggestion,
  MatchScore,
  AutoMatchOptions,
  AutoMatchResult,
} from '@/lib/types/recurring-transactions'
import { ExpectedTransactionService } from './expected-transaction-service'

type DbClient = SupabaseClient<Database>

interface ServiceResponse<T> {
  data: T | null
  error: string | null
}

/**
 * Transaction Matching Service class
 * Implements sophisticated matching algorithm with confidence scoring
 */
export class TransactionMatchingService {
  private supabase: DbClient
  private expectedTransactionService: ExpectedTransactionService

  // Scoring weights (total: 100 points)
  private readonly VENDOR_EXACT_SCORE = 40
  private readonly VENDOR_FUZZY_SCORE = 20
  private readonly AMOUNT_EXACT_SCORE = 30
  private readonly AMOUNT_5PCT_SCORE = 20
  private readonly AMOUNT_10PCT_SCORE = 10
  private readonly AMOUNT_20PCT_SCORE = 5
  private readonly DATE_SAME_DAY_SCORE = 20
  private readonly DATE_3_DAYS_SCORE = 10
  private readonly DATE_7_DAYS_SCORE = 5
  private readonly DATE_14_DAYS_SCORE = 2
  private readonly PAYMENT_METHOD_SCORE = 10
  private readonly TAG_MATCH_SCORE = 5
  private readonly MAX_TAG_SCORE = 10

  // Penalties
  private readonly DIFFERENT_TYPE_PENALTY = -50
  private readonly DIFFERENT_CURRENCY_PENALTY = -50
  private readonly LARGE_AMOUNT_VARIANCE_PENALTY = -30
  private readonly LARGE_DATE_VARIANCE_PENALTY = -10

  // Thresholds
  private readonly MIN_CONFIDENCE_THRESHOLD = 60
  private readonly AUTO_MATCH_THRESHOLD = 85
  private readonly VENDOR_FUZZY_THRESHOLD = 0.8

  constructor(supabase: DbClient, expectedTransactionService: ExpectedTransactionService) {
    this.supabase = supabase
    this.expectedTransactionService = expectedTransactionService
  }

  /**
   * Find match suggestions for all unmatched expected transactions in a month
   *
   * @param monthPlanId - Month plan ID
   * @param userId - User ID for authorization
   * @returns Array of match suggestions with confidence scores
   */
  async findMatchSuggestions(
    monthPlanId: string,
    userId: string
  ): Promise<ServiceResponse<MatchSuggestion[]>> {
    try {
      // Get unmatched expected transactions
      const unmatchedExpected = await this.getUnmatchedExpectedTransactions(monthPlanId, userId)
      if (unmatchedExpected.error || !unmatchedExpected.data) {
        return { data: null, error: unmatchedExpected.error || 'Failed to fetch expected transactions' }
      }

      // Get unmatched actual transactions for the same month
      const unmatchedActual = await this.getUnmatchedTransactions(userId, monthPlanId)
      if (unmatchedActual.error || !unmatchedActual.data) {
        return { data: null, error: unmatchedActual.error || 'Failed to fetch actual transactions' }
      }

      const suggestions: MatchSuggestion[] = []

      // For each expected transaction, find best matches
      for (const expected of unmatchedExpected.data) {
        const candidates = this.filterCandidateTransactions(expected, unmatchedActual.data)

        for (const actual of candidates) {
          const matchScore = await this.calculateMatchConfidence(expected, actual)

          // Only include if above minimum threshold
          if (matchScore.confidence >= this.MIN_CONFIDENCE_THRESHOLD) {
            suggestions.push({
              expected_transaction_id: expected.id,
              transaction_id: actual.id,
              confidence_score: matchScore.confidence,
              match_reasons: matchScore.reasons,
              expected,
              actual,
            })
          }
        }
      }

      // Sort by confidence descending
      suggestions.sort((a, b) => b.confidence_score - a.confidence_score)

      // Remove duplicate matches (same actual transaction matched to multiple expected)
      const uniqueSuggestions = this.removeDuplicateMatches(suggestions)

      return { data: uniqueSuggestions, error: null }
    } catch (error) {
      console.error('Unexpected error finding match suggestions:', error)
      return { data: null, error: 'Failed to find match suggestions' }
    }
  }

  /**
   * Automatically match expected transactions to actual transactions
   *
   * @param monthPlanId - Month plan ID
   * @param userId - User ID for authorization
   * @param options - Matching options (confidence_threshold, require_manual_review)
   * @returns Result with matched count and suggestions for manual review
   */
  async autoMatchTransactions(
    monthPlanId: string,
    userId: string,
    options: AutoMatchOptions = {
      confidence_threshold: this.AUTO_MATCH_THRESHOLD,
      require_manual_review: false,
    }
  ): Promise<ServiceResponse<AutoMatchResult>> {
    try {
      // Get match suggestions
      const suggestionsResponse = await this.findMatchSuggestions(monthPlanId, userId)
      if (suggestionsResponse.error || !suggestionsResponse.data) {
        return { data: null, error: suggestionsResponse.error || 'Failed to get suggestions' }
      }

      let matchedCount = 0
      const suggestions: MatchSuggestion[] = []
      const matchedPairs: Array<{ expected_id: string; transaction_id: string; confidence: number }> = []

      for (const suggestion of suggestionsResponse.data) {
        if (suggestion.confidence_score >= options.confidence_threshold) {
          if (options.require_manual_review) {
            // Don't auto-match, just add to suggestions
            suggestions.push(suggestion)
          } else {
            // Auto-match
            const matchResult = await this.expectedTransactionService.matchTransaction(
              suggestion.expected_transaction_id,
              suggestion.transaction_id,
              userId
            )

            if (!matchResult.error) {
              matchedCount++
              matchedPairs.push({
                expected_id: suggestion.expected_transaction_id,
                transaction_id: suggestion.transaction_id,
                confidence: suggestion.confidence_score,
              })
            }
          }
        } else {
          // Below threshold, add to manual review
          suggestions.push(suggestion)
        }
      }

      const message = options.require_manual_review
        ? `Found ${suggestions.length} potential matches for manual review`
        : `Automatically matched ${matchedCount} transactions, ${suggestions.length} require manual review`

      return {
        data: {
          matched_count: matchedCount,
          suggestions_count: suggestions.length,
          message,
          matched_pairs: matchedPairs,
          suggestions,
        },
        error: null,
      }
    } catch (error) {
      console.error('Unexpected error auto-matching transactions:', error)
      return { data: null, error: 'Failed to auto-match transactions' }
    }
  }

  /**
   * Calculate match confidence score between expected and actual transaction
   *
   * @param expected - Expected transaction
   * @param actual - Actual transaction
   * @returns Match score with confidence and breakdown
   */
  async calculateMatchConfidence(
    expected: ExpectedTransaction,
    actual: Transaction
  ): Promise<MatchScore> {
    let confidence = 0
    const reasons: string[] = []
    const penalties: string[] = []

    const breakdown = {
      vendor_score: 0,
      amount_score: 0,
      date_score: 0,
      payment_method_score: 0,
      tags_score: 0,
    }

    // Check for disqualifying factors
    if (expected.transaction_type !== actual.transaction_type) {
      confidence += this.DIFFERENT_TYPE_PENALTY
      penalties.push('Different transaction type')
    }

    if (expected.original_currency !== actual.original_currency) {
      confidence += this.DIFFERENT_CURRENCY_PENALTY
      penalties.push('Different currency')
    }

    // If disqualified, return early
    if (confidence < 0) {
      return { confidence: 0, reasons, penalties, breakdown }
    }

    // Vendor matching
    const vendorScore = this.calculateVendorScore(expected, actual)
    confidence += vendorScore.score
    breakdown.vendor_score = vendorScore.score
    if (vendorScore.reason) reasons.push(vendorScore.reason)

    // Amount matching
    const amountScore = this.calculateAmountScore(expected, actual)
    confidence += amountScore.score
    breakdown.amount_score = amountScore.score
    if (amountScore.reason) reasons.push(amountScore.reason)
    if (amountScore.penalty) {
      confidence += amountScore.penalty
      penalties.push(amountScore.penaltyReason!)
    }

    // Date matching
    const dateScore = this.calculateDateScore(expected, actual)
    confidence += dateScore.score
    breakdown.date_score = dateScore.score
    if (dateScore.reason) reasons.push(dateScore.reason)
    if (dateScore.penalty) {
      confidence += dateScore.penalty
      penalties.push(dateScore.penaltyReason!)
    }

    // Payment method matching
    const paymentScore = this.calculatePaymentMethodScore(expected, actual)
    confidence += paymentScore.score
    breakdown.payment_method_score = paymentScore.score
    if (paymentScore.reason) reasons.push(paymentScore.reason)

    // Tags matching (requires fetching actual transaction tags)
    const tagsScore = await this.calculateTagsScore(expected, actual)
    confidence += tagsScore.score
    breakdown.tags_score = tagsScore.score
    if (tagsScore.reason) reasons.push(tagsScore.reason)

    // Ensure confidence is between 0 and 100
    confidence = Math.max(0, Math.min(100, confidence))

    return { confidence, reasons, penalties, breakdown }
  }

  /**
   * Get unmatched actual transactions for a month
   */
  async getUnmatchedTransactions(
    userId: string,
    monthPlanId: string
  ): Promise<ServiceResponse<Transaction[]>> {
    try {
      // Get month plan to determine date range
      const { data: monthPlan, error: planError } = await this.supabase
        .from('month_plans')
        .select('month_year')
        .eq('id', monthPlanId)
        .eq('user_id', userId)
        .single()

      if (planError || !monthPlan) {
        return { data: null, error: 'Month plan not found' }
      }

      // Calculate date range (month ± 14 days for flexible matching)
      const monthDate = new Date(monthPlan.month_year)
      const startDate = new Date(monthDate)
      startDate.setDate(startDate.getDate() - 14)
      const endDate = new Date(monthDate)
      endDate.setMonth(endDate.getMonth() + 1)
      endDate.setDate(endDate.getDate() + 14)

      const { data, error } = await this.supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .is('expected_transaction_id', null)
        .gte('transaction_date', startDate.toISOString().split('T')[0])
        .lte('transaction_date', endDate.toISOString().split('T')[0])
        .order('transaction_date', { ascending: false })

      if (error) {
        console.error('Error fetching unmatched transactions:', error)
        return { data: null, error: error.message }
      }

      return { data: data as Transaction[], error: null }
    } catch (error) {
      console.error('Unexpected error fetching unmatched transactions:', error)
      return { data: null, error: 'Failed to fetch unmatched transactions' }
    }
  }

  /**
   * Get unmatched expected transactions for a month
   */
  async getUnmatchedExpectedTransactions(
    monthPlanId: string,
    userId: string
  ): Promise<ServiceResponse<ExpectedTransaction[]>> {
    return await this.expectedTransactionService.getExpectedTransactions(
      {
        month_plan_id: monthPlanId,
        status: ['pending', 'overdue'],
      },
      userId
    )
  }

  /**
   * Filter candidate transactions that could potentially match
   * Pre-filters to reduce comparison workload
   */
  private filterCandidateTransactions(
    expected: ExpectedTransaction,
    transactions: Transaction[]
  ): Transaction[] {
    return transactions.filter(tx => {
      // Same transaction type (required)
      if (tx.transaction_type !== expected.transaction_type) return false

      // Same currency (required)
      if (tx.original_currency !== expected.original_currency) return false

      // Date within ±14 days
      const expectedDate = new Date(expected.expected_date)
      const txDate = new Date(tx.transaction_date)
      const daysDiff = Math.abs((txDate.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24))
      if (daysDiff > 14) return false

      // Amount within ±50%
      const amountDiff = Math.abs(tx.amount - expected.expected_amount)
      const amountPct = (amountDiff / expected.expected_amount) * 100
      if (amountPct > 50) return false

      return true
    })
  }

  /**
   * Calculate vendor matching score
   */
  private calculateVendorScore(
    expected: ExpectedTransaction,
    actual: Transaction
  ): { score: number; reason?: string } {
    if (!expected.vendor_id || !actual.vendor_id) {
      return { score: 0 }
    }

    // Exact vendor match
    if (expected.vendor_id === actual.vendor_id) {
      return { score: this.VENDOR_EXACT_SCORE, reason: 'Exact vendor match' }
    }

    // Fuzzy vendor match (would require vendor names)
    if (expected.vendor?.name && actual.vendor_id) {
      // For now, return 0 - fuzzy matching would require fetching vendor name
      // In a real implementation, fetch actual vendor name and compare
      return { score: 0 }
    }

    return { score: 0 }
  }

  /**
   * Calculate amount matching score
   */
  private calculateAmountScore(
    expected: ExpectedTransaction,
    actual: Transaction
  ): { score: number; reason?: string; penalty?: number; penaltyReason?: string } {
    const diff = Math.abs(actual.amount - expected.expected_amount)
    const pctDiff = (diff / expected.expected_amount) * 100

    let result: { score: number; reason?: string; penalty?: number; penaltyReason?: string } = { score: 0 }

    // Exact match
    if (diff < 0.01) {
      result.score = this.AMOUNT_EXACT_SCORE
      result.reason = 'Exact amount match'
    }
    // Within 5%
    else if (pctDiff <= 5) {
      result.score = this.AMOUNT_5PCT_SCORE
      result.reason = `Amount within 5% (${pctDiff.toFixed(1)}%)`
    }
    // Within 10%
    else if (pctDiff <= 10) {
      result.score = this.AMOUNT_10PCT_SCORE
      result.reason = `Amount within 10% (${pctDiff.toFixed(1)}%)`
    }
    // Within 20%
    else if (pctDiff <= 20) {
      result.score = this.AMOUNT_20PCT_SCORE
      result.reason = `Amount within 20% (${pctDiff.toFixed(1)}%)`
    }

    // Penalty for large variance
    if (pctDiff > 50) {
      result.penalty = this.LARGE_AMOUNT_VARIANCE_PENALTY
      result.penaltyReason = `Large amount variance (${pctDiff.toFixed(1)}%)`
    }

    return result
  }

  /**
   * Calculate date proximity score
   */
  private calculateDateScore(
    expected: ExpectedTransaction,
    actual: Transaction
  ): { score: number; reason?: string; penalty?: number; penaltyReason?: string } {
    const expectedDate = new Date(expected.expected_date)
    const actualDate = new Date(actual.transaction_date)
    const daysDiff = Math.abs((actualDate.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24))

    let result: { score: number; reason?: string; penalty?: number; penaltyReason?: string } = { score: 0 }

    // Same day
    if (daysDiff < 1) {
      result.score = this.DATE_SAME_DAY_SCORE
      result.reason = 'Same day'
    }
    // Within 3 days
    else if (daysDiff <= 3) {
      result.score = this.DATE_3_DAYS_SCORE
      result.reason = `Within 3 days (${Math.round(daysDiff)} days)`
    }
    // Within 7 days
    else if (daysDiff <= 7) {
      result.score = this.DATE_7_DAYS_SCORE
      result.reason = `Within 7 days (${Math.round(daysDiff)} days)`
    }
    // Within 14 days
    else if (daysDiff <= 14) {
      result.score = this.DATE_14_DAYS_SCORE
      result.reason = `Within 14 days (${Math.round(daysDiff)} days)`
    }

    // Penalty for large date variance
    if (daysDiff > 14) {
      result.penalty = this.LARGE_DATE_VARIANCE_PENALTY
      result.penaltyReason = `Large date variance (${Math.round(daysDiff)} days)`
    }

    return result
  }

  /**
   * Calculate payment method matching score
   */
  private calculatePaymentMethodScore(
    expected: ExpectedTransaction,
    actual: Transaction
  ): { score: number; reason?: string } {
    if (!expected.payment_method_id || !actual.payment_method_id) {
      return { score: 0 }
    }

    if (expected.payment_method_id === actual.payment_method_id) {
      return { score: this.PAYMENT_METHOD_SCORE, reason: 'Same payment method' }
    }

    return { score: 0 }
  }

  /**
   * Calculate tags overlap score
   */
  private async calculateTagsScore(
    expected: ExpectedTransaction,
    actual: Transaction
  ): Promise<{ score: number; reason?: string }> {
    // Get actual transaction tags
    const { data: actualTags } = await this.supabase
      .from('transaction_tags')
      .select('tag_id')
      .eq('transaction_id', actual.id)

    if (!actualTags || actualTags.length === 0 || !expected.tags || expected.tags.length === 0) {
      return { score: 0 }
    }

    const expectedTagIds = expected.tags.map(t => t.id)
    const actualTagIds = actualTags.map(t => t.tag_id)

    const matchingTags = expectedTagIds.filter(id => actualTagIds.includes(id))

    if (matchingTags.length > 0) {
      const score = Math.min(matchingTags.length * this.TAG_MATCH_SCORE, this.MAX_TAG_SCORE)
      return {
        score,
        reason: `${matchingTags.length} matching tag${matchingTags.length > 1 ? 's' : ''}`,
      }
    }

    return { score: 0 }
  }

  /**
   * Remove duplicate matches (same actual transaction matched to multiple expected)
   * Keep only the highest confidence match for each actual transaction
   */
  private removeDuplicateMatches(suggestions: MatchSuggestion[]): MatchSuggestion[] {
    const transactionMap = new Map<string, MatchSuggestion>()

    for (const suggestion of suggestions) {
      const existing = transactionMap.get(suggestion.transaction_id)

      if (!existing || suggestion.confidence_score > existing.confidence_score) {
        transactionMap.set(suggestion.transaction_id, suggestion)
      }
    }

    return Array.from(transactionMap.values()).sort(
      (a, b) => b.confidence_score - a.confidence_score
    )
  }
}

/**
 * Factory function to create a TransactionMatchingService instance
 */
export async function createTransactionMatchingService(): Promise<TransactionMatchingService> {
  const supabase = await createClient()
  const expectedTransactionService = new ExpectedTransactionService(supabase)
  return new TransactionMatchingService(supabase, expectedTransactionService)
}

/**
 * Create TransactionMatchingService with specific client instances
 */
export function createTransactionMatchingServiceWithClient(
  client: DbClient,
  expectedTransactionService: ExpectedTransactionService
): TransactionMatchingService {
  return new TransactionMatchingService(client, expectedTransactionService)
}
