/**
 * Date Matching Algorithm
 *
 * Compares transaction dates with tolerance for timing differences.
 * Accounts for processing delays, time zone differences, and posting dates.
 *
 * Scoring:
 * - Same day: 30 points (max)
 * - ±1 day: 25 points
 * - ±2 days: 20 points
 * - ±3 days: 15 points
 * - >3 days: reduces max confidence by 5 points per day
 */

/**
 * Date comparison result
 */
export interface DateMatchResult {
  /** Score contribution (0-30) */
  score: number;

  /** Number of days difference (absolute) */
  daysDiff: number;

  /** Whether dates are within acceptable tolerance */
  isMatch: boolean;

  /** Maximum confidence cap if any (undefined = no cap) */
  confidenceCap?: number;

  /** Reason for the score */
  reason: string;
}

/**
 * Configuration for date matching
 */
export interface DateMatchConfig {
  /** Maximum days difference for a match (default: 3) */
  maxDaysDiff?: number;

  /** Whether to use stricter matching for same-day priority (default: false) */
  strictMode?: boolean;
}

// Score weights based on days difference
const SCORE_THRESHOLDS = {
  SAME_DAY: { maxDays: 0, score: 30 },
  ONE_DAY: { maxDays: 1, score: 25 },
  TWO_DAYS: { maxDays: 2, score: 20 },
  THREE_DAYS: { maxDays: 3, score: 15 },
  FAR: { maxDays: Infinity, score: 0, confidenceReduction: 5 },
};

/**
 * Calculate days difference between two dates (ignoring time)
 *
 * @param date1 - First date
 * @param date2 - Second date
 * @returns Number of days difference (always positive)
 */
export function calculateDaysDiff(
  date1: Date | string,
  date2: Date | string
): number {
  const d1 = normalizeToMidnight(date1);
  const d2 = normalizeToMidnight(date2);

  const diffMs = Math.abs(d1.getTime() - d2.getTime());
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Normalize a date to midnight UTC for consistent comparison
 */
function normalizeToMidnight(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

/**
 * Compare two dates and return a match result
 *
 * @param sourceDate - Date from source (e.g., email/statement)
 * @param targetDate - Date to match against (e.g., database transaction)
 * @param config - Optional configuration
 * @returns Match result with score and details
 */
export function compareDates(
  sourceDate: Date | string,
  targetDate: Date | string,
  config: DateMatchConfig = {}
): DateMatchResult {
  const { maxDaysDiff = 3, strictMode = false } = config;

  const daysDiff = calculateDaysDiff(sourceDate, targetDate);

  // Same day - perfect match
  if (daysDiff === 0) {
    return {
      score: SCORE_THRESHOLDS.SAME_DAY.score,
      daysDiff,
      isMatch: true,
      reason: 'Dates match exactly (same day)',
    };
  }

  // In strict mode, only same-day matches get full score
  if (strictMode && daysDiff > 0) {
    const score = Math.max(0, SCORE_THRESHOLDS.SAME_DAY.score - daysDiff * 5);
    return {
      score,
      daysDiff,
      isMatch: daysDiff <= maxDaysDiff,
      reason: `Dates differ by ${daysDiff} day${daysDiff > 1 ? 's' : ''} (strict mode)`,
    };
  }

  // ±1 day
  if (daysDiff <= SCORE_THRESHOLDS.ONE_DAY.maxDays) {
    return {
      score: SCORE_THRESHOLDS.ONE_DAY.score,
      daysDiff,
      isMatch: true,
      reason: 'Dates within 1 day (excellent match)',
    };
  }

  // ±2 days
  if (daysDiff <= SCORE_THRESHOLDS.TWO_DAYS.maxDays) {
    return {
      score: SCORE_THRESHOLDS.TWO_DAYS.score,
      daysDiff,
      isMatch: true,
      reason: 'Dates within 2 days (good match)',
    };
  }

  // ±3 days
  if (daysDiff <= SCORE_THRESHOLDS.THREE_DAYS.maxDays) {
    return {
      score: SCORE_THRESHOLDS.THREE_DAYS.score,
      daysDiff,
      isMatch: true,
      reason: 'Dates within 3 days (acceptable match)',
    };
  }

  // Beyond acceptable threshold
  if (daysDiff <= maxDaysDiff) {
    // Still within custom maxDaysDiff but > 3 days
    const extraDays = daysDiff - SCORE_THRESHOLDS.THREE_DAYS.maxDays;
    const confidenceCap = 100 - extraDays * SCORE_THRESHOLDS.FAR.confidenceReduction;

    return {
      score: 0,
      daysDiff,
      isMatch: true,
      confidenceCap: Math.max(50, confidenceCap),
      reason: `Dates differ by ${daysDiff} days (weak match)`,
    };
  }

  // Too far apart
  return {
    score: 0,
    daysDiff,
    isMatch: false,
    reason: `Dates differ by ${daysDiff} days (exceeds ${maxDaysDiff}-day threshold)`,
  };
}

/**
 * Check if two dates are within the default ±3 day tolerance
 *
 * @param date1 - First date
 * @param date2 - Second date
 * @returns Whether the dates are within tolerance
 */
export function isWithinDateTolerance(
  date1: Date | string,
  date2: Date | string
): boolean {
  const daysDiff = calculateDaysDiff(date1, date2);
  return daysDiff <= SCORE_THRESHOLDS.THREE_DAYS.maxDays;
}

/**
 * Find best date match from a list of candidates
 *
 * @param sourceDate - Date to match
 * @param candidates - Array of candidate dates
 * @returns Best match index and result, or null if no match
 */
export function findBestDateMatch(
  sourceDate: Date | string,
  candidates: (Date | string)[]
): { index: number; result: DateMatchResult } | null {
  if (candidates.length === 0) return null;

  let bestMatch: { index: number; result: DateMatchResult } | null = null;

  for (let i = 0; i < candidates.length; i++) {
    const result = compareDates(sourceDate, candidates[i]);

    if (bestMatch === null || result.score > bestMatch.result.score) {
      bestMatch = { index: i, result };
    }

    // Short-circuit on same-day match
    if (result.score === SCORE_THRESHOLDS.SAME_DAY.score) {
      break;
    }
  }

  return bestMatch;
}

/**
 * Check if a date falls within a given period
 *
 * @param date - Date to check
 * @param periodStart - Start of period
 * @param periodEnd - End of period
 * @returns Whether date is within period (inclusive)
 */
export function isDateInPeriod(
  date: Date | string,
  periodStart: Date | string,
  periodEnd: Date | string
): boolean {
  const d = normalizeToMidnight(date);
  const start = normalizeToMidnight(periodStart);
  const end = normalizeToMidnight(periodEnd);

  return d >= start && d <= end;
}

/**
 * Get the date range for matching candidates
 * Expands the source date by the tolerance window
 *
 * @param date - Source date
 * @param toleranceDays - Days to expand in each direction (default: 3)
 * @returns Start and end dates for the search window
 */
export function getDateSearchWindow(
  date: Date | string,
  toleranceDays = 3
): { start: Date; end: Date } {
  const d = normalizeToMidnight(date);

  const start = new Date(d);
  start.setDate(start.getDate() - toleranceDays);

  const end = new Date(d);
  end.setDate(end.getDate() + toleranceDays);

  return { start, end };
}

/**
 * Format a date for display in match reasons
 */
export function formatDateForDisplay(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

// Export score thresholds for use in scoring algorithm
export { SCORE_THRESHOLDS as DATE_SCORE_THRESHOLDS };
