/**
 * Match Scoring Algorithm Tests
 */

import {
  type SourceTransaction,
  type TargetTransaction,
  type MatchResult,
  SCORE_WEIGHTS,
  CONFIDENCE_THRESHOLDS,
  getConfidenceLevel,
  calculateMatchScore,
  calculateMatchScores,
  findBestMatch,
  getMatchStatistics,
  formatMatchResult,
} from '@/lib/matching/match-scorer';

// Create a mock Supabase client
function createMockSupabase(rateData: { rate: number; date: string } | null = null) {
  const mockSingle = jest.fn(() =>
    Promise.resolve({ data: rateData, error: null })
  );
  const mockLimit = jest.fn(() => Promise.resolve({ data: [], error: null }));
  const mockOrder = jest.fn(() => ({ limit: mockLimit }));
  const mockLte = jest.fn(() => ({ order: mockOrder }));
  const mockGte = jest.fn(() => ({ lte: mockLte }));
  const mockGt = jest.fn(() => ({ lte: mockLte }));

  const createChain = (): any => ({
    single: mockSingle,
    eq: jest.fn(() => createChain()),
    gte: mockGte,
    gt: mockGt,
    lte: mockLte,
    order: mockOrder,
    limit: mockLimit,
  });

  const mockSelect = jest.fn(() => createChain());
  const mockFrom = jest.fn(() => ({ select: mockSelect }));

  return { from: mockFrom };
}

describe('Match Scoring Algorithm', () => {
  describe('SCORE_WEIGHTS', () => {
    it('should have correct weights totaling 100', () => {
      expect(SCORE_WEIGHTS.AMOUNT).toBe(40);
      expect(SCORE_WEIGHTS.DATE).toBe(30);
      expect(SCORE_WEIGHTS.VENDOR).toBe(30);
      expect(SCORE_WEIGHTS.AMOUNT + SCORE_WEIGHTS.DATE + SCORE_WEIGHTS.VENDOR).toBe(100);
    });
  });

  describe('CONFIDENCE_THRESHOLDS', () => {
    it('should have correct thresholds', () => {
      expect(CONFIDENCE_THRESHOLDS.HIGH).toBe(90);
      expect(CONFIDENCE_THRESHOLDS.MEDIUM).toBe(55);
    });
  });

  describe('getConfidenceLevel', () => {
    it('should return HIGH for score >= 90', () => {
      expect(getConfidenceLevel(90)).toBe('HIGH');
      expect(getConfidenceLevel(95)).toBe('HIGH');
      expect(getConfidenceLevel(100)).toBe('HIGH');
    });

    it('should return MEDIUM for score >= 55 and < 90', () => {
      expect(getConfidenceLevel(55)).toBe('MEDIUM');
      expect(getConfidenceLevel(70)).toBe('MEDIUM');
      expect(getConfidenceLevel(89)).toBe('MEDIUM');
    });

    it('should return LOW for score < 55', () => {
      expect(getConfidenceLevel(0)).toBe('LOW');
      expect(getConfidenceLevel(30)).toBe('LOW');
      expect(getConfidenceLevel(54)).toBe('LOW');
    });
  });

  describe('calculateMatchScore', () => {
    describe('same currency matches', () => {
      it('should return perfect score for identical transactions', async () => {
        const source: SourceTransaction = {
          amount: 100.00,
          currency: 'USD',
          date: '2024-01-15',
          vendor: 'Starbucks',
        };

        const target: TargetTransaction = {
          id: 'txn-1',
          amount: 100.00,
          currency: 'USD',
          date: '2024-01-15',
          vendor: 'Starbucks',
        };

        const result = await calculateMatchScore(source, target);

        expect(result.score).toBe(100);
        expect(result.confidence).toBe('HIGH');
        expect(result.isMatch).toBe(true);
        expect(result.isCrossCurrency).toBe(false);
        expect(result.details.amount.score).toBe(40);
        expect(result.details.date.score).toBe(30);
        expect(result.details.vendor.score).toBe(30);
      });

      it('should handle amount differences', async () => {
        const source: SourceTransaction = {
          amount: 100.00,
          currency: 'USD',
          date: '2024-01-15',
          vendor: 'Starbucks',
        };

        const target: TargetTransaction = {
          id: 'txn-1',
          amount: 102.00, // 2% difference
          currency: 'USD',
          date: '2024-01-15',
          vendor: 'Starbucks',
        };

        const result = await calculateMatchScore(source, target);

        // Amount: 35/40 (within 2%), Date: 30/30, Vendor: 30/30
        expect(result.score).toBeGreaterThanOrEqual(90);
        expect(result.confidence).toBe('HIGH');
        expect(result.isMatch).toBe(true);
      });

      it('should handle date differences', async () => {
        const source: SourceTransaction = {
          amount: 100.00,
          currency: 'USD',
          date: '2024-01-15',
          vendor: 'Starbucks',
        };

        const target: TargetTransaction = {
          id: 'txn-1',
          amount: 100.00,
          currency: 'USD',
          date: '2024-01-17', // 2 days later
          vendor: 'Starbucks',
        };

        const result = await calculateMatchScore(source, target);

        // Amount: 40/40, Date: 20/30 (2 days), Vendor: 30/30
        expect(result.score).toBeGreaterThanOrEqual(85);
        expect(result.isMatch).toBe(true);
      });

      it('should handle vendor differences (fuzzy match)', async () => {
        const source: SourceTransaction = {
          amount: 100.00,
          currency: 'USD',
          date: '2024-01-15',
          vendor: 'STARBUCKS COFFEE',
        };

        const target: TargetTransaction = {
          id: 'txn-1',
          amount: 100.00,
          currency: 'USD',
          date: '2024-01-15',
          vendor: 'Starbucks',
        };

        const result = await calculateMatchScore(source, target);

        // Should still match due to fuzzy vendor matching
        expect(result.isMatch).toBe(true);
        expect(result.details.vendor.isMatch).toBe(true);
      });

      it('should handle no vendor match', async () => {
        const source: SourceTransaction = {
          amount: 100.00,
          currency: 'USD',
          date: '2024-01-15',
          vendor: 'Apple Store',
        };

        const target: TargetTransaction = {
          id: 'txn-1',
          amount: 100.00,
          currency: 'USD',
          date: '2024-01-15',
          vendor: 'Microsoft Store',
        };

        const result = await calculateMatchScore(source, target);

        // Amount: 40/40, Date: 30/30, Vendor: 0/30
        expect(result.score).toBeGreaterThanOrEqual(65);
        expect(result.score).toBeLessThan(75);
        expect(result.details.vendor.isMatch).toBe(false);
      });
    });

    describe('cross-currency matches', () => {
      it('should handle cross-currency with supabase client', async () => {
        const mockSupabase = createMockSupabase({ rate: 35.5, date: '2024-01-15' });

        const source: SourceTransaction = {
          amount: 100.00,
          currency: 'USD',
          date: '2024-01-15',
          vendor: 'Starbucks',
        };

        const target: TargetTransaction = {
          id: 'txn-1',
          amount: 3550.00, // 100 * 35.5
          currency: 'THB',
          date: '2024-01-15',
          vendor: 'Starbucks',
        };

        const result = await calculateMatchScore(source, target, {
          supabase: mockSupabase as any,
        });

        expect(result.isCrossCurrency).toBe(true);
        expect(result.details.conversion).not.toBeNull();
        expect(result.isMatch).toBe(true);
      });

      it('should handle cross-currency without supabase client', async () => {
        const source: SourceTransaction = {
          amount: 100.00,
          currency: 'USD',
          date: '2024-01-15',
          vendor: 'Starbucks',
        };

        const target: TargetTransaction = {
          id: 'txn-1',
          amount: 3550.00,
          currency: 'THB',
          date: '2024-01-15',
          vendor: 'Starbucks',
        };

        const result = await calculateMatchScore(source, target);

        expect(result.isCrossCurrency).toBe(true);
        expect(result.details.amount.score).toBe(0);
        expect(result.details.amount.confidenceCap).toBe(50);
      });

      it('should handle missing exchange rate', async () => {
        const mockSupabase = createMockSupabase(null);

        const source: SourceTransaction = {
          amount: 100.00,
          currency: 'USD',
          date: '2024-01-15',
          vendor: 'Starbucks',
        };

        const target: TargetTransaction = {
          id: 'txn-1',
          amount: 3550.00,
          currency: 'THB',
          date: '2024-01-15',
          vendor: 'Starbucks',
        };

        const result = await calculateMatchScore(source, target, {
          supabase: mockSupabase as any,
        });

        expect(result.details.amount.score).toBe(0);
        // Check that one of the reasons mentions no exchange rate
        expect(result.reasons.some(r => r.includes('no exchange rate'))).toBe(true);
      });
    });

    describe('confidence caps', () => {
      it('should apply confidence cap for large amount differences', async () => {
        const source: SourceTransaction = {
          amount: 100.00,
          currency: 'USD',
          date: '2024-01-15',
          vendor: 'Starbucks',
        };

        const target: TargetTransaction = {
          id: 'txn-1',
          amount: 150.00, // 40% difference - beyond 10% threshold
          currency: 'USD',
          date: '2024-01-15',
          vendor: 'Starbucks',
        };

        const result = await calculateMatchScore(source, target);

        // Score should be capped at 60
        expect(result.score).toBeLessThanOrEqual(60);
        expect(result.appliedCaps).toContain(60);
      });

      it('should apply confidence cap for large date differences', async () => {
        const source: SourceTransaction = {
          amount: 100.00,
          currency: 'USD',
          date: '2024-01-15',
          vendor: 'Starbucks',
        };

        const target: TargetTransaction = {
          id: 'txn-1',
          amount: 100.00,
          currency: 'USD',
          date: '2024-01-20', // 5 days difference (beyond default 3-day tolerance)
          vendor: 'Starbucks',
        };

        const result = await calculateMatchScore(source, target, {
          minMatchScore: 40,
        });

        // Date > 3 days results in no date match (score 0 for date component)
        // The date matcher returns isMatch: false for dates > maxDaysDiff
        expect(result.details.date.isMatch).toBe(false);
        expect(result.details.date.score).toBe(0);
      });
    });

    describe('configuration options', () => {
      it('should respect minMatchScore', async () => {
        const source: SourceTransaction = {
          amount: 100.00,
          currency: 'USD',
          date: '2024-01-15',
          vendor: 'Apple',
        };

        const target: TargetTransaction = {
          id: 'txn-1',
          amount: 100.00,
          currency: 'USD',
          date: '2024-01-20',
          vendor: 'Microsoft', // No vendor match
        };

        const resultDefault = await calculateMatchScore(source, target);
        const resultHighThreshold = await calculateMatchScore(source, target, {
          minMatchScore: 80,
        });

        // With high threshold, might not be a match
        expect(resultHighThreshold.isMatch).toBe(false);
      });

      it('should require vendor match when configured', async () => {
        const source: SourceTransaction = {
          amount: 100.00,
          currency: 'USD',
          date: '2024-01-15',
          vendor: 'Apple Store',
        };

        const target: TargetTransaction = {
          id: 'txn-1',
          amount: 100.00,
          currency: 'USD',
          date: '2024-01-15',
          vendor: 'Microsoft Store',
        };

        const result = await calculateMatchScore(source, target, {
          requireVendorMatch: true,
        });

        expect(result.isMatch).toBe(false);
        expect(result.reasons).toContain('Vendor match required but not found');
      });

      it('should require date match when configured', async () => {
        const source: SourceTransaction = {
          amount: 100.00,
          currency: 'USD',
          date: '2024-01-15',
          vendor: 'Starbucks',
        };

        const target: TargetTransaction = {
          id: 'txn-1',
          amount: 100.00,
          currency: 'USD',
          date: '2024-01-25', // 10 days - too far
          vendor: 'Starbucks',
        };

        const result = await calculateMatchScore(source, target, {
          requireDateMatch: true,
        });

        expect(result.isMatch).toBe(false);
        expect(result.reasons).toContain('Date match required but not found');
      });

      it('should use custom weights', async () => {
        const source: SourceTransaction = {
          amount: 100.00,
          currency: 'USD',
          date: '2024-01-15',
          vendor: 'Apple Store',
        };

        const target: TargetTransaction = {
          id: 'txn-1',
          amount: 100.00,
          currency: 'USD',
          date: '2024-01-15',
          vendor: 'Microsoft Store', // No vendor match
        };

        // Default weights: amount 40, date 30, vendor 30
        const resultDefault = await calculateMatchScore(source, target);

        // Custom: reduce vendor weight to 10
        const resultCustom = await calculateMatchScore(source, target, {
          weights: { amount: 45, date: 45, vendor: 10 },
        });

        // With reduced vendor weight, score should be higher
        expect(resultCustom.score).toBeGreaterThan(resultDefault.score);
      });
    });
  });

  describe('calculateMatchScores', () => {
    it('should return empty array for no targets', async () => {
      const source: SourceTransaction = {
        amount: 100.00,
        currency: 'USD',
        date: '2024-01-15',
        vendor: 'Starbucks',
      };

      const results = await calculateMatchScores(source, []);

      expect(results).toEqual([]);
    });

    it('should return results sorted by score descending', async () => {
      const source: SourceTransaction = {
        amount: 100.00,
        currency: 'USD',
        date: '2024-01-15',
        vendor: 'Starbucks',
      };

      const targets: TargetTransaction[] = [
        {
          id: 'txn-1',
          amount: 200.00, // Poor match
          currency: 'USD',
          date: '2024-01-20',
          vendor: 'Apple',
        },
        {
          id: 'txn-2',
          amount: 100.00, // Perfect match
          currency: 'USD',
          date: '2024-01-15',
          vendor: 'Starbucks',
        },
        {
          id: 'txn-3',
          amount: 101.00, // Good match
          currency: 'USD',
          date: '2024-01-16',
          vendor: 'Starbucks',
        },
      ];

      const results = await calculateMatchScores(source, targets);

      expect(results[0].targetId).toBe('txn-2'); // Perfect match first
      expect(results[0].score).toBe(100);
      expect(results[1].targetId).toBe('txn-3'); // Good match second
      expect(results[2].targetId).toBe('txn-1'); // Poor match last
    });
  });

  describe('findBestMatch', () => {
    it('should return null for no targets', async () => {
      const source: SourceTransaction = {
        amount: 100.00,
        currency: 'USD',
        date: '2024-01-15',
        vendor: 'Starbucks',
      };

      const result = await findBestMatch(source, []);

      expect(result).toBeNull();
    });

    it('should return best match when valid', async () => {
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
          date: '2024-01-20',
          vendor: 'Starbucks',
        },
      ];

      const result = await findBestMatch(source, targets);

      expect(result).not.toBeNull();
      expect(result!.targetId).toBe('txn-1');
      expect(result!.score).toBe(100);
    });

    it('should return null when no matches meet threshold', async () => {
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
          date: '2024-02-15', // Month later
          vendor: 'Walmart', // Different vendor
        },
      ];

      const result = await findBestMatch(source, targets);

      expect(result).toBeNull();
    });
  });

  describe('getMatchStatistics', () => {
    it('should calculate correct statistics', () => {
      const results: MatchResult[] = [
        {
          targetId: 'txn-1',
          score: 95,
          confidence: 'HIGH',
          isMatch: true,
          details: {} as any,
          reasons: [],
          appliedCaps: [],
          isCrossCurrency: false,
        },
        {
          targetId: 'txn-2',
          score: 75,
          confidence: 'MEDIUM',
          isMatch: true,
          details: {} as any,
          reasons: [],
          appliedCaps: [],
          isCrossCurrency: true,
        },
        {
          targetId: 'txn-3',
          score: 40,
          confidence: 'LOW',
          isMatch: false,
          details: {} as any,
          reasons: [],
          appliedCaps: [],
          isCrossCurrency: false,
        },
      ];

      const stats = getMatchStatistics(results);

      expect(stats.total).toBe(3);
      expect(stats.matched).toBe(2);
      expect(stats.highConfidence).toBe(1);
      expect(stats.mediumConfidence).toBe(1);
      expect(stats.lowConfidence).toBe(1);
      expect(stats.avgScore).toBe(70); // (95 + 75 + 40) / 3 = 70
      expect(stats.crossCurrency).toBe(1);
    });

    it('should handle empty results', () => {
      const stats = getMatchStatistics([]);

      expect(stats.total).toBe(0);
      expect(stats.matched).toBe(0);
      expect(stats.avgScore).toBe(0);
    });
  });

  describe('formatMatchResult', () => {
    it('should format result for display', () => {
      const result: MatchResult = {
        targetId: 'txn-123',
        score: 85,
        confidence: 'MEDIUM',
        isMatch: true,
        details: {
          amount: {
            score: 40,
            percentDiff: 0,
            isMatch: true,
            reason: 'Amounts match exactly',
          },
          date: {
            score: 25,
            daysDiff: 1,
            isMatch: true,
            reason: 'Dates within 1 day',
          },
          vendor: {
            score: 20,
            similarity: 80,
            isMatch: true,
            matchType: 'fuzzy',
            reason: 'Good similarity match',
          },
        },
        reasons: ['Amount: OK', 'Date: OK', 'Vendor: OK'],
        appliedCaps: [],
        isCrossCurrency: false,
      };

      const formatted = formatMatchResult(result);

      expect(formatted).toContain('txn-123');
      expect(formatted).toContain('85');
      expect(formatted).toContain('MEDIUM');
      expect(formatted).toContain('Amount: 40/40');
      expect(formatted).toContain('Date: 25/30');
      expect(formatted).toContain('Vendor: 20/30');
    });

    it('should include conversion details when present', () => {
      const result: MatchResult = {
        targetId: 'txn-123',
        score: 85,
        confidence: 'MEDIUM',
        isMatch: true,
        details: {
          amount: {
            score: 35,
            percentDiff: 1.5,
            isMatch: true,
            reason: 'Within 2%',
          },
          date: {
            score: 30,
            daysDiff: 0,
            isMatch: true,
            reason: 'Same day',
          },
          vendor: {
            score: 30,
            similarity: 100,
            isMatch: true,
            matchType: 'exact',
            reason: 'Exact match',
          },
          conversion: {
            convertedAmount: 3550,
            rate: 35.5,
            rateDate: '2024-01-15',
            isExactRate: true,
            rateDaysDiff: 0,
            fromCurrency: 'USD',
            toCurrency: 'THB',
            originalAmount: 100,
          },
        },
        reasons: [],
        appliedCaps: [],
        isCrossCurrency: true,
      };

      const formatted = formatMatchResult(result);

      expect(formatted).toContain('Conversion');
      expect(formatted).toContain('USD');
      expect(formatted).toContain('THB');
      expect(formatted).toContain('35.5');
      expect(formatted).toContain('exact');
    });

    it('should include caps when applied', () => {
      const result: MatchResult = {
        targetId: 'txn-123',
        score: 60,
        confidence: 'MEDIUM',
        isMatch: true,
        details: {
          amount: { score: 0, percentDiff: 50, isMatch: false, confidenceCap: 60, reason: 'Too different' },
          date: { score: 30, daysDiff: 0, isMatch: true, reason: 'Same day' },
          vendor: { score: 30, similarity: 100, isMatch: true, matchType: 'exact', reason: 'Exact' },
        },
        reasons: [],
        appliedCaps: [60],
        isCrossCurrency: false,
      };

      const formatted = formatMatchResult(result);

      expect(formatted).toContain('Caps applied');
      expect(formatted).toContain('60');
    });
  });

  describe('real-world scenarios', () => {
    it('should match Grab receipt to bank statement', async () => {
      const source: SourceTransaction = {
        amount: 350.00,
        currency: 'THB',
        date: '2024-01-15',
        vendor: 'GrabFood',
      };

      const target: TargetTransaction = {
        id: 'txn-1',
        amount: 350.00,
        currency: 'THB',
        date: '2024-01-15',
        vendor: 'Grab', // Alias match
      };

      const result = await calculateMatchScore(source, target);

      expect(result.isMatch).toBe(true);
      expect(result.confidence).toBe('HIGH');
      expect(result.details.vendor.matchType).toBe('alias');
    });

    it('should match Amazon email to credit card statement', async () => {
      const source: SourceTransaction = {
        amount: 25.99,
        currency: 'USD',
        date: '2024-01-15',
        vendor: 'Amazon.com',
      };

      const target: TargetTransaction = {
        id: 'txn-1',
        amount: 25.99,
        currency: 'USD',
        date: '2024-01-17', // Posted 2 days later
        vendor: 'AMZN', // Alias
      };

      const result = await calculateMatchScore(source, target);

      expect(result.isMatch).toBe(true);
      expect(result.details.vendor.isMatch).toBe(true);
    });

    it('should handle 7-Eleven variations', async () => {
      const source: SourceTransaction = {
        amount: 45.00,
        currency: 'THB',
        date: '2024-01-15',
        vendor: '7-ELEVEN',
      };

      const target: TargetTransaction = {
        id: 'txn-1',
        amount: 45.00,
        currency: 'THB',
        date: '2024-01-15',
        vendor: '7-11',
      };

      const result = await calculateMatchScore(source, target);

      expect(result.isMatch).toBe(true);
      expect(result.details.vendor.isMatch).toBe(true);
    });

    it('should handle Starbucks with store number', async () => {
      const source: SourceTransaction = {
        amount: 155.00,
        currency: 'THB',
        date: '2024-01-15',
        vendor: 'STARBUCKS #1234',
      };

      const target: TargetTransaction = {
        id: 'txn-1',
        amount: 155.00,
        currency: 'THB',
        date: '2024-01-15',
        vendor: 'Starbucks',
      };

      const result = await calculateMatchScore(source, target);

      expect(result.isMatch).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(90);
    });
  });
});
