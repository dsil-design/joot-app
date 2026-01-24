/**
 * Match Scoring Algorithm
 *
 * Combines amount, date, and vendor matching into a composite confidence score.
 * Used to rank potential matches and determine match quality.
 *
 * Score Distribution:
 * - Amount match: up to 40 points
 * - Date match: up to 30 points
 * - Vendor match: up to 30 points
 * - Total: 0-100 points
 *
 * Confidence Levels:
 * - HIGH: score >= 90
 * - MEDIUM: score >= 55 && score < 90
 * - LOW: score < 55
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import {
  type AmountMatchResult,
  compareAmounts,
  compareCurrencyAmounts,
} from './amount-matcher';
import { type DateMatchResult, compareDates } from './date-matcher';
import { type VendorMatchResult, compareVendors } from './vendor-matcher';
import { convertAmount, type ConversionResult, getRateQualityScore } from './cross-currency';

/**
 * Confidence level enum
 */
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * Score weight configuration
 */
export const SCORE_WEIGHTS = {
  AMOUNT: 40, // Max 40 points
  DATE: 30, // Max 30 points
  VENDOR: 30, // Max 30 points
};

/**
 * Confidence thresholds
 */
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 90, // >= 90: High confidence
  MEDIUM: 55, // >= 55: Medium confidence
  // < 55: Low confidence
};

/**
 * Transaction data for matching (from statement/email)
 */
export interface SourceTransaction {
  /** Transaction amount */
  amount: number;

  /** Currency code (e.g., 'USD', 'THB') */
  currency: string;

  /** Transaction date (YYYY-MM-DD or Date object) */
  date: Date | string;

  /** Vendor/merchant name */
  vendor: string;

  /** Optional description */
  description?: string;
}

/**
 * Transaction data to match against (from database)
 */
export interface TargetTransaction {
  /** Transaction ID */
  id: string;

  /** Transaction amount */
  amount: number;

  /** Currency code (e.g., 'USD', 'THB') */
  currency: string;

  /** Transaction date (YYYY-MM-DD or Date object) */
  date: Date | string;

  /** Vendor/merchant name */
  vendor: string;

  /** Optional description */
  description?: string;
}

/**
 * Detailed match score breakdown
 */
export interface MatchScoreDetails {
  /** Amount matching details */
  amount: AmountMatchResult;

  /** Date matching details */
  date: DateMatchResult;

  /** Vendor matching details */
  vendor: VendorMatchResult;

  /** Currency conversion details (if cross-currency) */
  conversion?: ConversionResult | null;
}

/**
 * Complete match result
 */
export interface MatchResult {
  /** Target transaction ID */
  targetId: string;

  /** Total composite score (0-100) */
  score: number;

  /** Confidence level */
  confidence: ConfidenceLevel;

  /** Whether this is considered a valid match */
  isMatch: boolean;

  /** Detailed score breakdown */
  details: MatchScoreDetails;

  /** Human-readable match reasons */
  reasons: string[];

  /** Any confidence caps applied */
  appliedCaps: number[];

  /** Whether cross-currency conversion was needed */
  isCrossCurrency: boolean;
}

/**
 * Configuration for scoring
 */
export interface ScoringConfig {
  /** Supabase client for exchange rate lookups (required for cross-currency) */
  supabase?: SupabaseClient;

  /** Minimum score to be considered a match (default: 55) */
  minMatchScore?: number;

  /** Whether vendor matching is required (default: false) */
  requireVendorMatch?: boolean;

  /** Whether date matching is required (default: false) */
  requireDateMatch?: boolean;

  /** Custom score weights */
  weights?: {
    amount?: number;
    date?: number;
    vendor?: number;
  };
}

/**
 * Get confidence level from score
 *
 * @param score - Composite score (0-100)
 * @returns Confidence level
 */
export function getConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= CONFIDENCE_THRESHOLDS.HIGH) return 'HIGH';
  if (score >= CONFIDENCE_THRESHOLDS.MEDIUM) return 'MEDIUM';
  return 'LOW';
}

/**
 * Apply confidence caps and return final score
 *
 * @param rawScore - Uncapped composite score
 * @param caps - Array of confidence caps to apply
 * @returns Final score (minimum of raw score and all caps)
 */
function applyConfidenceCaps(rawScore: number, caps: number[]): number {
  if (caps.length === 0) return rawScore;
  return Math.min(rawScore, ...caps);
}

/**
 * Normalize individual matcher scores to their weight contribution
 *
 * @param matcherScore - Score from individual matcher
 * @param maxMatcherScore - Maximum score the matcher can return
 * @param weight - Weight for this matcher in composite score
 * @returns Weighted score contribution
 */
function normalizeScore(
  matcherScore: number,
  maxMatcherScore: number,
  weight: number
): number {
  if (maxMatcherScore === 0) return 0;
  return (matcherScore / maxMatcherScore) * weight;
}

/**
 * Calculate composite match score for a source transaction against a target
 *
 * @param source - Source transaction (from statement/email)
 * @param target - Target transaction (from database)
 * @param config - Optional scoring configuration
 * @returns Match result with score and details
 */
export async function calculateMatchScore(
  source: SourceTransaction,
  target: TargetTransaction,
  config: ScoringConfig = {}
): Promise<MatchResult> {
  const {
    supabase,
    minMatchScore = 55,
    requireVendorMatch = false,
    requireDateMatch = false,
    weights = {},
  } = config;

  const amountWeight = weights.amount ?? SCORE_WEIGHTS.AMOUNT;
  const dateWeight = weights.date ?? SCORE_WEIGHTS.DATE;
  const vendorWeight = weights.vendor ?? SCORE_WEIGHTS.VENDOR;

  const reasons: string[] = [];
  const appliedCaps: number[] = [];
  let conversion: ConversionResult | null = null;

  // Check if currencies match
  const isCrossCurrency =
    source.currency.toUpperCase() !== target.currency.toUpperCase();

  // === AMOUNT MATCHING ===
  let amountResult: AmountMatchResult;

  if (isCrossCurrency && supabase) {
    // Cross-currency: need to convert first
    const dateStr =
      typeof source.date === 'string'
        ? source.date
        : source.date.toISOString().split('T')[0];

    conversion = await convertAmount(
      supabase,
      source.amount,
      source.currency,
      target.currency,
      dateStr
    );

    if (conversion) {
      // Compare converted amount
      amountResult = compareCurrencyAmounts(
        source.amount,
        source.currency,
        target.amount,
        target.currency,
        conversion.convertedAmount
      );

      // Apply rate quality adjustment if using approximate rate
      if (!conversion.isExactRate) {
        const rateQuality = getRateQualityScore(conversion.rateDaysDiff);
        if (rateQuality < 100) {
          // Reduce amount score slightly for approximate rates
          const qualityFactor = rateQuality / 100;
          amountResult = {
            ...amountResult,
            score: Math.round(amountResult.score * qualityFactor),
            reason: `${amountResult.reason} (rate quality: ${rateQuality}%)`,
          };
        }
      }
    } else {
      // No conversion available - can't compare amounts accurately
      amountResult = {
        score: 0,
        percentDiff: 100,
        isMatch: false,
        confidenceCap: 50,
        reason: `Cannot convert ${source.currency} to ${target.currency} - no exchange rate found`,
      };
    }
  } else if (isCrossCurrency && !supabase) {
    // Cross-currency but no supabase client provided
    amountResult = {
      score: 0,
      percentDiff: 100,
      isMatch: false,
      confidenceCap: 50,
      reason: `Cross-currency comparison requires exchange rate lookup`,
    };
  } else {
    // Same currency - direct comparison
    amountResult = compareAmounts(source.amount, target.amount);
  }

  reasons.push(`Amount: ${amountResult.reason}`);
  if (amountResult.confidenceCap) {
    appliedCaps.push(amountResult.confidenceCap);
  }

  // === DATE MATCHING ===
  const dateResult = compareDates(source.date, target.date);
  reasons.push(`Date: ${dateResult.reason}`);
  if (dateResult.confidenceCap) {
    appliedCaps.push(dateResult.confidenceCap);
  }

  // === VENDOR MATCHING ===
  const vendorResult = compareVendors(source.vendor, target.vendor);
  reasons.push(`Vendor: ${vendorResult.reason}`);

  // === CALCULATE COMPOSITE SCORE ===
  // Normalize each component to its weight contribution
  const amountContribution = normalizeScore(amountResult.score, 40, amountWeight);
  const dateContribution = normalizeScore(dateResult.score, 30, dateWeight);
  const vendorContribution = normalizeScore(vendorResult.score, 30, vendorWeight);

  let rawScore = amountContribution + dateContribution + vendorContribution;

  // Round to nearest integer
  rawScore = Math.round(rawScore);

  // Apply confidence caps
  const finalScore = applyConfidenceCaps(rawScore, appliedCaps);

  // Determine if this is a valid match
  let isMatch = finalScore >= minMatchScore;

  // Apply additional requirements
  if (requireVendorMatch && !vendorResult.isMatch) {
    isMatch = false;
    reasons.push('Vendor match required but not found');
  }

  if (requireDateMatch && !dateResult.isMatch) {
    isMatch = false;
    reasons.push('Date match required but not found');
  }

  const confidence = getConfidenceLevel(finalScore);

  return {
    targetId: target.id,
    score: finalScore,
    confidence,
    isMatch,
    details: {
      amount: amountResult,
      date: dateResult,
      vendor: vendorResult,
      conversion,
    },
    reasons,
    appliedCaps,
    isCrossCurrency,
  };
}

/**
 * Calculate match scores for a source transaction against multiple targets
 *
 * @param source - Source transaction
 * @param targets - Array of target transactions
 * @param config - Optional scoring configuration
 * @returns Array of match results sorted by score (descending)
 */
export async function calculateMatchScores(
  source: SourceTransaction,
  targets: TargetTransaction[],
  config: ScoringConfig = {}
): Promise<MatchResult[]> {
  if (targets.length === 0) return [];

  const results: MatchResult[] = [];

  for (const target of targets) {
    const result = await calculateMatchScore(source, target, config);
    results.push(result);
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  return results;
}

/**
 * Find the best match for a source transaction
 *
 * @param source - Source transaction
 * @param targets - Array of target transactions
 * @param config - Optional scoring configuration
 * @returns Best match result or null if no valid matches
 */
export async function findBestMatch(
  source: SourceTransaction,
  targets: TargetTransaction[],
  config: ScoringConfig = {}
): Promise<MatchResult | null> {
  const results = await calculateMatchScores(source, targets, config);

  if (results.length === 0) return null;

  // Return best match if it meets threshold
  const best = results[0];
  return best.isMatch ? best : null;
}

/**
 * Get match statistics for a set of results
 *
 * @param results - Array of match results
 * @returns Statistics about the matches
 */
export function getMatchStatistics(results: MatchResult[]): {
  total: number;
  matched: number;
  highConfidence: number;
  mediumConfidence: number;
  lowConfidence: number;
  avgScore: number;
  crossCurrency: number;
} {
  const matched = results.filter((r) => r.isMatch);
  const highConfidence = results.filter((r) => r.confidence === 'HIGH');
  const mediumConfidence = results.filter((r) => r.confidence === 'MEDIUM');
  const lowConfidence = results.filter((r) => r.confidence === 'LOW');
  const crossCurrency = results.filter((r) => r.isCrossCurrency);

  const totalScore = results.reduce((sum, r) => sum + r.score, 0);
  const avgScore = results.length > 0 ? totalScore / results.length : 0;

  return {
    total: results.length,
    matched: matched.length,
    highConfidence: highConfidence.length,
    mediumConfidence: mediumConfidence.length,
    lowConfidence: lowConfidence.length,
    avgScore: Math.round(avgScore * 10) / 10,
    crossCurrency: crossCurrency.length,
  };
}

/**
 * Format a match result for logging/debugging
 */
export function formatMatchResult(result: MatchResult): string {
  const lines = [
    `Target: ${result.targetId}`,
    `Score: ${result.score} (${result.confidence})`,
    `Match: ${result.isMatch ? 'YES' : 'NO'}`,
    `Cross-currency: ${result.isCrossCurrency ? 'YES' : 'NO'}`,
    '',
    'Breakdown:',
    `  Amount: ${result.details.amount.score}/40 - ${result.details.amount.reason}`,
    `  Date: ${result.details.date.score}/30 - ${result.details.date.reason}`,
    `  Vendor: ${result.details.vendor.score}/30 - ${result.details.vendor.reason}`,
  ];

  if (result.details.conversion) {
    lines.push('');
    lines.push('Conversion:');
    lines.push(
      `  ${result.details.conversion.fromCurrency} ${result.details.conversion.originalAmount} → ${result.details.conversion.toCurrency} ${result.details.conversion.convertedAmount.toFixed(2)}`
    );
    lines.push(
      `  Rate: ${result.details.conversion.rate} (${result.details.conversion.isExactRate ? 'exact' : 'approximate'})`
    );
  }

  if (result.appliedCaps.length > 0) {
    lines.push('');
    lines.push(`Caps applied: ${result.appliedCaps.join(', ')}`);
  }

  return lines.join('\n');
}
