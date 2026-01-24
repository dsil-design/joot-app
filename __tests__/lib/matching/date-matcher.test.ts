/**
 * Date Matching Algorithm Tests
 */

import {
  calculateDaysDiff,
  compareDates,
  isWithinDateTolerance,
  findBestDateMatch,
  isDateInPeriod,
  getDateSearchWindow,
  formatDateForDisplay,
  DATE_SCORE_THRESHOLDS,
} from '@/lib/matching/date-matcher';

describe('Date Matching Algorithm', () => {
  describe('calculateDaysDiff', () => {
    it('should return 0 for same day', () => {
      const date = new Date('2024-01-15');
      expect(calculateDaysDiff(date, date)).toBe(0);
    });

    it('should return 0 for same day with different times', () => {
      const date1 = new Date('2024-01-15T09:00:00');
      const date2 = new Date('2024-01-15T23:59:59');
      expect(calculateDaysDiff(date1, date2)).toBe(0);
    });

    it('should return 1 for adjacent days', () => {
      const date1 = new Date('2024-01-15');
      const date2 = new Date('2024-01-16');
      expect(calculateDaysDiff(date1, date2)).toBe(1);
    });

    it('should handle string dates', () => {
      expect(calculateDaysDiff('2024-01-15', '2024-01-17')).toBe(2);
    });

    it('should return absolute difference', () => {
      const date1 = new Date('2024-01-20');
      const date2 = new Date('2024-01-15');
      expect(calculateDaysDiff(date1, date2)).toBe(5);
    });

    it('should handle month boundaries', () => {
      const date1 = new Date('2024-01-31');
      const date2 = new Date('2024-02-01');
      expect(calculateDaysDiff(date1, date2)).toBe(1);
    });

    it('should handle year boundaries', () => {
      const date1 = new Date('2023-12-31');
      const date2 = new Date('2024-01-01');
      expect(calculateDaysDiff(date1, date2)).toBe(1);
    });

    it('should handle leap years', () => {
      const date1 = new Date('2024-02-28');
      const date2 = new Date('2024-03-01');
      expect(calculateDaysDiff(date1, date2)).toBe(2); // 2024 is a leap year
    });
  });

  describe('compareDates', () => {
    describe('same day matches', () => {
      it('should score 30 for exact match', () => {
        const result = compareDates('2024-01-15', '2024-01-15');
        expect(result.score).toBe(DATE_SCORE_THRESHOLDS.SAME_DAY.score);
        expect(result.daysDiff).toBe(0);
        expect(result.isMatch).toBe(true);
        expect(result.reason).toContain('same day');
      });

      it('should score 30 for same day different times', () => {
        // Use dates without timezone to avoid UTC conversion issues
        const date1 = new Date(2024, 0, 15, 8, 0, 0);  // Jan 15, 2024 8:00 AM local
        const date2 = new Date(2024, 0, 15, 20, 0, 0); // Jan 15, 2024 8:00 PM local
        const result = compareDates(date1, date2);
        expect(result.score).toBe(30);
      });
    });

    describe('±1 day matches', () => {
      it('should score 25 for 1 day difference', () => {
        const result = compareDates('2024-01-15', '2024-01-16');
        expect(result.score).toBe(DATE_SCORE_THRESHOLDS.ONE_DAY.score);
        expect(result.daysDiff).toBe(1);
        expect(result.isMatch).toBe(true);
        expect(result.reason).toContain('excellent match');
      });

      it('should score 25 for 1 day before', () => {
        const result = compareDates('2024-01-16', '2024-01-15');
        expect(result.score).toBe(25);
      });
    });

    describe('±2 days matches', () => {
      it('should score 20 for 2 days difference', () => {
        const result = compareDates('2024-01-15', '2024-01-17');
        expect(result.score).toBe(DATE_SCORE_THRESHOLDS.TWO_DAYS.score);
        expect(result.daysDiff).toBe(2);
        expect(result.isMatch).toBe(true);
        expect(result.reason).toContain('good match');
      });
    });

    describe('±3 days matches', () => {
      it('should score 15 for 3 days difference', () => {
        const result = compareDates('2024-01-15', '2024-01-18');
        expect(result.score).toBe(DATE_SCORE_THRESHOLDS.THREE_DAYS.score);
        expect(result.daysDiff).toBe(3);
        expect(result.isMatch).toBe(true);
        expect(result.reason).toContain('acceptable match');
      });
    });

    describe('far matches (>3 days)', () => {
      it('should score 0 and cap confidence for 5 days', () => {
        const result = compareDates('2024-01-15', '2024-01-20', { maxDaysDiff: 7 });
        expect(result.score).toBe(0);
        expect(result.daysDiff).toBe(5);
        expect(result.isMatch).toBe(true); // Still within custom maxDaysDiff
        expect(result.confidenceCap).toBeDefined();
        expect(result.reason).toContain('weak match');
      });

      it('should not match beyond maxDaysDiff', () => {
        const result = compareDates('2024-01-15', '2024-01-25');
        expect(result.score).toBe(0);
        expect(result.daysDiff).toBe(10);
        expect(result.isMatch).toBe(false);
        expect(result.reason).toContain('exceeds');
      });
    });

    describe('configuration options', () => {
      it('should respect custom maxDaysDiff', () => {
        const result = compareDates('2024-01-15', '2024-01-22', { maxDaysDiff: 7 });
        expect(result.isMatch).toBe(true);
      });

      it('should use strict mode when enabled', () => {
        const result = compareDates('2024-01-15', '2024-01-16', { strictMode: true });
        expect(result.score).toBe(25); // 30 - 1*5 = 25
        expect(result.reason).toContain('strict mode');
      });

      it('should penalize more in strict mode', () => {
        const result = compareDates('2024-01-15', '2024-01-17', { strictMode: true });
        expect(result.score).toBe(20); // 30 - 2*5 = 20
      });
    });
  });

  describe('isWithinDateTolerance', () => {
    it('should return true for same day', () => {
      expect(isWithinDateTolerance('2024-01-15', '2024-01-15')).toBe(true);
    });

    it('should return true for 3 days difference', () => {
      expect(isWithinDateTolerance('2024-01-15', '2024-01-18')).toBe(true);
    });

    it('should return false for 4 days difference', () => {
      expect(isWithinDateTolerance('2024-01-15', '2024-01-19')).toBe(false);
    });

    it('should handle Date objects', () => {
      const date1 = new Date('2024-01-15');
      const date2 = new Date('2024-01-17');
      expect(isWithinDateTolerance(date1, date2)).toBe(true);
    });
  });

  describe('findBestDateMatch', () => {
    it('should return null for empty candidates', () => {
      const result = findBestDateMatch('2024-01-15', []);
      expect(result).toBeNull();
    });

    it('should find exact match', () => {
      const result = findBestDateMatch('2024-01-15', [
        '2024-01-10',
        '2024-01-15',
        '2024-01-20',
      ]);
      expect(result).not.toBeNull();
      expect(result!.index).toBe(1);
      expect(result!.result.score).toBe(30);
    });

    it('should find closest match when no exact match', () => {
      const result = findBestDateMatch('2024-01-15', [
        '2024-01-10',
        '2024-01-16',
        '2024-01-20',
      ]);
      expect(result).not.toBeNull();
      expect(result!.index).toBe(1); // Jan 16 is closest
      expect(result!.result.score).toBe(25);
    });

    it('should short-circuit on same-day match', () => {
      const result = findBestDateMatch('2024-01-15', [
        '2024-01-15',
        '2024-01-15',
        '2024-01-15',
      ]);
      expect(result!.index).toBe(0);
    });

    it('should handle single candidate', () => {
      const result = findBestDateMatch('2024-01-15', ['2024-01-20']);
      expect(result).not.toBeNull();
      expect(result!.index).toBe(0);
      expect(result!.result.daysDiff).toBe(5);
    });

    it('should prefer earlier index on tie', () => {
      const result = findBestDateMatch('2024-01-15', [
        '2024-01-14', // 1 day before
        '2024-01-16', // 1 day after - same score
      ]);
      // First one found wins on tie
      expect(result!.index).toBe(0);
    });
  });

  describe('isDateInPeriod', () => {
    it('should return true for date within period', () => {
      expect(isDateInPeriod('2024-01-15', '2024-01-01', '2024-01-31')).toBe(true);
    });

    it('should return true for date at period start', () => {
      expect(isDateInPeriod('2024-01-01', '2024-01-01', '2024-01-31')).toBe(true);
    });

    it('should return true for date at period end', () => {
      expect(isDateInPeriod('2024-01-31', '2024-01-01', '2024-01-31')).toBe(true);
    });

    it('should return false for date before period', () => {
      expect(isDateInPeriod('2023-12-31', '2024-01-01', '2024-01-31')).toBe(false);
    });

    it('should return false for date after period', () => {
      expect(isDateInPeriod('2024-02-01', '2024-01-01', '2024-01-31')).toBe(false);
    });

    it('should handle Date objects', () => {
      const date = new Date('2024-01-15');
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-31');
      expect(isDateInPeriod(date, start, end)).toBe(true);
    });
  });

  describe('getDateSearchWindow', () => {
    it('should return ±3 days by default', () => {
      const { start, end } = getDateSearchWindow('2024-01-15');
      expect(start.toISOString().split('T')[0]).toBe('2024-01-12');
      expect(end.toISOString().split('T')[0]).toBe('2024-01-18');
    });

    it('should respect custom tolerance', () => {
      const { start, end } = getDateSearchWindow('2024-01-15', 7);
      expect(start.toISOString().split('T')[0]).toBe('2024-01-08');
      expect(end.toISOString().split('T')[0]).toBe('2024-01-22');
    });

    it('should handle month boundaries', () => {
      const { start, end } = getDateSearchWindow('2024-01-02', 3);
      expect(start.toISOString().split('T')[0]).toBe('2023-12-30');
      expect(end.toISOString().split('T')[0]).toBe('2024-01-05');
    });

    it('should handle year boundaries', () => {
      const { start, end } = getDateSearchWindow('2024-01-01', 3);
      expect(start.toISOString().split('T')[0]).toBe('2023-12-29');
      expect(end.toISOString().split('T')[0]).toBe('2024-01-04');
    });
  });

  describe('formatDateForDisplay', () => {
    it('should format date as YYYY-MM-DD', () => {
      expect(formatDateForDisplay('2024-01-15')).toBe('2024-01-15');
    });

    it('should handle Date object', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      expect(formatDateForDisplay(date)).toBe('2024-01-15');
    });
  });

  describe('DATE_SCORE_THRESHOLDS export', () => {
    it('should have expected score values', () => {
      expect(DATE_SCORE_THRESHOLDS.SAME_DAY.score).toBe(30);
      expect(DATE_SCORE_THRESHOLDS.ONE_DAY.score).toBe(25);
      expect(DATE_SCORE_THRESHOLDS.TWO_DAYS.score).toBe(20);
      expect(DATE_SCORE_THRESHOLDS.THREE_DAYS.score).toBe(15);
      expect(DATE_SCORE_THRESHOLDS.FAR.score).toBe(0);
    });

    it('should have expected maxDays values', () => {
      expect(DATE_SCORE_THRESHOLDS.SAME_DAY.maxDays).toBe(0);
      expect(DATE_SCORE_THRESHOLDS.ONE_DAY.maxDays).toBe(1);
      expect(DATE_SCORE_THRESHOLDS.TWO_DAYS.maxDays).toBe(2);
      expect(DATE_SCORE_THRESHOLDS.THREE_DAYS.maxDays).toBe(3);
    });
  });

  describe('real-world scenarios', () => {
    it('should handle credit card posting delays', () => {
      // Transaction on Friday evening, posts on Monday
      const transactionDate = '2024-01-12'; // Friday
      const postingDate = '2024-01-15'; // Monday
      const result = compareDates(transactionDate, postingDate);
      expect(result.isMatch).toBe(true);
      expect(result.score).toBe(15); // 3 days
    });

    it('should handle timezone edge cases', () => {
      // Transaction near midnight - test with dates clearly on different days
      const date1 = new Date(2024, 0, 15, 23, 30, 0); // Jan 15, 2024 11:30 PM local
      const date2 = new Date(2024, 0, 16, 0, 30, 0);  // Jan 16, 2024 12:30 AM local
      const result = compareDates(date1, date2);
      expect(result.daysDiff).toBe(1);
    });

    it('should handle foreign transaction processing', () => {
      // Foreign transaction might take 2-3 days to appear
      const purchaseDate = '2024-01-10';
      const statementDate = '2024-01-13';
      const result = compareDates(purchaseDate, statementDate);
      expect(result.isMatch).toBe(true);
    });

    it('should reject obviously wrong dates', () => {
      const result = compareDates('2024-01-01', '2024-01-15');
      expect(result.isMatch).toBe(false);
      expect(result.daysDiff).toBe(14);
    });

    it('should handle statement period queries', () => {
      const transactionDate = '2024-01-15';
      const statementStart = '2024-01-01';
      const statementEnd = '2024-01-31';
      expect(isDateInPeriod(transactionDate, statementStart, statementEnd)).toBe(true);
    });
  });
});
