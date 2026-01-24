/**
 * Amount Matching Algorithm
 *
 * Compares transaction amounts with tolerance for minor differences.
 * Handles both same-currency and cross-currency comparisons.
 *
 * Scoring:
 * - Exact match: 40 points (max)
 * - Within ±2%: 35 points
 * - Within ±5%: 25 points
 * - Within ±10%: 15 points
 * - >10% difference: caps max confidence at 60
 */

/**
 * Amount comparison result
 */
export interface AmountMatchResult {
  /** Score contribution (0-40) */
  score: number;

  /** Percentage difference (0-100) */
  percentDiff: number;

  /** Whether amounts are within acceptable tolerance */
  isMatch: boolean;

  /** Maximum confidence cap if any (undefined = no cap) */
  confidenceCap?: number;

  /** Reason for the score */
  reason: string;
}

/**
 * Configuration for amount matching
 */
export interface AmountMatchConfig {
  /** Tolerance for exact match consideration (default: 0) */
  exactMatchTolerance?: number;

  /** Maximum percentage difference for a match (default: 10) */
  maxPercentDiff?: number;

  /** Whether to compare absolute values (default: true) */
  compareAbsolute?: boolean;
}

// Score weights based on percentage difference
const SCORE_THRESHOLDS = {
  EXACT: { maxDiff: 0, score: 40 },
  VERY_CLOSE: { maxDiff: 2, score: 35 },
  CLOSE: { maxDiff: 5, score: 25 },
  ACCEPTABLE: { maxDiff: 10, score: 15 },
  FAR: { maxDiff: Infinity, score: 0, confidenceCap: 60 },
};

/**
 * Calculate percentage difference between two amounts
 *
 * @param amount1 - First amount
 * @param amount2 - Second amount
 * @param useAbsolute - Whether to use absolute values
 * @returns Percentage difference (0-100+)
 */
export function calculatePercentDiff(
  amount1: number,
  amount2: number,
  useAbsolute = true
): number {
  const a1 = useAbsolute ? Math.abs(amount1) : amount1;
  const a2 = useAbsolute ? Math.abs(amount2) : amount2;

  if (a1 === 0 && a2 === 0) return 0;
  if (a1 === 0 || a2 === 0) return 100;

  const diff = Math.abs(a1 - a2);
  const avg = (a1 + a2) / 2;

  // Handle case where average is 0 (e.g., -100 and 100)
  if (avg === 0) return 100;

  return (diff / avg) * 100;
}

/**
 * Compare two amounts and return a match result
 *
 * @param sourceAmount - Amount from source (e.g., email/statement)
 * @param targetAmount - Amount to match against (e.g., database transaction)
 * @param config - Optional configuration
 * @returns Match result with score and details
 */
export function compareAmounts(
  sourceAmount: number,
  targetAmount: number,
  config: AmountMatchConfig = {}
): AmountMatchResult {
  const {
    exactMatchTolerance = 0,
    maxPercentDiff = 10,
    compareAbsolute = true,
  } = config;

  const percentDiff = calculatePercentDiff(sourceAmount, targetAmount, compareAbsolute);

  // Check for exact match (within tolerance)
  if (percentDiff <= exactMatchTolerance) {
    return {
      score: SCORE_THRESHOLDS.EXACT.score,
      percentDiff,
      isMatch: true,
      reason: 'Amounts match exactly',
    };
  }

  // Very close match (within ±2%)
  if (percentDiff <= SCORE_THRESHOLDS.VERY_CLOSE.maxDiff) {
    return {
      score: SCORE_THRESHOLDS.VERY_CLOSE.score,
      percentDiff,
      isMatch: true,
      reason: `Amounts within ${percentDiff.toFixed(1)}% (excellent match)`,
    };
  }

  // Close match (within ±5%)
  if (percentDiff <= SCORE_THRESHOLDS.CLOSE.maxDiff) {
    return {
      score: SCORE_THRESHOLDS.CLOSE.score,
      percentDiff,
      isMatch: true,
      reason: `Amounts within ${percentDiff.toFixed(1)}% (good match)`,
    };
  }

  // Acceptable match (within ±10%)
  if (percentDiff <= SCORE_THRESHOLDS.ACCEPTABLE.maxDiff) {
    return {
      score: SCORE_THRESHOLDS.ACCEPTABLE.score,
      percentDiff,
      isMatch: true,
      reason: `Amounts within ${percentDiff.toFixed(1)}% (acceptable match)`,
    };
  }

  // Beyond acceptable threshold
  if (percentDiff <= maxPercentDiff) {
    return {
      score: SCORE_THRESHOLDS.FAR.score,
      percentDiff,
      isMatch: false,
      confidenceCap: SCORE_THRESHOLDS.FAR.confidenceCap,
      reason: `Amounts differ by ${percentDiff.toFixed(1)}% (weak match)`,
    };
  }

  // Too far apart
  return {
    score: 0,
    percentDiff,
    isMatch: false,
    confidenceCap: SCORE_THRESHOLDS.FAR.confidenceCap,
    reason: `Amounts differ by ${percentDiff.toFixed(1)}% (exceeds ${maxPercentDiff}% threshold)`,
  };
}

/**
 * Check if two amounts are within the ±2% exchange rate tolerance
 * This is specifically for cross-currency matching where exchange rate
 * variance is expected.
 *
 * @param sourceAmount - Amount from source
 * @param convertedAmount - Amount after conversion
 * @returns Whether the amounts are within tolerance
 */
export function isWithinExchangeRateTolerance(
  sourceAmount: number,
  convertedAmount: number
): boolean {
  const percentDiff = calculatePercentDiff(sourceAmount, convertedAmount);
  return percentDiff <= 2;
}

/**
 * Compare amounts with currency-aware matching
 * Returns higher scores for same-currency exact matches,
 * and appropriate scores for cross-currency matches within tolerance.
 *
 * @param sourceAmount - Amount from source
 * @param sourceCurrency - Currency of source amount
 * @param targetAmount - Amount to match against
 * @param targetCurrency - Currency of target amount
 * @param convertedAmount - Optional pre-converted amount (if currencies differ)
 * @returns Match result with score and details
 */
export function compareCurrencyAmounts(
  sourceAmount: number,
  sourceCurrency: string,
  targetAmount: number,
  targetCurrency: string,
  convertedAmount?: number
): AmountMatchResult {
  // Same currency - direct comparison
  if (sourceCurrency.toUpperCase() === targetCurrency.toUpperCase()) {
    return compareAmounts(sourceAmount, targetAmount);
  }

  // Different currencies - need conversion
  if (convertedAmount === undefined) {
    return {
      score: 0,
      percentDiff: 100,
      isMatch: false,
      reason: 'Different currencies - conversion required for comparison',
    };
  }

  // Compare converted amount with tolerance for exchange rate variance
  const result = compareAmounts(convertedAmount, targetAmount, {
    exactMatchTolerance: 2, // Allow 2% tolerance for exchange rate variance
  });

  // Adjust reason for cross-currency context
  if (result.isMatch) {
    result.reason = `Cross-currency match: ${sourceCurrency} → ${targetCurrency}, ${result.reason}`;
  } else {
    result.reason = `Cross-currency comparison: ${sourceCurrency} → ${targetCurrency}, ${result.reason}`;
  }

  return result;
}

/**
 * Find best amount match from a list of candidates
 *
 * @param sourceAmount - Amount to match
 * @param candidates - Array of candidate amounts
 * @returns Best match index and result, or null if no match
 */
export function findBestAmountMatch(
  sourceAmount: number,
  candidates: number[]
): { index: number; result: AmountMatchResult } | null {
  if (candidates.length === 0) return null;

  let bestMatch: { index: number; result: AmountMatchResult } | null = null;

  for (let i = 0; i < candidates.length; i++) {
    const result = compareAmounts(sourceAmount, candidates[i]);

    if (bestMatch === null || result.score > bestMatch.result.score) {
      bestMatch = { index: i, result };
    }

    // Short-circuit on perfect match
    if (result.score === SCORE_THRESHOLDS.EXACT.score) {
      break;
    }
  }

  return bestMatch;
}

// Export score thresholds for use in scoring algorithm
export { SCORE_THRESHOLDS };
