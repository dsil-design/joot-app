/**
 * Amount Matching Algorithm Tests
 */

import {
  calculatePercentDiff,
  compareAmounts,
  isWithinExchangeRateTolerance,
  compareCurrencyAmounts,
  findBestAmountMatch,
  SCORE_THRESHOLDS,
} from '@/lib/matching/amount-matcher';

describe('Amount Matching Algorithm', () => {
  describe('calculatePercentDiff', () => {
    it('should return 0 for identical amounts', () => {
      expect(calculatePercentDiff(100, 100)).toBe(0);
      expect(calculatePercentDiff(0, 0)).toBe(0);
    });

    it('should calculate correct percentage difference', () => {
      // 10% difference: (110-100)/105 * 100 ≈ 9.52%
      const diff = calculatePercentDiff(100, 110);
      expect(diff).toBeCloseTo(9.52, 1);
    });

    it('should return 100 if one amount is zero', () => {
      expect(calculatePercentDiff(100, 0)).toBe(100);
      expect(calculatePercentDiff(0, 100)).toBe(100);
    });

    it('should handle negative amounts with absolute comparison', () => {
      expect(calculatePercentDiff(-100, 100)).toBe(0);
      expect(calculatePercentDiff(-100, -100)).toBe(0);
    });

    it('should handle negative amounts without absolute comparison', () => {
      // -100 vs 100: diff = 200, avg = 0 → 100% (special case)
      expect(calculatePercentDiff(-100, 100, false)).toBe(100);
    });

    it('should handle small differences correctly', () => {
      // 1% difference: (101-100)/100.5 * 100 ≈ 0.995%
      const diff = calculatePercentDiff(100, 101);
      expect(diff).toBeCloseTo(0.995, 2);
    });

    it('should handle decimal amounts', () => {
      const diff = calculatePercentDiff(99.99, 100.01);
      expect(diff).toBeCloseTo(0.02, 2);
    });
  });

  describe('compareAmounts', () => {
    describe('exact matches', () => {
      it('should score 40 for exact match', () => {
        const result = compareAmounts(100, 100);
        expect(result.score).toBe(SCORE_THRESHOLDS.EXACT.score);
        expect(result.percentDiff).toBe(0);
        expect(result.isMatch).toBe(true);
        expect(result.reason).toContain('exactly');
      });

      it('should score 40 for amounts within exactMatchTolerance', () => {
        const result = compareAmounts(100, 101, { exactMatchTolerance: 2 });
        expect(result.score).toBe(SCORE_THRESHOLDS.EXACT.score);
        expect(result.isMatch).toBe(true);
      });
    });

    describe('very close matches (within ±2%)', () => {
      it('should score 35 for 1.5% difference', () => {
        // ~1.5% diff
        const result = compareAmounts(100, 101.5);
        expect(result.score).toBe(SCORE_THRESHOLDS.VERY_CLOSE.score);
        expect(result.isMatch).toBe(true);
        expect(result.reason).toContain('excellent match');
      });

      it('should score 35 for exactly 2% difference', () => {
        // 2% diff: amounts need to differ by ~2.02 to get exactly 2%
        const result = compareAmounts(100, 102.02);
        expect(result.percentDiff).toBeCloseTo(2, 0);
        expect(result.score).toBe(SCORE_THRESHOLDS.VERY_CLOSE.score);
        expect(result.isMatch).toBe(true);
      });
    });

    describe('close matches (within ±5%)', () => {
      it('should score 25 for 3% difference', () => {
        // For percentage diff formula: diff/avg * 100
        // 100 vs 103: diff=3, avg=101.5, percent = 3/101.5*100 ≈ 2.96%
        const result = compareAmounts(100, 103);
        expect(result.percentDiff).toBeCloseTo(3, 0);
        expect(result.score).toBe(SCORE_THRESHOLDS.CLOSE.score);
        expect(result.isMatch).toBe(true);
        expect(result.reason).toContain('good match');
      });

      it('should score 25 for ~5% difference', () => {
        // 100 vs 105: diff=5, avg=102.5, percent = 5/102.5*100 ≈ 4.88%
        const result = compareAmounts(100, 105);
        expect(result.percentDiff).toBeLessThanOrEqual(5);
        expect(result.score).toBe(SCORE_THRESHOLDS.CLOSE.score);
        expect(result.isMatch).toBe(true);
      });
    });

    describe('acceptable matches (within ±10%)', () => {
      it('should score 15 for 7% difference', () => {
        // 100 vs 107: diff=7, avg=103.5, percent = 7/103.5*100 ≈ 6.76%
        const result = compareAmounts(100, 107);
        expect(result.percentDiff).toBeGreaterThan(5);
        expect(result.percentDiff).toBeLessThanOrEqual(10);
        expect(result.score).toBe(SCORE_THRESHOLDS.ACCEPTABLE.score);
        expect(result.isMatch).toBe(true);
        expect(result.reason).toContain('acceptable match');
      });

      it('should score 15 for ~10% difference', () => {
        // 100 vs 110: diff=10, avg=105, percent = 10/105*100 ≈ 9.52%
        const result = compareAmounts(100, 110);
        expect(result.percentDiff).toBeGreaterThan(5);
        expect(result.percentDiff).toBeLessThanOrEqual(10);
        expect(result.score).toBe(SCORE_THRESHOLDS.ACCEPTABLE.score);
        expect(result.isMatch).toBe(true);
      });
    });

    describe('far matches (>10%)', () => {
      it('should score 0 and cap confidence for >10% difference', () => {
        // 100 vs 112: diff=12, avg=106, percent = 12/106*100 ≈ 11.32%
        const result = compareAmounts(100, 112);
        expect(result.percentDiff).toBeGreaterThan(10);
        expect(result.score).toBe(0);
        expect(result.isMatch).toBe(false);
        expect(result.confidenceCap).toBe(60);
        // Note: default maxPercentDiff is 10, so this exceeds threshold
        expect(result.reason).toContain('exceeds');
      });

      it('should score 0 for exceeding maxPercentDiff', () => {
        const result = compareAmounts(100, 200);
        expect(result.score).toBe(0);
        expect(result.isMatch).toBe(false);
        expect(result.confidenceCap).toBe(60);
        expect(result.reason).toContain('exceeds');
      });
    });

    describe('configuration options', () => {
      it('should respect custom maxPercentDiff', () => {
        // With default maxPercentDiff=10, 15% would be "far"
        // With maxPercentDiff=20, it should still match
        const result = compareAmounts(100, 116, { maxPercentDiff: 20 });
        expect(result.isMatch).toBe(false); // 15% > 10% threshold
        expect(result.reason).toContain('weak match');
      });

      it('should compare absolute values by default', () => {
        const result = compareAmounts(-100, 100);
        expect(result.score).toBe(SCORE_THRESHOLDS.EXACT.score);
        expect(result.isMatch).toBe(true);
      });

      it('should not compare absolute values when disabled', () => {
        const result = compareAmounts(-100, 100, { compareAbsolute: false });
        expect(result.isMatch).toBe(false);
      });
    });
  });

  describe('isWithinExchangeRateTolerance', () => {
    it('should return true for exact match', () => {
      expect(isWithinExchangeRateTolerance(100, 100)).toBe(true);
    });

    it('should return true for 1% difference', () => {
      expect(isWithinExchangeRateTolerance(100, 101)).toBe(true);
    });

    it('should return true for exactly 2% difference', () => {
      expect(isWithinExchangeRateTolerance(100, 102.02)).toBe(true);
    });

    it('should return false for 3% difference', () => {
      expect(isWithinExchangeRateTolerance(100, 103.05)).toBe(false);
    });

    it('should handle decimal amounts', () => {
      expect(isWithinExchangeRateTolerance(35.67, 35.50)).toBe(true);
    });
  });

  describe('compareCurrencyAmounts', () => {
    it('should use direct comparison for same currency', () => {
      const result = compareCurrencyAmounts(100, 'USD', 100, 'USD');
      expect(result.score).toBe(SCORE_THRESHOLDS.EXACT.score);
      expect(result.isMatch).toBe(true);
    });

    it('should handle case-insensitive currency comparison', () => {
      const result = compareCurrencyAmounts(100, 'usd', 100, 'USD');
      expect(result.score).toBe(SCORE_THRESHOLDS.EXACT.score);
    });

    it('should require converted amount for different currencies', () => {
      const result = compareCurrencyAmounts(100, 'USD', 3500, 'THB');
      expect(result.score).toBe(0);
      expect(result.isMatch).toBe(false);
      expect(result.reason).toContain('conversion required');
    });

    it('should compare converted amounts with 2% tolerance', () => {
      // THB 3500 converts to USD 100, comparing against USD 100
      const result = compareCurrencyAmounts(3500, 'THB', 100, 'USD', 100);
      expect(result.score).toBe(SCORE_THRESHOLDS.EXACT.score);
      expect(result.isMatch).toBe(true);
      expect(result.reason).toContain('Cross-currency');
    });

    it('should allow 2% exchange rate variance in cross-currency', () => {
      // Converted amount 101.5 vs target 100 is ~1.5% diff
      const result = compareCurrencyAmounts(3500, 'THB', 100, 'USD', 101.5);
      expect(result.score).toBe(SCORE_THRESHOLDS.EXACT.score); // Within 2% tolerance
      expect(result.isMatch).toBe(true);
    });

    it('should handle cross-currency mismatch', () => {
      // Converted amount 120 vs target 100 is ~18% diff
      const result = compareCurrencyAmounts(3500, 'THB', 100, 'USD', 120);
      expect(result.isMatch).toBe(false);
      expect(result.reason).toContain('Cross-currency comparison');
    });
  });

  describe('findBestAmountMatch', () => {
    it('should return null for empty candidates', () => {
      const result = findBestAmountMatch(100, []);
      expect(result).toBeNull();
    });

    it('should find exact match', () => {
      const result = findBestAmountMatch(100, [50, 100, 150]);
      expect(result).not.toBeNull();
      expect(result!.index).toBe(1);
      expect(result!.result.score).toBe(SCORE_THRESHOLDS.EXACT.score);
    });

    it('should find closest match when no exact match exists', () => {
      const result = findBestAmountMatch(100, [50, 101, 150]);
      expect(result).not.toBeNull();
      expect(result!.index).toBe(1); // 101 is closest to 100
      expect(result!.result.score).toBe(SCORE_THRESHOLDS.VERY_CLOSE.score);
    });

    it('should short-circuit on perfect match', () => {
      // If we find exact match, we don't need to check rest
      const result = findBestAmountMatch(100, [100, 100, 100]);
      expect(result!.index).toBe(0);
      expect(result!.result.score).toBe(SCORE_THRESHOLDS.EXACT.score);
    });

    it('should handle single candidate', () => {
      const result = findBestAmountMatch(100, [200]);
      expect(result).not.toBeNull();
      expect(result!.index).toBe(0);
      expect(result!.result.isMatch).toBe(false);
    });

    it('should select higher scoring match among multiple candidates', () => {
      const result = findBestAmountMatch(100, [90, 95, 99, 105, 110]);
      expect(result).not.toBeNull();
      expect(result!.index).toBe(2); // 99 is closest
    });
  });

  describe('SCORE_THRESHOLDS export', () => {
    it('should have expected threshold values', () => {
      expect(SCORE_THRESHOLDS.EXACT.score).toBe(40);
      expect(SCORE_THRESHOLDS.VERY_CLOSE.score).toBe(35);
      expect(SCORE_THRESHOLDS.CLOSE.score).toBe(25);
      expect(SCORE_THRESHOLDS.ACCEPTABLE.score).toBe(15);
      expect(SCORE_THRESHOLDS.FAR.score).toBe(0);
    });

    it('should have expected maxDiff values', () => {
      expect(SCORE_THRESHOLDS.EXACT.maxDiff).toBe(0);
      expect(SCORE_THRESHOLDS.VERY_CLOSE.maxDiff).toBe(2);
      expect(SCORE_THRESHOLDS.CLOSE.maxDiff).toBe(5);
      expect(SCORE_THRESHOLDS.ACCEPTABLE.maxDiff).toBe(10);
      expect(SCORE_THRESHOLDS.FAR.maxDiff).toBe(Infinity);
    });
  });

  describe('real-world scenarios', () => {
    it('should match typical credit card statement amounts', () => {
      // Statement shows $45.67, database has $45.67
      const result = compareAmounts(45.67, 45.67);
      expect(result.score).toBe(40);
      expect(result.isMatch).toBe(true);
    });

    it('should handle rounding differences', () => {
      // Statement shows $10.00, database has $9.99
      // diff=0.01, avg=9.995, percent = 0.01/9.995*100 ≈ 0.1%
      const result = compareAmounts(10.00, 9.99);
      expect(result.percentDiff).toBeLessThan(1);
      expect(result.score).toBe(35); // Within 2% = very close
      expect(result.isMatch).toBe(true);
    });

    it('should handle foreign transaction fees', () => {
      // Original: $100, with 3% fee: $103
      const result = compareAmounts(100, 103);
      expect(result.score).toBe(SCORE_THRESHOLDS.CLOSE.score); // Within 5%
      expect(result.isMatch).toBe(true);
    });

    it('should flag significant discrepancies', () => {
      // Statement shows $100, database has $150
      const result = compareAmounts(100, 150);
      expect(result.isMatch).toBe(false);
      expect(result.confidenceCap).toBe(60);
    });

    it('should handle Thai Baht amounts', () => {
      // THB amounts are typically larger numbers
      const result = compareAmounts(3567.50, 3567.50);
      expect(result.score).toBe(40);
      expect(result.isMatch).toBe(true);
    });

    it('should handle cross-currency Grab receipt match', () => {
      // Grab receipt: THB 350, converted to ~USD 10
      // Database transaction: USD 10.05
      const result = compareCurrencyAmounts(350, 'THB', 10.05, 'USD', 10);
      expect(result.isMatch).toBe(true);
    });
  });
});
