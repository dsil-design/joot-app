/**
 * Transaction Matching Module
 *
 * Provides algorithms for matching transactions from statements/emails
 * to existing database transactions.
 */

// Amount matching
export {
  type AmountMatchResult,
  type AmountMatchConfig,
  calculatePercentDiff,
  compareAmounts,
  isWithinExchangeRateTolerance,
  compareCurrencyAmounts,
  findBestAmountMatch,
  SCORE_THRESHOLDS as AMOUNT_SCORE_THRESHOLDS,
} from './amount-matcher';

// Date matching
export {
  type DateMatchResult,
  type DateMatchConfig,
  calculateDaysDiff,
  compareDates,
  isWithinDateTolerance,
  findBestDateMatch,
  isDateInPeriod,
  getDateSearchWindow,
  formatDateForDisplay,
  DATE_SCORE_THRESHOLDS,
} from './date-matcher';

// Vendor fuzzy matching
export {
  type VendorMatchResult,
  type VendorMatchConfig,
  normalizeVendorName,
  levenshteinDistance,
  calculateSimilarity,
  compareVendors,
  findBestVendorMatch,
  isLikelyMatch,
  extractVendorFromDescription,
  createAliasMap,
  VENDOR_SCORE_THRESHOLDS,
  DEFAULT_ALIASES,
} from './vendor-matcher';

// Cross-currency conversion
export {
  type ConversionResult,
  type ConversionConfig,
  getExchangeRate,
  convertAmount,
  convertAmountsBatch,
  isWithinConversionTolerance,
  getRateQualityScore,
  formatConversionLog,
} from './cross-currency';

// Match scoring algorithm
export {
  type ConfidenceLevel,
  type SourceTransaction,
  type TargetTransaction,
  type MatchScoreDetails,
  type MatchResult,
  type ScoringConfig,
  SCORE_WEIGHTS,
  CONFIDENCE_THRESHOLDS,
  getConfidenceLevel,
  calculateMatchScore,
  calculateMatchScores,
  findBestMatch,
  getMatchStatistics,
  formatMatchResult,
} from './match-scorer';

// Match suggestion ranker
export {
  type MatchStatus,
  type RankedSuggestion,
  type BatchRankingResult,
  type RankingConfig,
  rankMatches,
  rankMatchesBatch,
  getBestTargetId,
  canAutoApprove,
  formatSuggestion,
  filterByStatus,
  getReviewRequired,
} from './match-ranker';
