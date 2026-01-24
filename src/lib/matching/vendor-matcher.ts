/**
 * Vendor Fuzzy Matching Algorithm
 *
 * Matches vendor names using fuzzy string comparison.
 * Handles abbreviations, typos, and format variations.
 *
 * Scoring:
 * - Exact match: 30 points (max)
 * - Normalized exact: 28 points
 * - High similarity (>90%): 25 points
 * - Good similarity (>80%): 20 points
 * - Moderate similarity (>70%): 15 points
 * - Low similarity (>60%): 10 points
 * - Alias/alternate name match: 25 points
 */

/**
 * Vendor match result
 */
export interface VendorMatchResult {
  /** Score contribution (0-30) */
  score: number;

  /** Similarity percentage (0-100) */
  similarity: number;

  /** Whether vendors match */
  isMatch: boolean;

  /** Type of match found */
  matchType: 'exact' | 'normalized' | 'fuzzy' | 'alias' | 'none';

  /** Reason for the score */
  reason: string;
}

/**
 * Configuration for vendor matching
 */
export interface VendorMatchConfig {
  /** Minimum similarity for a match (default: 60) */
  minSimilarity?: number;

  /** Known aliases for vendor matching */
  aliases?: Map<string, string[]>;

  /** Whether to use strict matching (default: false) */
  strictMode?: boolean;
}

// Score weights based on match type
const SCORE_THRESHOLDS = {
  EXACT: { score: 30 },
  NORMALIZED: { score: 28 },
  HIGH_SIMILARITY: { minSimilarity: 90, score: 25 },
  GOOD_SIMILARITY: { minSimilarity: 80, score: 20 },
  MODERATE_SIMILARITY: { minSimilarity: 70, score: 15 },
  LOW_SIMILARITY: { minSimilarity: 60, score: 10 },
  ALIAS: { score: 25 },
};

// Common vendor name patterns to normalize
const NORMALIZATION_PATTERNS: [RegExp, string][] = [
  // Remove common suffixes
  [/\s+(inc|llc|ltd|corp|co|company|corporation)\.?$/i, ''],
  // Remove location identifiers
  [/\s*#\d+$/i, ''],
  [/\s*-\s*\d+$/i, ''],
  // Remove asterisks (common in statements)
  [/\*/g, ''],
  // Remove extra whitespace
  [/\s+/g, ' '],
  // Remove leading/trailing punctuation
  [/^[^\w]+|[^\w]+$/g, ''],
];

// Common vendor aliases (statement name -> canonical name)
const DEFAULT_ALIASES: Map<string, string[]> = new Map([
  ['starbucks', ['starbucks coffee', 'sbux', 'starbux']],
  ['amazon', ['amzn', 'amz', 'amazon.com', 'amazon marketplace', 'amazon prime']],
  ['uber', ['uber technologies', 'uber trip', 'uber eats']],
  ['lyft', ['lyft ride']],
  ['mcdonalds', ["mcdonald's", 'mcd', 'mcds']],
  ['7-eleven', ['7-11', '7 eleven', 'seven eleven']],
  ['grab', ['grab*', 'grabpay', 'grabfood']],
  ['line', ['line pay', 'linepay', 'line man']],
  ['lazada', ['lazada.co.th', 'lazada thailand']],
  ['shopee', ['shopee.co.th', 'shopeepay']],
  ['foodpanda', ['food panda', 'pandamart']],
]);

/**
 * Normalize a vendor name for comparison
 *
 * @param name - Vendor name to normalize
 * @returns Normalized name (lowercase, trimmed, cleaned)
 */
export function normalizeVendorName(name: string): string {
  let normalized = name.toLowerCase().trim();

  for (const [pattern, replacement] of NORMALIZATION_PATTERNS) {
    normalized = normalized.replace(pattern, replacement);
  }

  return normalized.trim();
}

/**
 * Calculate Levenshtein distance between two strings
 *
 * @param str1 - First string
 * @param str2 - Second string
 * @returns Edit distance
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;

  // Create matrix
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  // Initialize base cases
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  // Fill matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // deletion
        dp[i][j - 1] + 1, // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return dp[m][n];
}

/**
 * Calculate similarity percentage between two strings
 *
 * @param str1 - First string
 * @param str2 - Second string
 * @returns Similarity percentage (0-100)
 */
export function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 100;
  if (str1.length === 0 || str2.length === 0) return 0;

  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);

  return Math.round((1 - distance / maxLength) * 100);
}

/**
 * Check if vendor name matches any alias
 *
 * @param name - Normalized vendor name to check
 * @param aliases - Alias map
 * @returns Canonical name if alias found, undefined otherwise
 */
function checkAliases(
  name: string,
  aliases: Map<string, string[]>
): string | undefined {
  // Check if name is a canonical name
  if (aliases.has(name)) {
    return name;
  }

  // Check if name is an alias
  const aliasEntries = Array.from(aliases.entries());
  for (const [canonical, aliasList] of aliasEntries) {
    if (aliasList.some((alias) => normalizeVendorName(alias) === name)) {
      return canonical;
    }
  }

  return undefined;
}

/**
 * Compare two vendor names and return a match result
 *
 * @param sourceVendor - Vendor from source (e.g., email/statement)
 * @param targetVendor - Vendor to match against (e.g., database transaction)
 * @param config - Optional configuration
 * @returns Match result with score and details
 */
export function compareVendors(
  sourceVendor: string,
  targetVendor: string,
  config: VendorMatchConfig = {}
): VendorMatchResult {
  const {
    minSimilarity = 60,
    aliases = DEFAULT_ALIASES,
    strictMode = false,
  } = config;

  // Exact match (case-sensitive)
  if (sourceVendor === targetVendor) {
    return {
      score: SCORE_THRESHOLDS.EXACT.score,
      similarity: 100,
      isMatch: true,
      matchType: 'exact',
      reason: 'Vendor names match exactly',
    };
  }

  // Normalized match
  const normalizedSource = normalizeVendorName(sourceVendor);
  const normalizedTarget = normalizeVendorName(targetVendor);

  if (normalizedSource === normalizedTarget) {
    return {
      score: SCORE_THRESHOLDS.NORMALIZED.score,
      similarity: 100,
      isMatch: true,
      matchType: 'normalized',
      reason: 'Vendor names match after normalization',
    };
  }

  // Alias match
  const sourceCanonical = checkAliases(normalizedSource, aliases);
  const targetCanonical = checkAliases(normalizedTarget, aliases);

  if (
    sourceCanonical &&
    targetCanonical &&
    sourceCanonical === targetCanonical
  ) {
    return {
      score: SCORE_THRESHOLDS.ALIAS.score,
      similarity: 100,
      isMatch: true,
      matchType: 'alias',
      reason: `Both map to canonical name: ${sourceCanonical}`,
    };
  }

  if (sourceCanonical && normalizedTarget === sourceCanonical) {
    return {
      score: SCORE_THRESHOLDS.ALIAS.score,
      similarity: 100,
      isMatch: true,
      matchType: 'alias',
      reason: `"${sourceVendor}" is an alias for "${targetVendor}"`,
    };
  }

  if (targetCanonical && normalizedSource === targetCanonical) {
    return {
      score: SCORE_THRESHOLDS.ALIAS.score,
      similarity: 100,
      isMatch: true,
      matchType: 'alias',
      reason: `"${targetVendor}" is an alias for "${sourceVendor}"`,
    };
  }

  // In strict mode, don't do fuzzy matching
  if (strictMode) {
    return {
      score: 0,
      similarity: calculateSimilarity(normalizedSource, normalizedTarget),
      isMatch: false,
      matchType: 'none',
      reason: 'No exact or alias match found (strict mode)',
    };
  }

  // Fuzzy match using Levenshtein distance
  const similarity = calculateSimilarity(normalizedSource, normalizedTarget);

  if (similarity >= SCORE_THRESHOLDS.HIGH_SIMILARITY.minSimilarity) {
    return {
      score: SCORE_THRESHOLDS.HIGH_SIMILARITY.score,
      similarity,
      isMatch: true,
      matchType: 'fuzzy',
      reason: `High similarity match (${similarity}%)`,
    };
  }

  if (similarity >= SCORE_THRESHOLDS.GOOD_SIMILARITY.minSimilarity) {
    return {
      score: SCORE_THRESHOLDS.GOOD_SIMILARITY.score,
      similarity,
      isMatch: true,
      matchType: 'fuzzy',
      reason: `Good similarity match (${similarity}%)`,
    };
  }

  if (similarity >= SCORE_THRESHOLDS.MODERATE_SIMILARITY.minSimilarity) {
    return {
      score: SCORE_THRESHOLDS.MODERATE_SIMILARITY.score,
      similarity,
      isMatch: true,
      matchType: 'fuzzy',
      reason: `Moderate similarity match (${similarity}%)`,
    };
  }

  if (similarity >= minSimilarity) {
    return {
      score: SCORE_THRESHOLDS.LOW_SIMILARITY.score,
      similarity,
      isMatch: true,
      matchType: 'fuzzy',
      reason: `Low similarity match (${similarity}%)`,
    };
  }

  // No match
  return {
    score: 0,
    similarity,
    isMatch: false,
    matchType: 'none',
    reason: `Similarity too low (${similarity}% < ${minSimilarity}% threshold)`,
  };
}

/**
 * Find best vendor match from a list of candidates
 *
 * @param sourceVendor - Vendor to match
 * @param candidates - Array of candidate vendor names
 * @param config - Optional configuration
 * @returns Best match index and result, or null if no match
 */
export function findBestVendorMatch(
  sourceVendor: string,
  candidates: string[],
  config?: VendorMatchConfig
): { index: number; result: VendorMatchResult } | null {
  if (candidates.length === 0) return null;

  let bestMatch: { index: number; result: VendorMatchResult } | null = null;

  for (let i = 0; i < candidates.length; i++) {
    const result = compareVendors(sourceVendor, candidates[i], config);

    if (bestMatch === null || result.score > bestMatch.result.score) {
      bestMatch = { index: i, result };
    }

    // Short-circuit on exact match
    if (result.matchType === 'exact') {
      break;
    }
  }

  return bestMatch;
}

/**
 * Check if two vendor names are likely the same vendor
 *
 * @param vendor1 - First vendor name
 * @param vendor2 - Second vendor name
 * @returns Whether vendors likely match
 */
export function isLikelyMatch(vendor1: string, vendor2: string): boolean {
  const result = compareVendors(vendor1, vendor2);
  return result.isMatch;
}

/**
 * Extract core vendor name from statement description
 * Removes transaction codes, dates, and other noise
 *
 * @param description - Full transaction description
 * @returns Extracted vendor name
 */
export function extractVendorFromDescription(description: string): string {
  let vendor = description;

  // Remove common prefixes (POS, DEBIT, etc) - only at start, handles multiple
  vendor = vendor.replace(/^(POS\s+)?(ATM\s+)?(DEBIT\s+)?(CREDIT\s+)?(PURCHASE\s+)?(PAYMENT\s+)?/i, '');

  // Remove dates in various formats
  vendor = vendor.replace(/\s*\d{2}\/\d{2}(\/\d{2,4})?/g, '');
  vendor = vendor.replace(/\s*\d{4}-\d{2}-\d{2}/g, '');

  // Remove transaction codes (alphanumeric sequences that are mostly digits)
  // Only match sequences with at least 4 digits in a row
  vendor = vendor.replace(/\s+[A-Z]*\d{4,}[A-Z0-9]*/gi, '');

  // Remove trailing location codes (2 letter state codes)
  vendor = vendor.replace(/\s+[A-Z]{2}\s*$/i, '');

  // Clean up
  return normalizeVendorName(vendor);
}

/**
 * Add custom aliases to the default alias map
 *
 * @param aliases - New aliases to add
 * @returns Combined alias map
 */
export function createAliasMap(
  aliases: Record<string, string[]>
): Map<string, string[]> {
  const combined = new Map(DEFAULT_ALIASES);

  for (const [canonical, aliasList] of Object.entries(aliases)) {
    const normalized = normalizeVendorName(canonical);
    const existing = combined.get(normalized) || [];
    combined.set(normalized, [...existing, ...aliasList]);
  }

  return combined;
}

// Export score thresholds for use in scoring algorithm
export { SCORE_THRESHOLDS as VENDOR_SCORE_THRESHOLDS, DEFAULT_ALIASES };
