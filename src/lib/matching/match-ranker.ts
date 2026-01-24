/**
 * Match Suggestion Ranker
 *
 * Ranks potential matches for statement/email transactions and provides
 * suggestions for the review queue. Returns top matches with status indicators.
 *
 * Match Statuses:
 * - 'matched': Single high-confidence match found
 * - 'multiple_matches': Multiple candidates, needs review
 * - 'no_match': No suitable matches found
 * - 'low_confidence': Matches found but confidence too low
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import {
  type SourceTransaction,
  type TargetTransaction,
  type MatchResult,
  type ScoringConfig,
  calculateMatchScores,
  getMatchStatistics,
  CONFIDENCE_THRESHOLDS,
} from './match-scorer';

/**
 * Match status types
 */
export type MatchStatus =
  | 'matched'
  | 'multiple_matches'
  | 'no_match'
  | 'low_confidence';

/**
 * Ranked suggestion result
 */
export interface RankedSuggestion {
  /** Status of the match attempt */
  status: MatchStatus;

  /** Top match suggestions (up to 3) */
  suggestions: MatchResult[];

  /** Best match if single clear winner */
  bestMatch: MatchResult | null;

  /** Statistics about all candidates considered */
  stats: {
    totalCandidates: number;
    matchingCandidates: number;
    highConfidenceCount: number;
    avgScore: number;
  };

  /** Reason for the status */
  reason: string;

  /** Whether this requires manual review */
  requiresReview: boolean;
}

/**
 * Batch ranking result
 */
export interface BatchRankingResult {
  /** Results keyed by source transaction index */
  results: Map<number, RankedSuggestion>;

  /** Summary statistics */
  summary: {
    total: number;
    matched: number;
    multipleMatches: number;
    noMatch: number;
    lowConfidence: number;
    requiresReview: number;
  };
}

/**
 * Configuration for ranking
 */
export interface RankingConfig extends ScoringConfig {
  /** Maximum suggestions to return (default: 3) */
  maxSuggestions?: number;

  /** Score threshold for automatic match (default: 90) */
  autoMatchThreshold?: number;

  /** Minimum gap between top two scores to be considered "clear winner" (default: 10) */
  clearWinnerGap?: number;

  /** Score below which matches are considered low confidence (default: 55) */
  lowConfidenceThreshold?: number;
}

/**
 * Determine match status based on ranked results
 *
 * @param rankedResults - Sorted match results (descending by score)
 * @param config - Ranking configuration
 * @returns Match status and reason
 */
function determineStatus(
  rankedResults: MatchResult[],
  config: RankingConfig
): { status: MatchStatus; reason: string } {
  const {
    autoMatchThreshold = CONFIDENCE_THRESHOLDS.HIGH,
    clearWinnerGap = 10,
    lowConfidenceThreshold = CONFIDENCE_THRESHOLDS.MEDIUM,
  } = config;

  // No matches at all
  if (rankedResults.length === 0) {
    return {
      status: 'no_match',
      reason: 'No candidates found within search criteria',
    };
  }

  // Filter to valid matches only
  const validMatches = rankedResults.filter((r) => r.isMatch);

  if (validMatches.length === 0) {
    return {
      status: 'no_match',
      reason: 'No candidates met minimum matching threshold',
    };
  }

  const topScore = validMatches[0].score;

  // All matches below low confidence threshold
  if (topScore < lowConfidenceThreshold) {
    return {
      status: 'low_confidence',
      reason: `Best match score (${topScore}) below confidence threshold (${lowConfidenceThreshold})`,
    };
  }

  // Single high-confidence match
  if (topScore >= autoMatchThreshold) {
    // Check if there's a clear winner
    if (validMatches.length === 1) {
      return {
        status: 'matched',
        reason: `Single high-confidence match found (score: ${topScore})`,
      };
    }

    const secondScore = validMatches[1].score;
    const gap = topScore - secondScore;

    if (gap >= clearWinnerGap) {
      return {
        status: 'matched',
        reason: `Clear winner with ${gap}-point gap (${topScore} vs ${secondScore})`,
      };
    }

    // Multiple high-confidence matches
    return {
      status: 'multiple_matches',
      reason: `Multiple high-confidence matches (top: ${topScore}, second: ${secondScore})`,
    };
  }

  // Medium confidence with multiple candidates
  if (validMatches.length > 1) {
    return {
      status: 'multiple_matches',
      reason: `Multiple candidates found (top score: ${topScore})`,
    };
  }

  // Single medium confidence match
  return {
    status: 'matched',
    reason: `Single match found (score: ${topScore})`,
  };
}

/**
 * Rank match suggestions for a source transaction
 *
 * @param source - Source transaction (from statement/email)
 * @param targets - Array of candidate target transactions
 * @param config - Optional ranking configuration
 * @returns Ranked suggestion with status and top matches
 */
export async function rankMatches(
  source: SourceTransaction,
  targets: TargetTransaction[],
  config: RankingConfig = {}
): Promise<RankedSuggestion> {
  const { maxSuggestions = 3 } = config;

  // No candidates
  if (targets.length === 0) {
    return {
      status: 'no_match',
      suggestions: [],
      bestMatch: null,
      stats: {
        totalCandidates: 0,
        matchingCandidates: 0,
        highConfidenceCount: 0,
        avgScore: 0,
      },
      reason: 'No candidate transactions provided',
      requiresReview: false,
    };
  }

  // Calculate scores for all candidates
  const rankedResults = await calculateMatchScores(source, targets, config);
  const stats = getMatchStatistics(rankedResults);

  // Determine status
  const { status, reason } = determineStatus(rankedResults, config);

  // Get top suggestions (only valid matches)
  const validMatches = rankedResults.filter((r) => r.isMatch);
  const suggestions = validMatches.slice(0, maxSuggestions);

  // Determine best match
  let bestMatch: MatchResult | null = null;
  if (status === 'matched' && suggestions.length > 0) {
    bestMatch = suggestions[0];
  }

  // Determine if review is required
  const requiresReview =
    status === 'multiple_matches' ||
    status === 'low_confidence' ||
    (status === 'matched' && suggestions[0].confidence !== 'HIGH');

  return {
    status,
    suggestions,
    bestMatch,
    stats: {
      totalCandidates: targets.length,
      matchingCandidates: stats.matched,
      highConfidenceCount: stats.highConfidence,
      avgScore: stats.avgScore,
    },
    reason,
    requiresReview,
  };
}

/**
 * Rank matches for multiple source transactions in batch
 *
 * @param sources - Array of source transactions
 * @param targetsBySource - Function or map to get targets for each source
 * @param config - Optional ranking configuration
 * @returns Batch ranking results with summary
 */
export async function rankMatchesBatch(
  sources: SourceTransaction[],
  targetsBySource: (source: SourceTransaction, index: number) => TargetTransaction[] | Promise<TargetTransaction[]>,
  config: RankingConfig = {}
): Promise<BatchRankingResult> {
  const results = new Map<number, RankedSuggestion>();

  let matched = 0;
  let multipleMatches = 0;
  let noMatch = 0;
  let lowConfidence = 0;
  let requiresReview = 0;

  for (let i = 0; i < sources.length; i++) {
    const source = sources[i];
    const targets = await targetsBySource(source, i);
    const result = await rankMatches(source, targets, config);

    results.set(i, result);

    // Update summary counts
    switch (result.status) {
      case 'matched':
        matched++;
        break;
      case 'multiple_matches':
        multipleMatches++;
        break;
      case 'no_match':
        noMatch++;
        break;
      case 'low_confidence':
        lowConfidence++;
        break;
    }

    if (result.requiresReview) {
      requiresReview++;
    }
  }

  return {
    results,
    summary: {
      total: sources.length,
      matched,
      multipleMatches,
      noMatch,
      lowConfidence,
      requiresReview,
    },
  };
}

/**
 * Quick helper to get the best suggestion from ranking
 *
 * @param suggestion - Ranked suggestion
 * @returns Best target ID or null
 */
export function getBestTargetId(suggestion: RankedSuggestion): string | null {
  if (suggestion.bestMatch) {
    return suggestion.bestMatch.targetId;
  }
  if (suggestion.suggestions.length > 0) {
    return suggestion.suggestions[0].targetId;
  }
  return null;
}

/**
 * Check if a suggestion should be auto-approved
 *
 * @param suggestion - Ranked suggestion
 * @returns Whether the match can be auto-approved
 */
export function canAutoApprove(suggestion: RankedSuggestion): boolean {
  return (
    suggestion.status === 'matched' &&
    suggestion.bestMatch !== null &&
    suggestion.bestMatch.confidence === 'HIGH' &&
    !suggestion.requiresReview
  );
}

/**
 * Format suggestion for display
 */
export function formatSuggestion(suggestion: RankedSuggestion): string {
  const lines: string[] = [
    `Status: ${suggestion.status}`,
    `Reason: ${suggestion.reason}`,
    `Requires Review: ${suggestion.requiresReview ? 'YES' : 'NO'}`,
    '',
    `Stats: ${suggestion.stats.matchingCandidates}/${suggestion.stats.totalCandidates} candidates matched`,
    `High confidence: ${suggestion.stats.highConfidenceCount}`,
    `Average score: ${suggestion.stats.avgScore}`,
  ];

  if (suggestion.suggestions.length > 0) {
    lines.push('');
    lines.push('Top Suggestions:');
    suggestion.suggestions.forEach((s, i) => {
      lines.push(
        `  ${i + 1}. ${s.targetId} - Score: ${s.score} (${s.confidence})`
      );
    });
  }

  if (suggestion.bestMatch) {
    lines.push('');
    lines.push(`Best Match: ${suggestion.bestMatch.targetId}`);
  }

  return lines.join('\n');
}

/**
 * Filter suggestions by status
 */
export function filterByStatus(
  results: Map<number, RankedSuggestion>,
  status: MatchStatus
): Map<number, RankedSuggestion> {
  const filtered = new Map<number, RankedSuggestion>();
  Array.from(results.entries()).forEach(([index, suggestion]) => {
    if (suggestion.status === status) {
      filtered.set(index, suggestion);
    }
  });
  return filtered;
}

/**
 * Get all suggestions requiring review
 */
export function getReviewRequired(
  results: Map<number, RankedSuggestion>
): Map<number, RankedSuggestion> {
  const filtered = new Map<number, RankedSuggestion>();
  Array.from(results.entries()).forEach(([index, suggestion]) => {
    if (suggestion.requiresReview) {
      filtered.set(index, suggestion);
    }
  });
  return filtered;
}
