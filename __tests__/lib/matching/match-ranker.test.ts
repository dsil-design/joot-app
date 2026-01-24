/**
 * Match Suggestion Ranker Tests
 */

import {
  type RankedSuggestion,
  type BatchRankingResult,
  rankMatches,
  rankMatchesBatch,
  getBestTargetId,
  canAutoApprove,
  formatSuggestion,
  filterByStatus,
  getReviewRequired,
} from '@/lib/matching/match-ranker';
import type { SourceTransaction, TargetTransaction } from '@/lib/matching/match-scorer';

describe('Match Suggestion Ranker', () => {
  describe('rankMatches', () => {
    describe('no match scenarios', () => {
      it('should return no_match when no candidates provided', async () => {
        const source: SourceTransaction = {
          amount: 100.00,
          currency: 'USD',
          date: '2024-01-15',
          vendor: 'Starbucks',
        };

        const result = await rankMatches(source, []);

        expect(result.status).toBe('no_match');
        expect(result.suggestions).toHaveLength(0);
        expect(result.bestMatch).toBeNull();
        expect(result.requiresReview).toBe(false);
        expect(result.stats.totalCandidates).toBe(0);
      });

      it('should return no_match when no candidates meet threshold', async () => {
        const source: SourceTransaction = {
          amount: 100.00,
          currency: 'USD',
          date: '2024-01-15',
          vendor: 'Starbucks',
        };

        const targets: TargetTransaction[] = [
          {
            id: 'txn-1',
            amount: 500.00, // Very different
            currency: 'USD',
            date: '2024-03-15', // 2 months later
            vendor: 'Walmart', // Different vendor
          },
        ];

        const result = await rankMatches(source, targets);

        expect(result.status).toBe('no_match');
        expect(result.suggestions).toHaveLength(0);
        expect(result.requiresReview).toBe(false);
      });
    });

    describe('single high-confidence match', () => {
      it('should return matched status for perfect match', async () => {
        const source: SourceTransaction = {
          amount: 100.00,
          currency: 'USD',
          date: '2024-01-15',
          vendor: 'Starbucks',
        };

        const targets: TargetTransaction[] = [
          {
            id: 'txn-1',
            amount: 100.00,
            currency: 'USD',
            date: '2024-01-15',
            vendor: 'Starbucks',
          },
        ];

        const result = await rankMatches(source, targets);

        expect(result.status).toBe('matched');
        expect(result.bestMatch).not.toBeNull();
        expect(result.bestMatch!.targetId).toBe('txn-1');
        expect(result.bestMatch!.score).toBe(100);
        expect(result.requiresReview).toBe(false);
      });

      it('should return matched with clear winner when gap is large', async () => {
        const source: SourceTransaction = {
          amount: 100.00,
          currency: 'USD',
          date: '2024-01-15',
          vendor: 'Starbucks',
        };

        const targets: TargetTransaction[] = [
          {
            id: 'txn-1',
            amount: 100.00,
            currency: 'USD',
            date: '2024-01-15',
            vendor: 'Starbucks', // Perfect match
          },
          {
            id: 'txn-2',
            amount: 100.00,
            currency: 'USD',
            date: '2024-01-20', // 5 days off
            vendor: 'Amazon', // Different vendor
          },
        ];

        const result = await rankMatches(source, targets);

        expect(result.status).toBe('matched');
        expect(result.bestMatch!.targetId).toBe('txn-1');
        expect(result.requiresReview).toBe(false);
      });
    });

    describe('multiple matches', () => {
      it('should return multiple_matches when no clear winner', async () => {
        const source: SourceTransaction = {
          amount: 100.00,
          currency: 'USD',
          date: '2024-01-15',
          vendor: 'Starbucks',
        };

        const targets: TargetTransaction[] = [
          {
            id: 'txn-1',
            amount: 100.00,
            currency: 'USD',
            date: '2024-01-15',
            vendor: 'Starbucks',
          },
          {
            id: 'txn-2',
            amount: 100.00,
            currency: 'USD',
            date: '2024-01-15',
            vendor: 'Starbucks', // Same as first
          },
        ];

        const result = await rankMatches(source, targets);

        expect(result.status).toBe('multiple_matches');
        expect(result.suggestions.length).toBeGreaterThan(1);
        expect(result.bestMatch).toBeNull();
        expect(result.requiresReview).toBe(true);
      });

      it('should return top 3 suggestions by default', async () => {
        const source: SourceTransaction = {
          amount: 100.00,
          currency: 'USD',
          date: '2024-01-15',
          vendor: 'Starbucks',
        };

        const targets: TargetTransaction[] = [
          { id: 'txn-1', amount: 100.00, currency: 'USD', date: '2024-01-15', vendor: 'Starbucks' },
          { id: 'txn-2', amount: 100.00, currency: 'USD', date: '2024-01-16', vendor: 'Starbucks' },
          { id: 'txn-3', amount: 100.00, currency: 'USD', date: '2024-01-17', vendor: 'Starbucks' },
          { id: 'txn-4', amount: 100.00, currency: 'USD', date: '2024-01-18', vendor: 'Starbucks' },
          { id: 'txn-5', amount: 100.00, currency: 'USD', date: '2024-01-19', vendor: 'Starbucks' },
        ];

        const result = await rankMatches(source, targets);

        expect(result.suggestions.length).toBeLessThanOrEqual(3);
      });

      it('should respect maxSuggestions config', async () => {
        const source: SourceTransaction = {
          amount: 100.00,
          currency: 'USD',
          date: '2024-01-15',
          vendor: 'Starbucks',
        };

        const targets: TargetTransaction[] = [
          { id: 'txn-1', amount: 100.00, currency: 'USD', date: '2024-01-15', vendor: 'Starbucks' },
          { id: 'txn-2', amount: 100.00, currency: 'USD', date: '2024-01-16', vendor: 'Starbucks' },
          { id: 'txn-3', amount: 100.00, currency: 'USD', date: '2024-01-17', vendor: 'Starbucks' },
        ];

        const result = await rankMatches(source, targets, { maxSuggestions: 2 });

        expect(result.suggestions.length).toBe(2);
      });
    });

    describe('low confidence matches', () => {
      it('should return low_confidence when best score is below threshold', async () => {
        const source: SourceTransaction = {
          amount: 100.00,
          currency: 'USD',
          date: '2024-01-15',
          vendor: 'Starbucks',
        };

        const targets: TargetTransaction[] = [
          {
            id: 'txn-1',
            amount: 120.00, // Different amount
            currency: 'USD',
            date: '2024-01-20', // 5 days off
            vendor: 'Walmart', // Different vendor
          },
        ];

        // Use low threshold to ensure we get a match but it's low confidence
        const result = await rankMatches(source, targets, {
          minMatchScore: 30, // Low threshold to get matches
        });

        // Depending on exact score, could be low_confidence or no_match
        expect(['low_confidence', 'no_match']).toContain(result.status);
        expect(result.requiresReview).toBe(result.status === 'low_confidence');
      });
    });

    describe('configuration options', () => {
      it('should respect autoMatchThreshold', async () => {
        const source: SourceTransaction = {
          amount: 100.00,
          currency: 'USD',
          date: '2024-01-15',
          vendor: 'Starbucks',
        };

        const targets: TargetTransaction[] = [
          {
            id: 'txn-1',
            amount: 100.00,
            currency: 'USD',
            date: '2024-01-16', // 1 day off
            vendor: 'STARBUCKS', // Normalized match
          },
        ];

        // High auto-match threshold - might require review
        const result = await rankMatches(source, targets, {
          autoMatchThreshold: 99,
        });

        // Should still be matched but might require review
        expect(result.status).toBe('matched');
      });

      it('should respect clearWinnerGap', async () => {
        const source: SourceTransaction = {
          amount: 100.00,
          currency: 'USD',
          date: '2024-01-15',
          vendor: 'Starbucks',
        };

        const targets: TargetTransaction[] = [
          {
            id: 'txn-1',
            amount: 100.00,
            currency: 'USD',
            date: '2024-01-15',
            vendor: 'Starbucks',
          },
          {
            id: 'txn-2',
            amount: 100.00,
            currency: 'USD',
            date: '2024-01-16',
            vendor: 'Starbucks',
          },
        ];

        // Large gap requirement
        const result = await rankMatches(source, targets, {
          clearWinnerGap: 20,
        });

        // Gap is small (100 vs ~95), so should be multiple_matches
        expect(result.status).toBe('multiple_matches');
      });
    });

    describe('statistics', () => {
      it('should calculate correct statistics', async () => {
        const source: SourceTransaction = {
          amount: 100.00,
          currency: 'USD',
          date: '2024-01-15',
          vendor: 'Starbucks',
        };

        const targets: TargetTransaction[] = [
          { id: 'txn-1', amount: 100.00, currency: 'USD', date: '2024-01-15', vendor: 'Starbucks' },
          { id: 'txn-2', amount: 100.00, currency: 'USD', date: '2024-01-20', vendor: 'Walmart' },
        ];

        const result = await rankMatches(source, targets);

        expect(result.stats.totalCandidates).toBe(2);
        expect(result.stats.matchingCandidates).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('rankMatchesBatch', () => {
    it('should rank multiple sources', async () => {
      const sources: SourceTransaction[] = [
        { amount: 100.00, currency: 'USD', date: '2024-01-15', vendor: 'Starbucks' },
        { amount: 50.00, currency: 'USD', date: '2024-01-16', vendor: 'Amazon' },
      ];

      const allTargets: TargetTransaction[] = [
        { id: 'txn-1', amount: 100.00, currency: 'USD', date: '2024-01-15', vendor: 'Starbucks' },
        { id: 'txn-2', amount: 50.00, currency: 'USD', date: '2024-01-16', vendor: 'Amazon' },
      ];

      const result = await rankMatchesBatch(
        sources,
        () => allTargets
      );

      expect(result.results.size).toBe(2);
      expect(result.summary.total).toBe(2);
    });

    it('should calculate correct summary', async () => {
      const sources: SourceTransaction[] = [
        { amount: 100.00, currency: 'USD', date: '2024-01-15', vendor: 'Starbucks' },
        { amount: 999.00, currency: 'USD', date: '2024-03-15', vendor: 'Unknown' },
      ];

      const targets: TargetTransaction[] = [
        { id: 'txn-1', amount: 100.00, currency: 'USD', date: '2024-01-15', vendor: 'Starbucks' },
      ];

      const result = await rankMatchesBatch(
        sources,
        () => targets
      );

      expect(result.summary.total).toBe(2);
      expect(result.summary.matched).toBeGreaterThanOrEqual(1);
    });

    it('should support async target getter', async () => {
      const sources: SourceTransaction[] = [
        { amount: 100.00, currency: 'USD', date: '2024-01-15', vendor: 'Starbucks' },
      ];

      const result = await rankMatchesBatch(
        sources,
        async (source, index) => {
          // Simulate async fetch
          await new Promise(resolve => setTimeout(resolve, 1));
          return [
            { id: `txn-${index}`, amount: source.amount, currency: source.currency, date: source.date as string, vendor: source.vendor },
          ];
        }
      );

      expect(result.results.size).toBe(1);
    });
  });

  describe('getBestTargetId', () => {
    it('should return bestMatch targetId when available', () => {
      const suggestion: RankedSuggestion = {
        status: 'matched',
        suggestions: [],
        bestMatch: {
          targetId: 'txn-123',
          score: 95,
          confidence: 'HIGH',
          isMatch: true,
          details: {} as any,
          reasons: [],
          appliedCaps: [],
          isCrossCurrency: false,
        },
        stats: { totalCandidates: 1, matchingCandidates: 1, highConfidenceCount: 1, avgScore: 95 },
        reason: 'Match found',
        requiresReview: false,
      };

      expect(getBestTargetId(suggestion)).toBe('txn-123');
    });

    it('should return first suggestion when no bestMatch', () => {
      const suggestion: RankedSuggestion = {
        status: 'multiple_matches',
        suggestions: [
          { targetId: 'txn-1', score: 85, confidence: 'MEDIUM', isMatch: true, details: {} as any, reasons: [], appliedCaps: [], isCrossCurrency: false },
          { targetId: 'txn-2', score: 80, confidence: 'MEDIUM', isMatch: true, details: {} as any, reasons: [], appliedCaps: [], isCrossCurrency: false },
        ],
        bestMatch: null,
        stats: { totalCandidates: 2, matchingCandidates: 2, highConfidenceCount: 0, avgScore: 82.5 },
        reason: 'Multiple matches',
        requiresReview: true,
      };

      expect(getBestTargetId(suggestion)).toBe('txn-1');
    });

    it('should return null when no suggestions', () => {
      const suggestion: RankedSuggestion = {
        status: 'no_match',
        suggestions: [],
        bestMatch: null,
        stats: { totalCandidates: 0, matchingCandidates: 0, highConfidenceCount: 0, avgScore: 0 },
        reason: 'No match',
        requiresReview: false,
      };

      expect(getBestTargetId(suggestion)).toBeNull();
    });
  });

  describe('canAutoApprove', () => {
    it('should return true for high-confidence match without review', () => {
      const suggestion: RankedSuggestion = {
        status: 'matched',
        suggestions: [],
        bestMatch: {
          targetId: 'txn-123',
          score: 95,
          confidence: 'HIGH',
          isMatch: true,
          details: {} as any,
          reasons: [],
          appliedCaps: [],
          isCrossCurrency: false,
        },
        stats: { totalCandidates: 1, matchingCandidates: 1, highConfidenceCount: 1, avgScore: 95 },
        reason: 'Match found',
        requiresReview: false,
      };

      expect(canAutoApprove(suggestion)).toBe(true);
    });

    it('should return false for medium-confidence match', () => {
      const suggestion: RankedSuggestion = {
        status: 'matched',
        suggestions: [],
        bestMatch: {
          targetId: 'txn-123',
          score: 75,
          confidence: 'MEDIUM',
          isMatch: true,
          details: {} as any,
          reasons: [],
          appliedCaps: [],
          isCrossCurrency: false,
        },
        stats: { totalCandidates: 1, matchingCandidates: 1, highConfidenceCount: 0, avgScore: 75 },
        reason: 'Match found',
        requiresReview: true,
      };

      expect(canAutoApprove(suggestion)).toBe(false);
    });

    it('should return false for multiple matches', () => {
      const suggestion: RankedSuggestion = {
        status: 'multiple_matches',
        suggestions: [],
        bestMatch: null,
        stats: { totalCandidates: 2, matchingCandidates: 2, highConfidenceCount: 2, avgScore: 90 },
        reason: 'Multiple matches',
        requiresReview: true,
      };

      expect(canAutoApprove(suggestion)).toBe(false);
    });

    it('should return false for no match', () => {
      const suggestion: RankedSuggestion = {
        status: 'no_match',
        suggestions: [],
        bestMatch: null,
        stats: { totalCandidates: 0, matchingCandidates: 0, highConfidenceCount: 0, avgScore: 0 },
        reason: 'No match',
        requiresReview: false,
      };

      expect(canAutoApprove(suggestion)).toBe(false);
    });
  });

  describe('formatSuggestion', () => {
    it('should format suggestion for display', () => {
      const suggestion: RankedSuggestion = {
        status: 'matched',
        suggestions: [
          { targetId: 'txn-1', score: 95, confidence: 'HIGH', isMatch: true, details: {} as any, reasons: [], appliedCaps: [], isCrossCurrency: false },
        ],
        bestMatch: {
          targetId: 'txn-1',
          score: 95,
          confidence: 'HIGH',
          isMatch: true,
          details: {} as any,
          reasons: [],
          appliedCaps: [],
          isCrossCurrency: false,
        },
        stats: { totalCandidates: 1, matchingCandidates: 1, highConfidenceCount: 1, avgScore: 95 },
        reason: 'Single high-confidence match',
        requiresReview: false,
      };

      const formatted = formatSuggestion(suggestion);

      expect(formatted).toContain('Status: matched');
      expect(formatted).toContain('Requires Review: NO');
      expect(formatted).toContain('txn-1');
      expect(formatted).toContain('95');
      expect(formatted).toContain('HIGH');
    });
  });

  describe('filterByStatus', () => {
    it('should filter results by status', () => {
      const results = new Map<number, RankedSuggestion>([
        [0, { status: 'matched', suggestions: [], bestMatch: null, stats: {} as any, reason: '', requiresReview: false }],
        [1, { status: 'no_match', suggestions: [], bestMatch: null, stats: {} as any, reason: '', requiresReview: false }],
        [2, { status: 'matched', suggestions: [], bestMatch: null, stats: {} as any, reason: '', requiresReview: false }],
      ]);

      const filtered = filterByStatus(results, 'matched');

      expect(filtered.size).toBe(2);
      expect(filtered.has(0)).toBe(true);
      expect(filtered.has(1)).toBe(false);
      expect(filtered.has(2)).toBe(true);
    });
  });

  describe('getReviewRequired', () => {
    it('should filter results requiring review', () => {
      const results = new Map<number, RankedSuggestion>([
        [0, { status: 'matched', suggestions: [], bestMatch: null, stats: {} as any, reason: '', requiresReview: false }],
        [1, { status: 'multiple_matches', suggestions: [], bestMatch: null, stats: {} as any, reason: '', requiresReview: true }],
        [2, { status: 'low_confidence', suggestions: [], bestMatch: null, stats: {} as any, reason: '', requiresReview: true }],
      ]);

      const filtered = getReviewRequired(results);

      expect(filtered.size).toBe(2);
      expect(filtered.has(0)).toBe(false);
      expect(filtered.has(1)).toBe(true);
      expect(filtered.has(2)).toBe(true);
    });
  });

  describe('real-world scenarios', () => {
    it('should handle Grab receipt matching', async () => {
      const source: SourceTransaction = {
        amount: 350.00,
        currency: 'THB',
        date: '2024-01-15',
        vendor: 'GrabFood',
      };

      const targets: TargetTransaction[] = [
        { id: 'txn-1', amount: 350.00, currency: 'THB', date: '2024-01-15', vendor: 'Grab' },
        { id: 'txn-2', amount: 350.00, currency: 'THB', date: '2024-01-16', vendor: 'FoodPanda' },
      ];

      const result = await rankMatches(source, targets);

      expect(result.status).toBe('matched');
      expect(result.bestMatch!.targetId).toBe('txn-1');
    });

    it('should handle statement import with multiple similar transactions', async () => {
      const source: SourceTransaction = {
        amount: 155.00,
        currency: 'THB',
        date: '2024-01-15',
        vendor: 'Starbucks',
      };

      // Multiple Starbucks visits on same day
      const targets: TargetTransaction[] = [
        { id: 'txn-1', amount: 155.00, currency: 'THB', date: '2024-01-15', vendor: 'Starbucks' },
        { id: 'txn-2', amount: 155.00, currency: 'THB', date: '2024-01-15', vendor: 'Starbucks' },
      ];

      const result = await rankMatches(source, targets);

      expect(result.status).toBe('multiple_matches');
      expect(result.requiresReview).toBe(true);
      expect(result.suggestions.length).toBe(2);
    });

    it('should handle no matching transactions', async () => {
      const source: SourceTransaction = {
        amount: 999.99,
        currency: 'USD',
        date: '2024-06-15',
        vendor: 'Unknown Shop',
      };

      const targets: TargetTransaction[] = [
        { id: 'txn-1', amount: 100.00, currency: 'THB', date: '2024-01-15', vendor: 'Starbucks' },
        { id: 'txn-2', amount: 50.00, currency: 'THB', date: '2024-01-16', vendor: 'Amazon' },
      ];

      const result = await rankMatches(source, targets);

      expect(result.status).toBe('no_match');
      expect(result.suggestions.length).toBe(0);
    });
  });
});
